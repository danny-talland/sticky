const supportedLanguages = ["en", "nl", "de", "fr", "it", "es", "pt", "uk"];
const colorOptions = ["yellow", "pink", "blue", "green", "peach", "lilac"];
const fontOptions = ["comic", "marker", "clean", "typewriter"];
const state = {
  lang: "en",
  translations: {},
  board: null,
  notes: [],
  drafts: {},
  userName: "",
  selectedNoteId: null,
  editingNoteId: null,
  qrModalOpen: false,
  headerExpanded: false,
  zoom: 1,
  viewportFocus: null,
  presentationMode: false,
  lastDraggedNoteId: null,
  lastDragEndedAt: 0,
  pendingEditorFocusNoteId: null,
  drag: null,
  saveTimers: new Map(),
};

const app = document.querySelector("#app");

function detectLanguage() {
  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  const shortCode = preferred.toLowerCase().split("-")[0];
  return supportedLanguages.includes(shortCode) ? shortCode : "en";
}

async function loadTranslations(lang) {
  const response = await fetch(`./languages/${lang}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load language ${lang}`);
  }
  return response.json();
}

function t(key, replacements = {}) {
  const dict = state.translations || {};
  const fallback = key;
  let value = dict[key] ?? fallback;

  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    value = value.replace(`{${placeholder}}`, String(replacement));
  });

  return value;
}

function randomUserName() {
  const number = Math.floor(Math.random() * 90) + 10;
  return `User${number}`;
}

async function api(action, options = {}) {
  const response = await fetch(`./api.php?action=${encodeURIComponent(action)}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function fetchBoardByCode(code) {
  const response = await fetch(`./api.php?action=board&code=${encodeURIComponent(code)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function setRoute(code) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set("board", code);
  } else {
    url.searchParams.delete("board");
  }
  window.history.replaceState({}, "", url);
}

function persistUserName(name) {
  state.userName = name.trim() || randomUserName();
  window.localStorage.setItem("sticky.userName", state.userName);
}

function loadUserName() {
  const stored = window.localStorage.getItem("sticky.userName");
  state.userName = stored?.trim() || randomUserName();
}

function boardCodeFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("board") || "").toUpperCase();
}

function saveNoteDebounced(note) {
  if (state.saveTimers.has(note.id)) {
    window.clearTimeout(state.saveTimers.get(note.id));
  }

  const timer = window.setTimeout(async () => {
    try {
      const payload = serializeNote(note);
      const data = await api("update_note", { method: "POST", body: payload });
      upsertNote(data.note);
    } catch (error) {
      showToast(error.message, true);
    }
  }, 250);

  state.saveTimers.set(note.id, timer);
}

function serializeNote(note) {
  return {
    id: note.id,
    author: note.author,
    content: note.content,
    color: note.color,
    fontFamily: note.fontFamily,
    fontSize: note.fontSize,
    isBold: note.isBold,
    isItalic: note.isItalic,
    isUnderline: note.isUnderline,
    x: note.x,
    y: note.y,
    zIndex: note.zIndex,
  };
}

function upsertNote(note) {
  const index = state.notes.findIndex((entry) => entry.id === note.id);
  if (index >= 0) {
    state.notes[index] = note;
  } else {
    state.notes.push(note);
  }

  state.notes.sort((a, b) => a.zIndex - b.zIndex || a.id - b.id);
}

function selectedNote() {
  return getRenderableNote(state.selectedNoteId);
}

function editingNote() {
  return getRenderableNote(state.editingNoteId);
}

function showToast(message, isError = false) {
  const existing = document.querySelector(".toast");
  existing?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function initTooltips() {
  if (!window.tippy) return;

  document.querySelectorAll("[data-tippy-root]").forEach((node) => node.remove());

  window.tippy("[data-tooltip]", {
    content(reference) {
      return reference.getAttribute("data-tooltip") || "";
    },
    theme: "sticky",
    animation: "shift-away-subtle",
    delay: [0, 0],
    duration: [0, 0],
    arrow: true,
  });
}

function showActionTooltip(target, message) {
  if (!window.tippy || !target) return;

  if (!target._stickyTooltipInstance) {
    target._stickyTooltipInstance = window.tippy(target, {
      trigger: "manual",
      theme: "sticky",
      placement: "left",
      animation: "shift-away-subtle",
      duration: [0, 0],
      content: message,
    });
  }

  target._stickyTooltipInstance.setContent(message);
  target._stickyTooltipInstance.show();
  window.clearTimeout(target._stickyTooltipTimeout);
  target._stickyTooltipTimeout = window.setTimeout(() => {
    target._stickyTooltipInstance?.hide();
  }, 1100);
}

function syncDraftFromActiveEditor() {
  const editor = document.activeElement?.closest?.('[data-role="note-editor"]');
  if (!editor) return;
  const noteId = Number(editor.dataset.id);
  const draft = ensureDraft(noteId);
  if (!draft) return;
  draft.content = sanitizeRichText(editor.innerHTML);
  draft.author = state.userName;
}

function buildBoardUrl() {
  if (!state.board) return window.location.href;
  const url = new URL(window.location.href);
  url.searchParams.set("board", state.board.code);
  return url.toString();
}

function buildQrCodeUrl() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(buildBoardUrl())}`;
}

function sanitizeRichText(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowedTags = new Set(["BR", "DIV", "P", "B", "STRONG", "I", "EM", "U"]);

  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      if (!allowedTags.has(child.tagName)) {
        const fragment = document.createDocumentFragment();
        while (child.firstChild) {
          fragment.appendChild(child.firstChild);
        }
        child.replaceWith(fragment);
        walk(node);
        return;
      }

      [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
      walk(child);
    });
  };

  walk(template.content);
  return template.innerHTML;
}

function getNoteById(noteId) {
  return state.notes.find((entry) => entry.id === noteId) || null;
}

function getRenderableNote(noteId) {
  return state.drafts[noteId] || getNoteById(noteId);
}

function createDraft(noteId) {
  const note = getNoteById(noteId);
  if (!note) return null;
  state.drafts[noteId] = {
    ...note,
    content: sanitizeRichText(note.content || ""),
  };
  return state.drafts[noteId];
}

function ensureDraft(noteId) {
  return state.drafts[noteId] || createDraft(noteId);
}

function clearDraft(noteId) {
  delete state.drafts[noteId];
}

function hasOpenDrafts() {
  return Object.keys(state.drafts).length > 0;
}

async function copyBoardLink() {
  try {
    await navigator.clipboard.writeText(buildBoardUrl());
    showToast(t("link_copied"));
  } catch (_error) {
    showToast(t("copy_failed"), true);
  }
}

async function saveNoteNow(noteId = state.selectedNoteId) {
  const note = state.drafts[noteId] || state.notes.find((entry) => entry.id === noteId);
  if (!note) {
    showToast(t("nothing_to_save"), true);
    return;
  }

  const data = await api("update_note", {
    method: "POST",
    body: {
      ...serializeNote(note),
      content: sanitizeRichText(note.content || ""),
    },
  });
  upsertNote(data.note);
  clearDraft(noteId);
  state.editingNoteId = null;
  showToast(t("saved"));
  render();
}

async function deleteNote(noteId) {
  const note = getNoteById(noteId);
  if (!note) return;

  const data = await api("delete_note", {
    method: "POST",
    body: { id: noteId },
  });

  state.notes = state.notes.filter((entry) => entry.id !== noteId);
  clearDraft(noteId);
  if (state.selectedNoteId === noteId) {
    state.selectedNoteId = state.notes[0]?.id ?? null;
  }
  if (state.editingNoteId === noteId) {
    state.editingNoteId = null;
  }

  if (data?.deleted) {
    showToast(t("note_deleted"));
  }

  render();
}

async function createBoard(formData) {
  const title = formData.get("title")?.toString().trim() || t("new_board");
  const name = formData.get("userName")?.toString().trim() || randomUserName();
  persistUserName(name);
  const data = await api("create_board", {
    method: "POST",
    body: { title },
  });
  setRoute(data.board.code);
  await openBoard(data.board.code);
}

async function joinBoard(formData) {
  const code = (formData.get("code")?.toString() || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const name = formData.get("userName")?.toString().trim() || randomUserName();
  persistUserName(name);
  const data = await api("join_board", {
    method: "POST",
    body: { code },
  });
  setRoute(data.board.code);
  await openBoard(data.board.code);
}

async function openBoard(code) {
  const boardData = await fetchBoardByCode(code);
  state.board = boardData.board;
  state.notes = boardData.notes || [];
  state.drafts = {};
  state.selectedNoteId = state.notes[0]?.id ?? null;
  state.editingNoteId = null;
  state.qrModalOpen = false;
  state.headerExpanded = false;
  state.zoom = 1;
  state.viewportFocus = null;
  state.presentationMode = false;
  render();
}

async function refreshBoard() {
  if (!state.board) return;
  const payload = await fetchBoardByCode(state.board.code);

  state.board = payload.board;
  state.notes = payload.notes || [];
  if (!state.notes.some((note) => note.id === state.selectedNoteId)) {
    state.selectedNoteId = state.notes[0]?.id ?? null;
  }
  if (!state.notes.some((note) => note.id === state.editingNoteId)) {
    state.editingNoteId = null;
  }
  render();

  if (state.presentationMode) {
    window.setTimeout(() => {
      fitNotesInView();
    }, 0);
  }
}

async function createNote() {
  if (!state.board) return;
  const boardSurface = document.querySelector(".board-surface");
  const width = boardSurface?.clientWidth || 1200;
  const height = boardSurface?.clientHeight || 700;
  const x = Math.max(24, Math.round((width * 0.5) - 120 + (Math.random() * 120 - 60)));
  const y = Math.max(24, Math.round((height * 0.4) - 120 + (Math.random() * 120 - 60)));
  const data = await api("create_note", {
    method: "POST",
    body: {
      code: state.board.code,
      author: state.userName,
      x,
      y,
    },
  });
  upsertNote(data.note);
  state.selectedNoteId = data.note.id;
  state.editingNoteId = data.note.id;
  render();
}

async function updateBoardTitle(title) {
  if (!state.board) return;
  const trimmed = title.trim() || t("new_board");
  const data = await api("update_board", {
    method: "POST",
    body: { code: state.board.code, title: trimmed },
  });
  state.board = data.board;
  render();
}

function updateSelectedNote(changes) {
  const note = ensureDraft(state.editingNoteId || state.selectedNoteId);
  if (!note) return;
  Object.assign(note, changes);
  note.author = state.userName;
  render();
}

function bringToFront(noteId) {
  const highest = state.notes.reduce((max, note) => Math.max(max, note.zIndex), 1);
  const note = state.editingNoteId === noteId ? ensureDraft(noteId) : state.notes.find((entry) => entry.id === noteId);
  if (!note) return;
  note.zIndex = highest + 1;
  state.selectedNoteId = noteId;
}

function openNoteEditor(noteId) {
  state.selectedNoteId = noteId;
  state.editingNoteId = noteId;
  ensureDraft(noteId);
  bringToFront(noteId);
  state.pendingEditorFocusNoteId = noteId;
  render();
}

function focusPendingEditor() {
  if (!state.pendingEditorFocusNoteId) return;
  const editor = document.querySelector(`.note-editor[data-id="${state.pendingEditorFocusNoteId}"]`);
  if (!editor) return;

  state.pendingEditorFocusNoteId = null;
  editor.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function isPointerOverTrashZone(pointerEvent) {
  const trashZone = document.querySelector(".trash-zone");
  if (!trashZone) return false;
  const rect = trashZone.getBoundingClientRect();

  return (
    pointerEvent.clientX >= rect.left &&
    pointerEvent.clientX <= rect.right &&
    pointerEvent.clientY >= rect.top &&
    pointerEvent.clientY <= rect.bottom
  );
}

function renderHome() {
  app.innerHTML = `
    <main class="home-shell">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">${t("app_name")}</p>
          <h1>${t("home_title")}</h1>
          <p class="intro">${t("home_intro")}</p>
          <div class="hero-badges">
            <span>${t("badge_collaborative")}</span>
            <span>${t("badge_realtime_style")}</span>
            <span>${t("badge_multilingual")}</span>
          </div>
        </div>
        <div class="forms-grid">
          <form class="panel" data-form="new-board">
            <h2>${t("start_new_board")}</h2>
            <label>
              <span>${t("board_title")}</span>
              <input name="title" maxlength="120" value="${t("new_board")}" />
            </label>
            <label>
              <span>${t("your_name")}</span>
              <input name="userName" maxlength="60" value="${escapeHtml(state.userName)}" />
            </label>
            <button type="submit">${t("create_board")}</button>
          </form>
          <form class="panel" data-form="join-board">
            <h2>${t("use_existing_board")}</h2>
            <label>
              <span>${t("board_code")}</span>
              <input name="code" maxlength="6" placeholder="${t("board_code_placeholder")}" />
            </label>
            <label>
              <span>${t("your_name")}</span>
              <input name="userName" maxlength="60" value="${escapeHtml(state.userName)}" />
            </label>
            <button type="submit">${t("join_board")}</button>
          </form>
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-form="new-board"]').addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await createBoard(new FormData(event.currentTarget));
    } catch (error) {
      showToast(error.message, true);
    }
  });

  app.querySelector('[data-form="join-board"]').addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await joinBoard(new FormData(event.currentTarget));
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

function colorLabel(color) {
  return t(`color_${color}`);
}

function fontLabel(font) {
  return t(`font_${font}`);
}

function getCanvasMetrics() {
  const noteWidth = 240;
  const noteHeight = 240;
  const margin = 340;
  const minWidth = Math.max(window.innerWidth, 1400);
  const minHeight = Math.max(window.innerHeight, 900);

  if (state.notes.length === 0) {
    return {
      width: minWidth,
      height: minHeight,
      bounds: { minX: 0, minY: 0, maxX: minWidth, maxY: minHeight },
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  state.notes.forEach((note) => {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + noteWidth);
    maxY = Math.max(maxY, note.y + noteHeight);
  });

  return {
    width: Math.max(minWidth, maxX + margin),
    height: Math.max(minHeight, maxY + margin),
    bounds: { minX, minY, maxX, maxY },
  };
}

function zoomIn() {
  state.zoom = Math.min(2.5, Number((state.zoom + 0.1).toFixed(2)));
  render();
}

function zoomOut() {
  state.zoom = Math.max(0.5, Number((state.zoom - 0.1).toFixed(2)));
  render();
}

function fitNotesInView() {
  const viewport = document.querySelector(".board-viewport");
  const metrics = getCanvasMetrics();

  if (!viewport || state.notes.length === 0) {
    state.zoom = 1;
    render();
    return;
  }

  const fitPadding = state.presentationMode ? 180 : 140;
  const viewportWidth = viewport.clientWidth - 64;
  const viewportHeight = viewport.clientHeight - 64;
  const notesWidth = Math.max(280, metrics.bounds.maxX - metrics.bounds.minX + fitPadding * 2);
  const notesHeight = Math.max(280, metrics.bounds.maxY - metrics.bounds.minY + fitPadding * 2);
  const nextZoom = Math.max(0.45, Math.min(1.6, Math.min(viewportWidth / notesWidth, viewportHeight / notesHeight)));
  state.zoom = Number(nextZoom.toFixed(2));
  state.viewportFocus = {
    left: Math.max(0, (metrics.bounds.minX - fitPadding) * state.zoom),
    top: Math.max(0, (metrics.bounds.minY - fitPadding) * state.zoom),
  };
  render();
}

function animateFitNotesInView() {
  const viewport = document.querySelector(".board-viewport");
  const metrics = getCanvasMetrics();

  if (!viewport || state.notes.length === 0) {
    state.zoom = 1;
    render();
    return;
  }

  const fitPadding = state.presentationMode ? 180 : 140;
  const viewportWidth = viewport.clientWidth - 64;
  const viewportHeight = viewport.clientHeight - 64;
  const notesWidth = Math.max(280, metrics.bounds.maxX - metrics.bounds.minX + fitPadding * 2);
  const notesHeight = Math.max(280, metrics.bounds.maxY - metrics.bounds.minY + fitPadding * 2);
  const targetZoom = Math.max(0.45, Math.min(1.6, Math.min(viewportWidth / notesWidth, viewportHeight / notesHeight)));
  const targetLeft = Math.max(0, (metrics.bounds.minX - fitPadding) * targetZoom);
  const targetTop = Math.max(0, (metrics.bounds.minY - fitPadding) * targetZoom);

  state.zoom = Number(targetZoom.toFixed(2));
  state.viewportFocus = { left: targetLeft, top: targetTop };
  render();
}

function showPresentationHint() {
  document.querySelector(".presentation-tip")?.remove();
  const tip = document.createElement("div");
  tip.className = "presentation-tip";
  tip.textContent = t("presentation_exit_hint");
  document.body.appendChild(tip);
  window.requestAnimationFrame(() => tip.classList.add("is-visible"));
  window.setTimeout(() => {
    tip.classList.remove("is-visible");
    window.setTimeout(() => tip.remove(), 350);
  }, 2200);
}

function enterPresentationMode() {
  state.presentationMode = true;
  state.qrModalOpen = false;
  state.headerExpanded = false;
  state.editingNoteId = null;
  render();
  animateFitNotesInView();
  showPresentationHint();
}

function exitPresentationMode() {
  if (!state.presentationMode) return;
  state.presentationMode = false;
  render();
}

function applyViewportFocus() {
  if (!state.viewportFocus) return;
  const viewport = document.querySelector(".board-viewport");
  if (!viewport) return;
  const focus = state.viewportFocus;
  window.requestAnimationFrame(() => {
    viewport.scrollLeft = focus.left;
    viewport.scrollTop = focus.top;
    state.viewportFocus = null;
  });
}

function syncEditorPanel() {
  const panel = document.querySelector(".note-editor-panel");
  if (!panel) return;

  const note = editingNote();
  panel.classList.toggle("is-hidden", !note);
  if (!note) return;

  panel.querySelectorAll("[data-action='color']").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === note.color);
  });

  const fontSelect = panel.querySelector('[data-role="font-family"]');
  const fontSize = panel.querySelector('[data-role="font-size"]');
  const boldButton = panel.querySelector('[data-action="toggle-bold"]');
  const italicButton = panel.querySelector('[data-action="toggle-italic"]');
  const underlineButton = panel.querySelector('[data-action="toggle-underline"]');

  if (fontSelect) fontSelect.value = note.fontFamily;
  if (fontSize) fontSize.value = String(note.fontSize);
  if (boldButton) boldButton.classList.toggle("active", note.isBold);
  if (italicButton) italicButton.classList.toggle("active", note.isItalic);
  if (underlineButton) underlineButton.classList.toggle("active", note.isUnderline);
}

function renderBoard() {
  const note = editingNote();
  const metrics = getCanvasMetrics();
  const boardLabel = `${state.board.title} - ${state.userName}`;
  app.innerHTML = `
    <div class="board-layout ${state.presentationMode ? "presentation-mode" : ""}">
      <main class="board-main">
        <div class="board-surface">
          <div class="board-viewport">
            <div class="board-canvas" style="width:${Math.round(metrics.width * state.zoom)}px; height:${Math.round(metrics.height * state.zoom)}px;">
              <div class="board-canvas-content" style="width:${metrics.width}px; height:${metrics.height}px; transform:scale(${state.zoom});">
                ${state.notes.map(renderNoteCard).join("")}
                ${state.notes.length === 0 ? `<div class="empty-state">${t("empty_board")}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      </main>
      <header class="floating-bar">
        <div class="board-title-shell">
          <button
            class="brand-block board-title-pill"
            data-action="toggle-header"
            type="button"
            aria-expanded="${state.headerExpanded ? "true" : "false"}"
            data-tooltip="${t("edit_board_meta")}"
          >
            <span class="board-title-pill-text">${escapeHtml(boardLabel)}</span>
          </button>
          ${state.headerExpanded ? `
            <div class="brand-block board-title-editor">
              <label>
                <span>${t("board_title")}</span>
                <input class="board-title-input" data-role="board-title" maxlength="120" value="${escapeHtml(state.board.title)}" />
              </label>
              <label>
                <span>${t("your_name")}</span>
                <input data-role="user-name" maxlength="60" value="${escapeHtml(state.userName)}" />
              </label>
            </div>
          ` : ""}
        </div>
        <div class="floating-tools">
          <button class="icon-button" data-action="home" type="button" data-tooltip="${t("back_home")}" aria-label="${t("back_home")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="toggle-qr" type="button" data-tooltip="${t("open_qr")}" aria-label="${t("open_qr")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3zM5 5v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm10-2h2v2h-2zm2 2h2v2h-2zm-4 0h2v6h-2zm6 2h2v4h-4v-2h2zm-4 0h2v2h-2z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="zoom-out" type="button" data-tooltip="${t("zoom_out")}" aria-label="${t("zoom_out")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.87 10.58l4.27 4.27 1.41-1.41-4.27-4.27A6 6 0 0 0 10 4Zm-3 6h6v2H7z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="zoom-in" type="button" data-tooltip="${t("zoom_in")}" aria-label="${t("zoom_in")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.87 10.58l4.27 4.27 1.41-1.41-4.27-4.27A6 6 0 0 0 10 4Zm-1 3h2v2h2v2h-2v2H9v-2H7V9h2z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="fit-notes" type="button" data-tooltip="${t("fit_notes")}" aria-label="${t("fit_notes")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3zm10-5h5v5h-2V6h-3zM6 15v3h3v2H4v-5zm11 0h2v5h-5v-2h3z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="presentation-mode" type="button" data-tooltip="${t("presentation_mode")}" aria-label="${t("presentation_mode")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H4zm2 2v6h12V7zm4 10h4v2h-4z" fill="currentColor"/></svg>
          </button>
        </div>
      </header>
      <button class="add-note-fab" data-action="add-note" type="button" data-tooltip="${t("add_note")}" aria-label="${t("add_note")}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/></svg>
      </button>
      ${state.qrModalOpen ? `
        <div class="share-overlay">
          <div class="brand-block share-panel">
            <div class="share-panel-header">
              <strong>${t("share_code")}: ${state.board.code}</strong>
              <button class="link-button" data-action="close-qr" type="button">${t("close")}</button>
            </div>
            <img class="qr-image" src="${buildQrCodeUrl()}" alt="${t("qr_title")}" />
            <input readonly value="${escapeHtml(buildBoardUrl())}" />
            <button data-action="copy-link" type="button">${t("copy_link")}</button>
          </div>
        </div>
      ` : ""}
      <button class="trash-zone" type="button" data-tooltip="${t("trash_note")}" aria-label="${t("trash_note")}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 9h2v8H7zm1 11a2 2 0 0 1-2-2V8h12v10a2 2 0 0 1-2 2z" fill="currentColor"/></svg>
      </button>
      <aside class="note-editor-panel ${note ? "" : "is-hidden"}">
        <div class="panel-section">
          <h3>${t("note_style")}</h3>
          <p class="panel-caption">${note ? t("editing_note") : t("edit_note_to_style")}</p>
          <div class="toolbar-row color-swatches">
            ${colorOptions.map((color) => `
              <button
                class="swatch ${note?.color === color ? "active" : ""}"
                data-action="color"
                data-value="${color}"
                title="${colorLabel(color)}"
                type="button"
              ></button>
            `).join("")}
          </div>
          <label>
            <span>${t("font")}</span>
            <select data-role="font-family">
              ${fontOptions.map((font) => `
                <option value="${font}" ${note?.fontFamily === font ? "selected" : ""}>${fontLabel(font)}</option>
              `).join("")}
            </select>
          </label>
          <label>
            <span>${t("font_size")}</span>
            <input type="range" min="14" max="42" value="${note?.fontSize ?? 22}" data-role="font-size" />
          </label>
          <div class="toolbar-row">
            <button class="${note?.isBold ? "active" : ""}" data-action="toggle-bold" type="button">B</button>
            <button class="${note?.isItalic ? "active" : ""}" data-action="toggle-italic" type="button"><em>I</em></button>
            <button class="${note?.isUnderline ? "active" : ""}" data-action="toggle-underline" type="button"><u>U</u></button>
          </div>
        </div>
        <div class="panel-section compact-panel">
          <h3>${t("tips_title")}</h3>
          <p>${t("tips_body")}</p>
        </div>
      </aside>
    </div>
  `;

  applyViewportFocus();
  window.requestAnimationFrame(() => {
    focusPendingEditor();
  });

  app.querySelector('[data-action="home"]').addEventListener("click", () => {
    state.board = null;
    state.notes = [];
    state.selectedNoteId = null;
    state.editingNoteId = null;
    state.qrModalOpen = false;
    state.headerExpanded = false;
    setRoute("");
    render();
  });

  app.querySelector('[data-action="toggle-header"]').addEventListener("click", () => {
    state.headerExpanded = !state.headerExpanded;
    render();
  });

  const boardTitleField = app.querySelector('[data-role="board-title"]');
  if (boardTitleField) {
    boardTitleField.addEventListener("change", async (event) => {
      try {
        await updateBoardTitle(event.currentTarget.value);
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  const userNameField = app.querySelector('[data-role="user-name"]');
  if (userNameField) {
    userNameField.addEventListener("change", (event) => {
      persistUserName(event.currentTarget.value);
      render();
    });
  }

  app.querySelector('[data-action="add-note"]').addEventListener("click", async () => {
    try {
      await createNote();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  app.querySelector('[data-action="toggle-qr"]').addEventListener("click", () => {
    state.qrModalOpen = !state.qrModalOpen;
    render();
  });

  app.querySelector('[data-action="zoom-in"]').addEventListener("click", (event) => {
    zoomIn();
    showActionTooltip(event.currentTarget, `${Math.round(state.zoom * 100)}%`);
  });
  app.querySelector('[data-action="zoom-out"]').addEventListener("click", (event) => {
    zoomOut();
    showActionTooltip(event.currentTarget, `${Math.round(state.zoom * 100)}%`);
  });
  app.querySelector('[data-action="fit-notes"]').addEventListener("click", (event) => {
    fitNotesInView();
    window.setTimeout(() => {
      showActionTooltip(event.currentTarget, `${t("fit_notes")}: ${Math.round(state.zoom * 100)}%`);
    }, 0);
  });
  app.querySelector('[data-action="presentation-mode"]').addEventListener("click", () => {
    enterPresentationMode();
  });

  app.querySelectorAll("[data-action='color']").forEach((button) => {
    button.classList.add(`swatch-${button.dataset.value}`);
    button.addEventListener("click", () => {
      if (!editingNote()) return;
      updateSelectedNote({ color: button.dataset.value });
      syncEditorPanel();
    });
  });

  app.querySelector('.note-editor-panel [data-role="font-family"]').addEventListener("change", (event) => {
    if (!editingNote()) return;
    updateSelectedNote({ fontFamily: event.currentTarget.value });
    syncEditorPanel();
  });

  app.querySelector('.note-editor-panel [data-role="font-size"]').addEventListener("input", (event) => {
    if (!editingNote()) return;
    updateSelectedNote({ fontSize: Number(event.currentTarget.value) });
    syncEditorPanel();
  });

  app.querySelector('.note-editor-panel [data-action="toggle-bold"]').addEventListener("click", () => {
    const activeNote = editingNote();
    if (!activeNote) return;
    if (document.activeElement?.closest?.('[data-role="note-editor"]')) {
      document.execCommand("bold");
      syncDraftFromActiveEditor();
      return;
    }
    updateSelectedNote({ isBold: !activeNote.isBold });
    syncEditorPanel();
  });

  app.querySelector('.note-editor-panel [data-action="toggle-italic"]').addEventListener("click", () => {
    const activeNote = editingNote();
    if (!activeNote) return;
    if (document.activeElement?.closest?.('[data-role="note-editor"]')) {
      document.execCommand("italic");
      syncDraftFromActiveEditor();
      return;
    }
    updateSelectedNote({ isItalic: !activeNote.isItalic });
    syncEditorPanel();
  });

  app.querySelector('.note-editor-panel [data-action="toggle-underline"]').addEventListener("click", () => {
    const activeNote = editingNote();
    if (!activeNote) return;
    if (document.activeElement?.closest?.('[data-role="note-editor"]')) {
      document.execCommand("underline");
      syncDraftFromActiveEditor();
      return;
    }
    updateSelectedNote({ isUnderline: !activeNote.isUnderline });
    syncEditorPanel();
  });

  app.querySelector(".board-surface").addEventListener("click", (event) => {
    if (event.target.closest(".sticky-note")) return;
    if (state.editingNoteId) return;
    state.editingNoteId = null;
    state.selectedNoteId = null;
    syncEditorPanel();
    render();
  });

  const shareOverlay = app.querySelector('.share-overlay');
  if (shareOverlay) {
    shareOverlay.addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.qrModalOpen = false;
      render();
    });
  }

  app.querySelectorAll('button[data-action="close-qr"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.qrModalOpen = false;
      render();
    });
  });

  app.querySelectorAll('[data-action="copy-link"]').forEach((button) => {
    button.addEventListener("click", () => {
      copyBoardLink().catch(() => {});
    });
  });

  app.querySelectorAll(".sticky-note").forEach((element) => {
    const noteId = Number(element.dataset.id);
    const editor = element.querySelector('[data-role="note-editor"]');
    const inlineSave = element.querySelector('[data-action="save-note-inline"]');

    element.addEventListener("pointerdown", (event) => {
      if (state.presentationMode) return;
      if (event.target.closest('[data-role="note-editor"]') || event.target.closest('[data-action="save-note-inline"]')) return;
      const activeNote = getRenderableNote(noteId);
      if (!activeNote) return;
      state.selectedNoteId = noteId;
      state.editingNoteId = null;
      bringToFront(noteId);
      state.drag = {
        noteId,
        startX: event.clientX,
        startY: event.clientY,
        originX: activeNote.x,
        originY: activeNote.y,
        moved: false,
      };
      element.setPointerCapture(event.pointerId);
    });

    element.addEventListener("pointermove", (event) => {
      if (!state.drag || state.drag.noteId !== noteId) return;
      const deltaX = (event.clientX - state.drag.startX) / state.zoom;
      const deltaY = (event.clientY - state.drag.startY) / state.zoom;
       if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        state.drag.moved = true;
      }
      const movingNote = state.editingNoteId === noteId ? ensureDraft(noteId) : getNoteById(noteId);
      if (!movingNote) return;
      movingNote.x = Math.max(0, Math.round(state.drag.originX + deltaX));
      movingNote.y = Math.max(0, Math.round(state.drag.originY + deltaY));
      element.style.left = `${movingNote.x}px`;
      element.style.top = `${movingNote.y}px`;
    });

    element.addEventListener("pointerup", (event) => {
      if (!state.drag || state.drag.noteId !== noteId) return;
      const moved = state.drag.moved;
      const movingNote = state.editingNoteId === noteId ? ensureDraft(noteId) : getNoteById(noteId);
      state.drag = null;
      if (moved) {
        state.lastDraggedNoteId = noteId;
        state.lastDragEndedAt = Date.now();
      }
      if (moved && isPointerOverTrashZone(event)) {
        deleteNote(noteId).catch((error) => showToast(error.message, true));
        return;
      }
      if (moved && movingNote && state.editingNoteId !== noteId) {
        saveNoteDebounced(movingNote);
        render();
        return;
      }
      if (!moved) {
        if (state.presentationMode) {
          render();
          return;
        }
        if (state.editingNoteId && state.editingNoteId !== noteId) {
          render();
          return;
        }
        openNoteEditor(noteId);
        return;
      }
      render();
    });

    if (editor) {
      editor.addEventListener("focus", () => {
        state.selectedNoteId = noteId;
        state.editingNoteId = noteId;
        ensureDraft(noteId);
        bringToFront(noteId);
        syncEditorPanel();
      });

      editor.addEventListener("input", (event) => {
        const draft = ensureDraft(noteId);
        if (!draft) return;
        draft.content = sanitizeRichText(event.currentTarget.innerHTML);
        draft.author = state.userName;
      });

      editor.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          saveNoteNow(noteId).catch((error) => showToast(error.message, true));
        }
      });
    }

    if (inlineSave) {
      inlineSave.addEventListener("click", () => {
        saveNoteNow(noteId).catch((error) => showToast(error.message, true));
      });
    }
  });

  initTooltips();
}

function renderNoteCard(note) {
  const renderable = getRenderableNote(note.id) || note;
  const isEditing = state.editingNoteId === note.id;
  const classes = [
    "sticky-note",
    `color-${renderable.color}`,
    `font-${renderable.fontFamily}`,
    renderable.isBold ? "is-bold" : "",
    renderable.isItalic ? "is-italic" : "",
    renderable.isUnderline ? "is-underline" : "",
    state.selectedNoteId === note.id ? "selected" : "",
    isEditing ? "is-editing" : "",
  ].filter(Boolean).join(" ");

  return `
    <article
      class="${classes}"
      data-id="${note.id}"
      style="left:${renderable.x}px; top:${renderable.y}px; z-index:${renderable.zIndex}; --font-size:${renderable.fontSize}px;"
    >
      <header>
        <span>${escapeHtml(renderable.author || state.userName)}</span>
        ${isEditing ? `
          <button
            class="note-save-button"
            data-action="save-note-inline"
            data-id="${note.id}"
            type="button"
            data-tooltip="${t("save_note")}"
            aria-label="${t("save_note")}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v15H5zm2 2v4h8V5zm0 14h10v-8H7zm2-2v-4h6v4z" fill="currentColor"/></svg>
          </button>
        ` : ""}
      </header>
      ${isEditing ? `
        <div class="note-editor" contenteditable="true" spellcheck="true" data-role="note-editor" data-id="${note.id}">${sanitizeRichText(renderable.content || "")}</div>
      ` : `
        <div class="note-display">${sanitizeRichText(renderable.content || "").trim() || `<span class="note-placeholder">${escapeHtml(t("note_placeholder"))}</span>`}</div>
      `}
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  if (state.board) {
    renderBoard();
  } else {
    renderHome();
  }
}

function isEditingField() {
  const active = document.activeElement;
  return Boolean(active?.matches("textarea, input, select, [contenteditable='true']"));
}

async function bootstrap() {
  state.lang = detectLanguage();
  try {
    state.translations = await loadTranslations(state.lang);
  } catch (_error) {
    state.lang = "en";
    state.translations = await loadTranslations("en");
  }
  document.documentElement.lang = state.lang;

  loadUserName();
  render();

  const code = boardCodeFromUrl();
  if (code) {
    try {
      await openBoard(code);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  window.setInterval(() => {
    if (state.board && !state.drag && !isEditingField() && !hasOpenDrafts()) {
      refreshBoard().catch(() => {});
    }
  }, 6000);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      exitPresentationMode();
    }
  });

  initTooltips();
}

bootstrap().catch((error) => {
  app.innerHTML = `<main class="fatal-error">${escapeHtml(error.message)}</main>`;
});
