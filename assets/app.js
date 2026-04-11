const supportedLanguages = ["en", "nl", "de", "fr", "it", "es", "pt", "uk", "ar", "pl", "tr", "ru", "zh-cn", "zh-tw", "ja", "ko", "hi", "id", "cs", "ro", "hu", "el", "sv", "da", "no", "fi", "he", "vi", "th", "ms", "bn", "ta", "te"];
const languageOptions = [
  { id: "en", code: "EN", flag: "🇬🇧" },
  { id: "nl", code: "NL", flag: "🇳🇱" },
  { id: "de", code: "DE", flag: "🇩🇪" },
  { id: "fr", code: "FR", flag: "🇫🇷" },
  { id: "it", code: "IT", flag: "🇮🇹" },
  { id: "es", code: "ES", flag: "🇪🇸" },
  { id: "pt", code: "PT", flag: "🇵🇹" },
  { id: "uk", code: "UK", flag: "🇺🇦" },
  { id: "ar", code: "AR", flag: "🇸🇦" },
  { id: "pl", code: "PL", flag: "🇵🇱" },
  { id: "tr", code: "TR", flag: "🇹🇷" },
  { id: "ru", code: "RU", flag: "🇷🇺" },
  { id: "zh-cn", code: "ZH", flag: "🇨🇳" },
  { id: "zh-tw", code: "ZT", flag: "🇹🇼" },
  { id: "ja", code: "JA", flag: "🇯🇵" },
  { id: "ko", code: "KO", flag: "🇰🇷" },
  { id: "hi", code: "HI", flag: "🇮🇳" },
  { id: "id", code: "ID", flag: "🇮🇩" },
  { id: "cs", code: "CS", flag: "🇨🇿" },
  { id: "ro", code: "RO", flag: "🇷🇴" },
  { id: "hu", code: "HU", flag: "🇭🇺" },
  { id: "el", code: "EL", flag: "🇬🇷" },
  { id: "sv", code: "SV", flag: "🇸🇪" },
  { id: "da", code: "DA", flag: "🇩🇰" },
  { id: "no", code: "NO", flag: "🇳🇴" },
  { id: "fi", code: "FI", flag: "🇫🇮" },
  { id: "he", code: "HE", flag: "🇮🇱" },
  { id: "vi", code: "VI", flag: "🇻🇳" },
  { id: "th", code: "TH", flag: "🇹🇭" },
  { id: "ms", code: "MS", flag: "🇲🇾" },
  { id: "bn", code: "BN", flag: "🇧🇩" },
  { id: "ta", code: "TA", flag: "🇮🇳" },
  { id: "te", code: "TE", flag: "🇮🇳" },
];
const languageAliases = {
  zh: "zh-cn",
  "zh-cn": "zh-cn",
  "zh-sg": "zh-cn",
  "zh-hans": "zh-cn",
  "zh-tw": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-mo": "zh-tw",
  "zh-hant": "zh-tw",
  nb: "no",
  nn: "no",
  iw: "he",
};
const colorOptions = ["yellow", "pink", "blue", "green", "peach", "lilac"];
const fontOptions = ["comic", "marker", "clean", "typewriter"];
const NOTE_SIZE = 240;
const LABEL_MAX_WIDTH = 260;
const LABEL_HEIGHT = 84;
const DEFAULT_LABEL_FONT_SIZE = 26;
const MIN_LABEL_FONT_SIZE = 22;
const MAX_LABEL_FONT_SIZE = 42;
const LABEL_FONT_SIZE_STEP = 4;
const MIN_NOTE_FONT_SIZE = 14;
const MAX_NOTE_FONT_SIZE = 42;
const NOTE_FONT_SIZE_PRESETS = [14, 18, 22, 26, 34, 42];
const DEFAULT_BOARD_COLUMNS = 10;
const DEFAULT_BOARD_ROWS = 5;
const MIN_BOARD_COLUMNS = 10;
const MIN_BOARD_ROWS = 5;
const HOME_AMBIENT_NOTE_SIZE = 116;
const HOME_AMBIENT_MAX_NOTES = 5;
const HOME_AMBIENT_SPAWN_MS = 1700;
const HOME_AMBIENT_FADE_MS = 420;
const HOME_AMBIENT_EDGE_PADDING = 18;
const HOME_AMBIENT_HERO_GAP = 28;
const HOME_AMBIENT_NOTE_GAP = 16;
const state = {
  view: "home",
  lang: "en",
  translations: {},
  fallbackTranslations: {},
  clientId: "",
  adminToken: null,
  board: null,
  notes: [],
  labels: [],
  members: [],
  drafts: {},
  settingsDraft: null,
  userName: "",
  selectedNoteId: null,
  selectedLabelId: null,
  editingNoteId: null,
  qrModalOpen: false,
  usersPanelOpen: false,
  headerExpanded: false,
  zoom: 1,
  viewportFocus: null,
  presentationMode: false,
  lastDraggedNoteId: null,
  lastDragEndedAt: 0,
  pendingEditorFocusNoteId: null,
  modal: null,
  homeJoinCode: "",
  homeJoinUserName: "",
  homeJoinBoardAccess: null,
  homeJoinLookupVersion: 0,
  homeJoinLookupTimer: null,
  homeAmbientTimer: null,
  homeAmbientTimeouts: new Set(),
  homeAmbientNotes: [],
  homeAmbientReplacing: false,
  nextHomeAmbientNoteId: 1,
  boardPan: null,
  lastBoardPanEndedAt: 0,
  viewportFocusDelayMs: 0,
  viewportFocusBehavior: "instant",
  viewportFocusSource: null,
  settlingNoteId: null,
  settlingNoteTimer: null,
  savedEditorSelection: null,
  editorInlineFontSizePreview: null,
  mobileEditorToolsOpen: false,
  presentationLayoutSnapshot: null,
  presentationLayoutCleanupTimer: null,
  presentationMovedNoteIds: [],
  presentationEnteringNoteIds: [],
  presentationBoardVisualSource: null,
  zoomIndicatorTimer: null,
  viewportAnimationFrame: null,
  drag: null,
  saveTimers: new Map(),
  pendingLabelSaveIds: new Set(),
  nextLocalNoteId: -1,
};

const app = document.querySelector("#app");

function normalizeLanguageCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (supportedLanguages.includes(normalized)) {
    return normalized;
  }
  if (languageAliases[normalized]) {
    return languageAliases[normalized];
  }

  const shortCode = normalized.split("-")[0];
  if (supportedLanguages.includes(shortCode)) {
    return shortCode;
  }
  if (languageAliases[shortCode]) {
    return languageAliases[shortCode];
  }

  return "";
}

function selectedLanguageOption(lang = state.lang) {
  return languageOptions.find((option) => option.id === lang) || languageOptions[0];
}

function persistLanguage(lang) {
  window.localStorage.setItem("sticky.lang", lang);
}

function applyDocumentLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = ["ar", "he"].includes(lang) ? "rtl" : "ltr";
}

function detectLanguage() {
  const storedLanguage = normalizeLanguageCode(window.localStorage.getItem("sticky.lang"));
  if (storedLanguage) {
    return storedLanguage;
  }

  const preferredLanguages = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"])
    .filter(Boolean)
    .map((entry) => normalizeLanguageCode(entry))
    .filter(Boolean);

  for (const preferred of preferredLanguages) {
    return preferred;
  }

  return "en";
}

async function loadTranslations(lang) {
  const response = await fetch(`./languages/${lang}.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load language ${lang}`);
  }
  return response.json();
}

function t(key, replacements = {}) {
  const dict = state.translations || {};
  const fallbackDict = state.fallbackTranslations || {};
  const fallback = key;
  let value = dict[key] ?? fallbackDict[key] ?? fallback;

  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    value = value.replace(`{${placeholder}}`, String(replacement));
  });

  return value;
}

async function setLanguage(lang) {
  const nextLanguage = normalizeLanguageCode(lang) || "en";
  try {
    state.translations = await loadTranslations(nextLanguage);
    state.lang = nextLanguage;
  } catch (_error) {
    state.lang = "en";
    state.translations = await loadTranslations("en");
  }

  state.fallbackTranslations = state.lang === "en"
    ? state.translations
    : await loadTranslations("en").catch(() => ({}));

  persistLanguage(state.lang);
  applyDocumentLanguage(state.lang);
  render();
}

function defaultUserName() {
  return "User01";
}

function createClientId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `client-${Math.random().toString(36).slice(2, 12)}`;
}

function ensureClientId() {
  const stored = window.localStorage.getItem("sticky.clientId");
  state.clientId = stored || createClientId();
  window.localStorage.setItem("sticky.clientId", state.clientId);
}

function adminTokenStorageKey(boardCode) {
  return `sticky.adminToken.${boardCode}`;
}

function persistAdminToken(boardCode, token) {
  state.adminToken = token;
  if (!boardCode) return;
  if (token) {
    window.localStorage.setItem(adminTokenStorageKey(boardCode), token);
    window.localStorage.removeItem(`sticky.teacherToken.${boardCode}`);
  } else {
    window.localStorage.removeItem(adminTokenStorageKey(boardCode));
    window.localStorage.removeItem(`sticky.teacherToken.${boardCode}`);
  }
}

function loadAdminToken(boardCode) {
  if (!boardCode) {
    state.adminToken = null;
    return;
  }
  state.adminToken = window.localStorage.getItem(adminTokenStorageKey(boardCode))
    || window.localStorage.getItem(`sticky.teacherToken.${boardCode}`);
}

function adminTokenFromPayload(payload) {
  return payload?.adminToken || payload?.teacherToken || null;
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
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

async function fetchBoardByCode(code) {
  const params = new URLSearchParams({
    action: "board",
    code,
    clientId: state.clientId,
    userName: state.userName,
  });
  if (state.adminToken) {
    params.set("adminToken", state.adminToken);
  }

  const response = await fetch(`./api.php?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function fetchBoardAccess(code) {
  const params = new URLSearchParams({
    action: "board_access",
    code,
  });

  const response = await fetch(`./api.php?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.board;
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
  state.userName = name.trim() || defaultUserName();
  state.homeJoinUserName = state.userName;
  window.localStorage.setItem("sticky.userName", state.userName);
}

function loadUserName() {
  const stored = window.localStorage.getItem("sticky.userName");
  state.userName = stored?.trim() || defaultUserName();
  state.homeJoinUserName = state.userName;
}

function boardCodeFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("board") || "").toUpperCase();
}

function isManagementBoard(board = state.board) {
  return Boolean(board?.managementMode ?? board?.supervisedMode);
}

function boardHasAdminAccess(board = state.board) {
  return Boolean(board?.isAdmin ?? board?.isTeacher);
}

function memberHasAdminAccess(member) {
  return Boolean(member?.isAdmin ?? member?.isTeacher);
}

function isAdminLoginAvailable(access) {
  return Boolean(access?.adminLoginAvailable ?? access?.teacherLoginAvailable);
}

function isAdmin() {
  return Boolean(isManagementBoard(state.board) && state.adminToken && boardHasAdminAccess(state.board));
}

function canOpenAdminLoginOnBoard() {
  return Boolean(isManagementBoard(state.board) && !isAdmin());
}

function boardSettings() {
  return state.settingsDraft || state.board?.settings || {
    allowOnlyOwnMove: true,
    allowOnlyOwnDelete: true,
    allowOnlyOwnEdit: true,
    allowViewerCreateNotes: true,
    likesEnabled: true,
    maxNotesPerUser: 10,
    maxBoardColumns: DEFAULT_BOARD_COLUMNS,
    maxBoardRows: DEFAULT_BOARD_ROWS,
    lineColumns: 0,
    lineRows: 0,
    kickBlockMinutes: 15,
  };
}

function normalizedBoardColumns() {
  return Math.max(MIN_BOARD_COLUMNS, Number(boardSettings().maxBoardColumns) || DEFAULT_BOARD_COLUMNS);
}

function normalizedBoardRows() {
  return Math.max(MIN_BOARD_ROWS, Number(boardSettings().maxBoardRows) || DEFAULT_BOARD_ROWS);
}

function normalizedGuideCount(value) {
  const numericValue = Math.round(Number(value) || 0);
  if (numericValue <= 0) return 0;
  return Math.max(2, numericValue);
}

function displayGuideCountValue(value) {
  const numericValue = Math.round(Number(value) || 0);
  if (numericValue <= 0) return 0;
  return normalizedGuideCount(numericValue);
}

function normalizeGuideCountInput(input) {
  if (!input || input.value === "") return;
  const numericValue = Math.max(0, Math.round(Number(input.value) || 0));
  input.value = String(numericValue === 1 ? 2 : numericValue);
}

function normalizePinValue(value) {
  return (value || "").replace(/\D/g, "").slice(0, 4);
}

function maskedPinDigit(value) {
  return value ? "*" : "";
}

function renderPinInputGroup(role, value = "", inputName = "") {
  const digits = normalizePinValue(value).split("");
  const hiddenInput = inputName
    ? `<input type="hidden" name="${inputName}" value="${escapeHtml(normalizePinValue(value))}" data-pin-hidden="${role}" />`
    : "";

  return `
    <div class="pin-input-group" data-pin-group="${role}">
      <div class="pin-inputs" aria-label="${t("pin_code")}">
        ${Array.from({ length: 4 }, (_, index) => `
          <input
            class="pin-digit-input"
            data-pin-digit="${role}"
            data-pin-index="${index}"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="1"
            autocomplete="one-time-code"
            data-pin-value="${escapeHtml(digits[index] || "")}"
            value="${escapeHtml(maskedPinDigit(digits[index] || ""))}"
          />
        `).join("")}
      </div>
      ${hiddenInput}
    </div>
  `;
}

function renderJoinCodeInputGroup(role, value = "", inputName = "") {
  const digits = normalizeJoinCode(value).split("");
  const hiddenInput = inputName
    ? `<input type="hidden" name="${inputName}" value="${escapeHtml(normalizeJoinCode(value))}" data-code-hidden="${role}" />`
    : "";

  return `
    <div class="pin-input-group" data-code-group="${role}">
      <div class="pin-inputs code-inputs" aria-label="${t("board_code")}">
        ${Array.from({ length: 6 }, (_, index) => `
          <input
            class="pin-digit-input code-digit-input"
            data-code-digit="${role}"
            data-code-index="${index}"
            inputmode="text"
            autocapitalize="characters"
            maxlength="1"
            autocomplete="one-time-code"
            value="${escapeHtml(digits[index] || "")}"
          />
        `).join("")}
      </div>
      ${hiddenInput}
    </div>
  `;
}

function readPinFromGroup(role) {
  return Array.from(app.querySelectorAll(`[data-pin-digit="${role}"]`))
    .map((input) => normalizePinValue(input.dataset.pinValue || input.value).slice(0, 1))
    .join("");
}

function syncPinGroup(role) {
  const value = readPinFromGroup(role);
  const hiddenInput = app.querySelector(`[data-pin-hidden="${role}"]`);
  if (hiddenInput) {
    hiddenInput.value = value;
  }
  return value;
}

function readCodeFromGroup(role) {
  return Array.from(app.querySelectorAll(`[data-code-digit="${role}"]`))
    .map((input) => normalizeJoinCode(input.value).slice(0, 1))
    .join("");
}

function syncCodeGroup(role) {
  const value = readCodeFromGroup(role);
  const hiddenInput = app.querySelector(`[data-code-hidden="${role}"]`);
  if (hiddenInput) {
    hiddenInput.value = value;
  }
  return value;
}

function focusCodeDigit(role, index) {
  const nextInput = app.querySelector(`[data-code-digit="${role}"][data-code-index="${index}"]`);
  if (nextInput) {
    nextInput.focus();
    nextInput.select();
  }
}

function focusPinDigit(role, index) {
  const nextInput = app.querySelector(`[data-pin-digit="${role}"][data-pin-index="${index}"]`);
  if (nextInput) {
    nextInput.focus();
    nextInput.select();
  }
}

function bindPinInputGroups() {
  app.querySelectorAll("[data-pin-group]").forEach((group) => {
    const role = group.dataset.pinGroup;
    const inputs = Array.from(group.querySelectorAll(`[data-pin-digit="${role}"]`));
    if (!role || inputs.length === 0) return;

    inputs.forEach((input, index) => {
      const syncMaskedValue = (digit) => {
        input.dataset.pinValue = digit;
        input.value = maskedPinDigit(digit);
      };

      input.addEventListener("input", (event) => {
        const digits = normalizePinValue(event.target.value);
        const digit = digits.slice(-1);
        syncMaskedValue(digit);
        syncPinGroup(role);
        if (digit && index < inputs.length - 1) {
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && input.dataset.pinValue) {
          syncMaskedValue("");
          syncPinGroup(role);
          event.preventDefault();
          return;
        }

        if (event.key === "Backspace" && !input.dataset.pinValue && index > 0) {
          const previousInput = inputs[index - 1];
          previousInput.dataset.pinValue = "";
          previousInput.value = "";
          syncPinGroup(role);
          previousInput.focus();
          previousInput.select();
          event.preventDefault();
        }

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          inputs[index - 1].focus();
          inputs[index - 1].select();
        }

        if (event.key === "ArrowRight" && index < inputs.length - 1) {
          event.preventDefault();
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }
      });

      input.addEventListener("focus", () => {
        input.select();
      });

      input.addEventListener("paste", (event) => {
        event.preventDefault();
        const pastedDigits = normalizePinValue(event.clipboardData?.getData("text") || "");
        if (!pastedDigits) return;

        inputs.forEach((digitInput, digitIndex) => {
          const digit = pastedDigits[digitIndex] || "";
          digitInput.dataset.pinValue = digit;
          digitInput.value = maskedPinDigit(digit);
        });
        syncPinGroup(role);
        focusPinDigit(role, Math.min(pastedDigits.length, inputs.length) - 1);
      });
    });
  });
}

function bindCodeInputGroups() {
  app.querySelectorAll("[data-code-group]").forEach((group) => {
    const role = group.dataset.codeGroup;
    const inputs = Array.from(group.querySelectorAll(`[data-code-digit="${role}"]`));
    if (!role || inputs.length === 0) return;

    inputs.forEach((input, index) => {
      input.addEventListener("input", (event) => {
        const digit = normalizeJoinCode(event.target.value).slice(-1);
        input.value = digit;
        const value = syncCodeGroup(role);
        if (digit && index < inputs.length - 1) {
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }
        if (role === "home-join-code") {
          state.homeJoinCode = value;
          scheduleHomeJoinAccessLookup(value);
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          const previousInput = inputs[index - 1];
          previousInput.focus();
          previousInput.select();
        }

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          inputs[index - 1].focus();
          inputs[index - 1].select();
        }

        if (event.key === "ArrowRight" && index < inputs.length - 1) {
          event.preventDefault();
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }
      });

      input.addEventListener("focus", () => {
        input.select();
      });

      input.addEventListener("blur", () => {
        const value = syncCodeGroup(role);
        if (role === "home-join-code") {
          state.homeJoinCode = value;
          scheduleHomeJoinAccessLookup(value);
        }
      });

      input.addEventListener("paste", (event) => {
        event.preventDefault();
        const pasted = normalizeJoinCode(event.clipboardData?.getData("text") || "");
        if (!pasted) return;

        inputs.forEach((digitInput, digitIndex) => {
          digitInput.value = pasted[digitIndex] || "";
        });
        const value = syncCodeGroup(role);
        if (role === "home-join-code") {
          state.homeJoinCode = value;
          scheduleHomeJoinAccessLookup(value);
        }
        focusCodeDigit(role, Math.min(pasted.length, inputs.length) - 1);
      });
    });
  });
}

function normalizeJoinCode(value) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function clearHomeJoinLookupTimer() {
  if (state.homeJoinLookupTimer) {
    window.clearTimeout(state.homeJoinLookupTimer);
    state.homeJoinLookupTimer = null;
  }
}

function setHomeJoinBoardAccess(access) {
  state.homeJoinBoardAccess = access;

  const adminLoginButton = app.querySelector('[data-action="open-admin-login"]');
  if (!adminLoginButton) return;

  adminLoginButton.style.display = isAdminLoginAvailable(access) ? "inline-flex" : "none";
}

function scheduleHomeJoinAccessLookup(code) {
  clearHomeJoinLookupTimer();

  if (code.length !== 6) {
    state.homeJoinLookupVersion += 1;
    setHomeJoinBoardAccess(null);
    return;
  }

  state.homeJoinLookupTimer = window.setTimeout(async () => {
    const requestVersion = ++state.homeJoinLookupVersion;

    try {
      const board = await fetchBoardAccess(code);
      if (requestVersion !== state.homeJoinLookupVersion || state.homeJoinCode !== code) return;
      setHomeJoinBoardAccess(board);
    } catch (error) {
      if (requestVersion !== state.homeJoinLookupVersion || state.homeJoinCode !== code) return;
      setHomeJoinBoardAccess(null);
      if (error.status && error.status !== 404) {
        showToast(error.message, true);
      }
    }
  }, 180);
}

function clearHomeAmbientNotes() {
  if (state.homeAmbientTimer) {
    window.clearInterval(state.homeAmbientTimer);
    state.homeAmbientTimer = null;
  }
  state.homeAmbientTimeouts.forEach((timerId) => window.clearTimeout(timerId));
  state.homeAmbientTimeouts.clear();
  state.homeAmbientNotes = [];
  state.homeAmbientReplacing = false;
}

function scheduleHomeAmbientTimeout(callback, delay) {
  const timerId = window.setTimeout(() => {
    state.homeAmbientTimeouts.delete(timerId);
    callback();
  }, delay);
  state.homeAmbientTimeouts.add(timerId);
  return timerId;
}

function homeAmbientMessages() {
  return [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
  ];
}

function chooseHomeAmbientMessage() {
  const messages = homeAmbientMessages();
  return messages[Math.floor(Math.random() * messages.length)];
}

function shuffleList(items) {
  const values = [...items];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function rectsOverlap(first, second, gap = 0) {
  return !(
    first.x + first.width + gap <= second.x
    || second.x + second.width + gap <= first.x
    || first.y + first.height + gap <= second.y
    || second.y + second.height + gap <= first.y
  );
}

function getHomeAmbientZones(layerRect, heroRect) {
  if (!layerRect || !heroRect) return [];

  const hero = {
    left: heroRect.left - layerRect.left,
    top: heroRect.top - layerRect.top,
    right: heroRect.right - layerRect.left,
    bottom: heroRect.bottom - layerRect.top,
  };
  const maxWidth = layerRect.width - (HOME_AMBIENT_EDGE_PADDING * 2);
  const maxHeight = layerRect.height - (HOME_AMBIENT_EDGE_PADDING * 2);
  const zones = [
    {
      name: "left",
      x: HOME_AMBIENT_EDGE_PADDING,
      y: HOME_AMBIENT_EDGE_PADDING,
      width: hero.left - HOME_AMBIENT_EDGE_PADDING - HOME_AMBIENT_HERO_GAP,
      height: maxHeight,
    },
    {
      name: "right",
      x: hero.right + HOME_AMBIENT_HERO_GAP,
      y: HOME_AMBIENT_EDGE_PADDING,
      width: layerRect.width - hero.right - HOME_AMBIENT_EDGE_PADDING - HOME_AMBIENT_HERO_GAP,
      height: maxHeight,
    },
    {
      name: "top",
      x: HOME_AMBIENT_EDGE_PADDING,
      y: HOME_AMBIENT_EDGE_PADDING,
      width: maxWidth,
      height: hero.top - HOME_AMBIENT_EDGE_PADDING - HOME_AMBIENT_HERO_GAP,
    },
    {
      name: "bottom",
      x: HOME_AMBIENT_EDGE_PADDING,
      y: hero.bottom + HOME_AMBIENT_HERO_GAP,
      width: maxWidth,
      height: layerRect.height - hero.bottom - HOME_AMBIENT_EDGE_PADDING - HOME_AMBIENT_HERO_GAP,
    },
  ];

  return zones.filter((zone) => zone.width >= HOME_AMBIENT_NOTE_SIZE && zone.height >= HOME_AMBIENT_NOTE_SIZE);
}

function pickHomeAmbientPlacement() {
  const layer = app.querySelector('[data-role="home-ambient-notes"]');
  const hero = app.querySelector(".hero-card");
  if (!layer || !hero) return null;

  const layerRect = layer.getBoundingClientRect();
  const heroRect = hero.getBoundingClientRect();
  const zones = getHomeAmbientZones(layerRect, heroRect);
  if (!zones.length) return null;

  const noteCountsByZone = zones.reduce((counts, zone) => {
    counts[zone.name] = state.homeAmbientNotes.filter((note) => note.zone === zone.name).length;
    return counts;
  }, {});
  const existingRects = state.homeAmbientNotes.map((note) => note.rect).filter(Boolean);
  const minimumZoneCount = Math.min(...zones.map((zone) => noteCountsByZone[zone.name]));
  const orderedZones = [
    ...shuffleList(zones.filter((zone) => noteCountsByZone[zone.name] === minimumZoneCount)),
    ...shuffleList(zones.filter((zone) => noteCountsByZone[zone.name] !== minimumZoneCount)),
  ];

  for (const zone of orderedZones) {
    const availableX = Math.max(0, zone.width - HOME_AMBIENT_NOTE_SIZE);
    const availableY = Math.max(0, zone.height - HOME_AMBIENT_NOTE_SIZE);

    for (let attempt = 0; attempt < 36; attempt += 1) {
      const rect = {
        x: zone.x + (availableX ? Math.random() * availableX : 0),
        y: zone.y + (availableY ? Math.random() * availableY : 0),
        width: HOME_AMBIENT_NOTE_SIZE,
        height: HOME_AMBIENT_NOTE_SIZE,
      };
      const overlapsExisting = existingRects.some((existingRect) => rectsOverlap(rect, existingRect, HOME_AMBIENT_NOTE_GAP));
      if (!overlapsExisting) {
        return {
          zone: zone.name,
          rect,
        };
      }
    }
  }

  const fallbackZone = orderedZones[0];
  if (!fallbackZone) return null;

  return {
    zone: fallbackZone.name,
    rect: {
      x: fallbackZone.x,
      y: fallbackZone.y,
      width: HOME_AMBIENT_NOTE_SIZE,
      height: HOME_AMBIENT_NOTE_SIZE,
    },
  };
}

function createHomeAmbientNote() {
  if (state.view !== "home") return;
  const layer = app.querySelector('[data-role="home-ambient-notes"]');
  if (!layer) return;
  const placement = pickHomeAmbientPlacement();
  if (!placement) return;

  const noteId = state.nextHomeAmbientNoteId++;
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
  const font = fontOptions[Math.floor(Math.random() * fontOptions.length)];
  const tilt = Number(((Math.random() * 10) - 5).toFixed(2));
  const message = chooseHomeAmbientMessage();
  const element = document.createElement("article");
  element.className = `sticky-note home-floating-note color-${color} font-${font}`;
  element.dataset.homeNoteId = String(noteId);
  element.style.setProperty("--ambient-rotation", `${tilt}deg`);
  element.style.left = `${placement.rect.x}px`;
  element.style.top = `${placement.rect.y}px`;
  element.innerHTML = `
    <div class="note-display">${escapeHtml(message).replaceAll("\n", "<br>")}</div>
  `;
  layer.append(element);

  state.homeAmbientNotes.push({
    id: noteId,
    zone: placement.zone,
    rect: placement.rect,
    element,
  });

  element.getBoundingClientRect();
  scheduleHomeAmbientTimeout(() => {
    element.classList.add("is-visible");
  }, 36);
}

function cycleHomeAmbientNotes() {
  if (state.view !== "home" || state.homeAmbientReplacing) return;
  if (state.homeAmbientNotes.length < HOME_AMBIENT_MAX_NOTES) {
    createHomeAmbientNote();
    return;
  }

  const oldest = state.homeAmbientNotes[0];
  if (!oldest?.element) {
    state.homeAmbientNotes.shift();
    createHomeAmbientNote();
    return;
  }

  state.homeAmbientReplacing = true;
  oldest.element.classList.remove("is-visible");
  scheduleHomeAmbientTimeout(() => {
    oldest.element.remove();
    state.homeAmbientNotes = state.homeAmbientNotes.filter((note) => note.id !== oldest.id);
    state.homeAmbientReplacing = false;
    createHomeAmbientNote();
  }, HOME_AMBIENT_FADE_MS);
}

function initializeHomeAmbientNotes() {
  clearHomeAmbientNotes();
  if (state.view !== "home") return;
  if (!app.querySelector('[data-role="home-ambient-notes"]')) return;

  createHomeAmbientNote();
  scheduleHomeAmbientTimeout(() => {
    if (state.view === "home" && state.homeAmbientNotes.length < 2) {
      createHomeAmbientNote();
    }
  }, 380);
  state.homeAmbientTimer = window.setInterval(cycleHomeAmbientNotes, HOME_AMBIENT_SPAWN_MS);
}

function noteBelongsToCurrentUser(note) {
  return Boolean(note?.ownerClientId && note.ownerClientId === state.clientId);
}

function labelBelongsToCurrentUser(label) {
  return Boolean(label?.ownerClientId && label.ownerClientId === state.clientId);
}

function canCreateNotes() {
  if (!isManagementBoard(state.board)) return true;
  if (isAdmin()) return true;
  return boardSettings().allowViewerCreateNotes;
}

function canManageLabels() {
  if (!isManagementBoard(state.board)) return true;
  return isAdmin();
}

function likesEnabled() {
  return Boolean(boardSettings().likesEnabled);
}

function canMoveNote(note) {
  if (!isManagementBoard(state.board)) return true;
  if (isAdmin()) return true;
  if (!boardSettings().allowOnlyOwnMove) return true;
  return noteBelongsToCurrentUser(note);
}

function canEditNote(note) {
  if (!isManagementBoard(state.board)) return true;
  if (isAdmin()) return true;
  if (!boardSettings().allowOnlyOwnEdit) return true;
  return noteBelongsToCurrentUser(note);
}

function canDeleteNote(note) {
  if (!isManagementBoard(state.board)) return true;
  if (isAdmin()) return true;
  if (!boardSettings().allowOnlyOwnDelete) return true;
  return noteBelongsToCurrentUser(note);
}

function canMoveLabel(label) {
  if (!canManageLabels()) return false;
  if (!isManagementBoard(state.board)) return true;
  if (!boardSettings().allowOnlyOwnMove) return true;
  return labelBelongsToCurrentUser(label);
}

function canEditLabel(label) {
  if (!canManageLabels()) return false;
  if (!isManagementBoard(state.board)) return true;
  if (!boardSettings().allowOnlyOwnEdit) return true;
  return labelBelongsToCurrentUser(label);
}

function canDeleteLabel(label) {
  if (!canManageLabels()) return false;
  if (!isManagementBoard(state.board)) return true;
  if (!boardSettings().allowOnlyOwnDelete) return true;
  return labelBelongsToCurrentUser(label);
}

function notesOwnedByCurrentUser() {
  return state.notes.filter((note) => noteBelongsToCurrentUser(note)).length;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizedLabelFontSize(value) {
  return clampValue(Math.round(Number(value) || DEFAULT_LABEL_FONT_SIZE), MIN_LABEL_FONT_SIZE, MAX_LABEL_FONT_SIZE);
}

function labelMetrics(label) {
  const fontSize = normalizedLabelFontSize(label?.fontSize);
  return {
    width: LABEL_MAX_WIDTH,
    height: Math.max(LABEL_HEIGHT, Math.round(fontSize * 2.9)),
  };
}

function clampNotePosition(x, y, noteWidth = NOTE_SIZE, noteHeight = NOTE_SIZE) {
  const maxX = Math.max(0, normalizedBoardColumns() * NOTE_SIZE - noteWidth);
  const maxY = Math.max(0, normalizedBoardRows() * NOTE_SIZE - noteHeight);
  return {
    x: clampValue(x, 0, maxX),
    y: clampValue(y, 0, maxY),
  };
}

function clampLabelPosition(x, y, labelWidth = LABEL_MAX_WIDTH, labelHeight = LABEL_HEIGHT) {
  const maxX = Math.max(0, normalizedBoardColumns() * NOTE_SIZE - labelWidth);
  const maxY = Math.max(0, normalizedBoardRows() * NOTE_SIZE - labelHeight);
  return {
    x: clampValue(x, 0, maxX),
    y: clampValue(y, 0, maxY),
  };
}

function normalizeLabelText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function editingNoteScale(zoom = state.zoom) {
  return Number((1 / Math.max(zoom, 0.01)).toFixed(4));
}

function isLocalNoteId(noteId) {
  return Number(noteId) < 0;
}

function nextLocalNoteId() {
  const noteId = state.nextLocalNoteId;
  state.nextLocalNoteId -= 1;
  return noteId;
}

function clearPendingSaveTimer(noteId) {
  if (!state.saveTimers.has(noteId)) {
    return;
  }

  const timerEntry = state.saveTimers.get(noteId);
  if (timerEntry?.timeoutId) {
    window.clearTimeout(timerEntry.timeoutId);
  }
  state.saveTimers.delete(noteId);
}

function saveNoteDebounced(note) {
  if (isLocalNoteId(note.id)) {
    return;
  }

  if (state.saveTimers.has(note.id)) {
    const existingEntry = state.saveTimers.get(note.id);
    if (existingEntry?.timeoutId) {
      window.clearTimeout(existingEntry.timeoutId);
    }
  }

  const timerEntry = {
    timeoutId: null,
    inFlight: false,
  };
  timerEntry.timeoutId = window.setTimeout(async () => {
    timerEntry.timeoutId = null;
    timerEntry.inFlight = true;
    try {
      const payload = {
        ...serializeNote(note),
        clientId: state.clientId,
        adminToken: state.adminToken,
      };
      const data = await api("update_note", { method: "POST", body: payload });
      upsertNote(data.note);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (state.saveTimers.get(note.id) === timerEntry) {
        state.saveTimers.delete(note.id);
      }
    }
  }, 250);

  state.saveTimers.set(note.id, timerEntry);
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

function serializeLabel(label) {
  return {
    id: label.id,
    author: label.author,
    text: label.text,
    fontSize: normalizedLabelFontSize(label.fontSize),
    x: label.x,
    y: label.y,
    zIndex: label.zIndex,
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

function upsertLabel(label) {
  const index = state.labels.findIndex((entry) => entry.id === label.id);
  if (index >= 0) {
    state.labels[index] = label;
  } else {
    state.labels.push(label);
  }

  state.labels.sort((a, b) => a.zIndex - b.zIndex || a.id - b.id);
}

function selectedNote() {
  return getRenderableNote(state.selectedNoteId);
}

function editingNote() {
  return getRenderableNote(state.editingNoteId);
}

function getLabelById(labelId) {
  return state.labels.find((entry) => entry.id === labelId) || null;
}

function selectedLabel() {
  return getLabelById(state.selectedLabelId);
}

function comparableBoardState({ board, notes, labels, members }) {
  return {
    board: board ? {
      id: board.id,
      code: board.code,
      title: board.title,
      managementMode: isManagementBoard(board),
      isAdmin: boardHasAdminAccess(board),
      settings: board.settings ? {
        allowOnlyOwnMove: Boolean(board.settings.allowOnlyOwnMove),
        allowOnlyOwnDelete: Boolean(board.settings.allowOnlyOwnDelete),
        allowOnlyOwnEdit: Boolean(board.settings.allowOnlyOwnEdit),
        allowViewerCreateNotes: Boolean(board.settings.allowViewerCreateNotes),
        likesEnabled: Boolean(board.settings.likesEnabled),
        maxNotesPerUser: Number(board.settings.maxNotesPerUser) || 0,
        maxBoardColumns: Number(board.settings.maxBoardColumns) || DEFAULT_BOARD_COLUMNS,
        maxBoardRows: Number(board.settings.maxBoardRows) || DEFAULT_BOARD_ROWS,
        lineColumns: Number(board.settings.lineColumns) || 0,
        lineRows: Number(board.settings.lineRows) || 0,
        kickBlockMinutes: Number(board.settings.kickBlockMinutes) || 15,
      } : null,
    } : null,
    notes: (notes || [])
      .filter((note) => !isLocalNoteId(note.id))
      .map((note) => ({
        id: note.id,
        ownerClientId: note.ownerClientId,
        author: note.author,
        content: note.content,
        color: note.color,
        fontFamily: note.fontFamily,
        fontSize: note.fontSize,
        isBold: Boolean(note.isBold),
        isItalic: Boolean(note.isItalic),
        isUnderline: Boolean(note.isUnderline),
        likesCount: Number(note.likesCount) || 0,
        isLikedByCurrentUser: Boolean(note.isLikedByCurrentUser),
        x: note.x,
        y: note.y,
        zIndex: note.zIndex,
        updatedAt: note.updatedAt,
      }))
      .sort((a, b) => a.id - b.id),
    labels: (labels || [])
      .map((label) => ({
        id: label.id,
        ownerClientId: label.ownerClientId,
        author: label.author,
        text: label.text,
        fontSize: normalizedLabelFontSize(label.fontSize),
        x: label.x,
        y: label.y,
        zIndex: label.zIndex,
        updatedAt: label.updatedAt,
      }))
      .sort((a, b) => a.id - b.id),
    members: (members || [])
      .map((member) => ({
        clientId: member.clientId,
        userName: member.userName,
        isAdmin: memberHasAdminAccess(member),
        noteCount: Number(member.noteCount) || 0,
      }))
      .sort((a, b) => a.clientId.localeCompare(b.clientId)),
  };
}

function protectedRemoteNoteIds() {
  const protectedIds = new Set();
  state.saveTimers.forEach((_entry, noteId) => {
    protectedIds.add(Number(noteId));
  });
  if (state.drag?.type === "note" && state.drag?.id !== undefined && state.drag?.id !== null) {
    protectedIds.add(state.drag.id);
  }
  Object.keys(state.drafts).forEach((noteId) => {
    const numericNoteId = Number(noteId);
    if (!Number.isNaN(numericNoteId) && !isLocalNoteId(numericNoteId)) {
      protectedIds.add(numericNoteId);
    }
  });
  return protectedIds;
}

function protectedRemoteLabelIds() {
  const protectedIds = new Set(state.pendingLabelSaveIds);
  if (state.drag?.type === "label" && state.drag?.id !== undefined && state.drag?.id !== null) {
    protectedIds.add(state.drag.id);
  }
  return protectedIds;
}

function mergeRemoteNotesWithLocalState(remoteNotes) {
  const localNotesById = new Map(state.notes.map((note) => [note.id, note]));
  const protectedIds = protectedRemoteNoteIds();
  const mergedNotes = (remoteNotes || []).map((remoteNote) => (
    protectedIds.has(remoteNote.id) && localNotesById.has(remoteNote.id)
      ? localNotesById.get(remoteNote.id)
      : remoteNote
  ));
  const localTransientNotes = state.notes.filter((note) => isLocalNoteId(note.id));
  return [...mergedNotes, ...localTransientNotes]
    .sort((a, b) => a.zIndex - b.zIndex || a.id - b.id);
}

function mergeRemoteLabelsWithLocalState(remoteLabels) {
  const localLabelsById = new Map(state.labels.map((label) => [label.id, label]));
  const protectedIds = protectedRemoteLabelIds();
  return (remoteLabels || []).map((remoteLabel) => (
    protectedIds.has(remoteLabel.id) && localLabelsById.has(remoteLabel.id)
      ? localLabelsById.get(remoteLabel.id)
      : remoteLabel
  )).sort((a, b) => a.zIndex - b.zIndex || a.id - b.id);
}

function computePresentationNoteTransitions(previousNotes, nextNotes) {
  const previousById = new Map((previousNotes || []).map((note) => [note.id, note]));
  const movedNoteIds = [];
  const enteringNoteIds = [];

  (nextNotes || []).forEach((note) => {
    if (isLocalNoteId(note.id)) return;
    const previous = previousById.get(note.id);
    if (!previous) {
      enteringNoteIds.push(note.id);
      return;
    }
    if (previous.x !== note.x || previous.y !== note.y || previous.zIndex !== note.zIndex) {
      movedNoteIds.push(note.id);
    }
  });

  return {
    movedNoteIds,
    enteringNoteIds,
  };
}

function boardStateSignature(snapshot) {
  return JSON.stringify(comparableBoardState(snapshot));
}

function getBoardViewportSize() {
  const viewport = document.querySelector(".board-viewport");
  return {
    width: viewport?.clientWidth || window.visualViewport?.width || window.innerWidth || 1200,
    height: viewport?.clientHeight || window.visualViewport?.height || window.innerHeight || 700,
  };
}

function roundZoomValue(zoom) {
  return Number(Number(zoom).toFixed(2));
}

function computeBoardViewportLayout(targetZoom, viewportWidth, viewportHeight) {
  const metrics = getCanvasMetrics();
  const resolvedViewportWidth = viewportWidth || window.visualViewport?.width || window.innerWidth || 1200;
  const resolvedViewportHeight = viewportHeight || window.visualViewport?.height || window.innerHeight || 700;
  const canvasWidth = Math.round(metrics.width * targetZoom);
  const canvasHeight = Math.round(metrics.height * targetZoom);
  const viewportContentWidth = Math.max(resolvedViewportWidth, canvasWidth);
  const viewportContentHeight = Math.max(resolvedViewportHeight, canvasHeight);
  const canvasOffsetX = Math.max(0, Math.round((viewportContentWidth - canvasWidth) / 2));
  const canvasOffsetY = Math.max(0, Math.round((viewportContentHeight - canvasHeight) / 2));

  return {
    metrics,
    canvasWidth,
    canvasHeight,
    viewportContentWidth,
    viewportContentHeight,
    canvasOffsetX,
    canvasOffsetY,
  };
}

function applyBoardViewportVisualLayout({
  zoom,
  scrollLeft,
  scrollTop,
  viewport = document.querySelector(".board-viewport"),
  viewportContent = document.querySelector(".board-viewport-content"),
  canvas = document.querySelector(".board-canvas"),
  content = document.querySelector(".board-canvas-content"),
} = {}) {
  if (!viewport || !viewportContent || !canvas || !content) return null;

  const layout = computeBoardViewportLayout(zoom, viewport.clientWidth, viewport.clientHeight);
  viewportContent.style.width = `${layout.viewportContentWidth}px`;
  viewportContent.style.height = `${layout.viewportContentHeight}px`;
  canvas.style.left = `${layout.canvasOffsetX}px`;
  canvas.style.top = `${layout.canvasOffsetY}px`;
  canvas.style.width = `${layout.canvasWidth}px`;
  canvas.style.height = `${layout.canvasHeight}px`;
  content.style.width = `${layout.metrics.width}px`;
  content.style.height = `${layout.metrics.height}px`;
  content.style.transform = `scale(${zoom})`;

  const nextScrollLeft = clampValue(
    Math.round(scrollLeft || 0),
    0,
    Math.max(0, layout.viewportContentWidth - viewport.clientWidth)
  );
  const nextScrollTop = clampValue(
    Math.round(scrollTop || 0),
    0,
    Math.max(0, layout.viewportContentHeight - viewport.clientHeight)
  );

  viewport.scrollLeft = nextScrollLeft;
  viewport.scrollTop = nextScrollTop;

  return {
    zoom,
    scrollLeft: nextScrollLeft,
    scrollTop: nextScrollTop,
    layout,
  };
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function dragIntentThreshold(pointerType = "") {
  return pointerType === "touch" || isCompactViewport() ? 10 : 2;
}

function updateViewportEnvironment() {
  const visualViewport = window.visualViewport;
  const keyboardOffset = visualViewport
    ? Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop))
    : 0;
  document.documentElement.style.setProperty("--mobile-keyboard-offset", `${keyboardOffset}px`);
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

function buildEditorViewportFocus(note, targetZoom = state.zoom) {
  const metrics = getCanvasMetrics();
  const { width: viewportWidth, height: viewportHeight } = getBoardViewportSize();
  const noteScale = editingNoteScale(targetZoom);
  const noteCenterX = note.x + ((NOTE_SIZE * noteScale) / 2);
  const noteCenterY = note.y + ((NOTE_SIZE * noteScale) / 2);
  const left = clampValue(
    Math.round((noteCenterX * targetZoom) - (viewportWidth / 2)),
    0,
    Math.max(0, Math.round((metrics.width * targetZoom) - viewportWidth))
  );
  const top = clampValue(
    Math.round((noteCenterY * targetZoom) - (viewportHeight / 2)),
    0,
    Math.max(0, Math.round((metrics.height * targetZoom) - viewportHeight))
  );
  return { left, top };
}

function centerBoardInView() {
  const metrics = getCanvasMetrics();
  const { width: viewportWidth, height: viewportHeight } = getBoardViewportSize();
  state.viewportFocus = {
    left: Math.max(0, Math.round(((metrics.width * state.zoom) - viewportWidth) / 2)),
    top: Math.max(0, Math.round(((metrics.height * state.zoom) - viewportHeight) / 2)),
  };
  state.viewportFocusDelayMs = 0;
  state.viewportFocusBehavior = "instant";
  state.viewportFocusSource = null;
}

function setZoomPreservingViewport(nextZoom) {
  const targetZoom = roundZoomValue(nextZoom);
  if (targetZoom === state.zoom) return;

  const viewport = document.querySelector(".board-viewport");
  if (!viewport) {
    state.zoom = targetZoom;
    render();
    return;
  }

  const logicalCenterX = (viewport.scrollLeft + (viewport.clientWidth / 2)) / state.zoom;
  const logicalCenterY = (viewport.scrollTop + (viewport.clientHeight / 2)) / state.zoom;

  state.zoom = targetZoom;
  state.viewportFocus = {
    left: Math.max(0, Math.round((logicalCenterX * targetZoom) - (viewport.clientWidth / 2))),
    top: Math.max(0, Math.round((logicalCenterY * targetZoom) - (viewport.clientHeight / 2))),
  };
  state.viewportFocusDelayMs = 0;
  state.viewportFocusBehavior = "instant";
  state.viewportFocusSource = null;
  render();
}

function setZoomAroundViewportPoint(nextZoom, clientX, clientY) {
  const targetZoom = roundZoomValue(nextZoom);
  if (targetZoom === state.zoom) return;

  const viewport = document.querySelector(".board-viewport");
  if (!viewport) {
    state.zoom = targetZoom;
    render();
    return;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const offsetX = clientX - viewportRect.left;
  const offsetY = clientY - viewportRect.top;
  const logicalPointX = (viewport.scrollLeft + offsetX) / state.zoom;
  const logicalPointY = (viewport.scrollTop + offsetY) / state.zoom;

  state.zoom = targetZoom;
  state.viewportFocus = {
    left: Math.max(0, Math.round((logicalPointX * targetZoom) - offsetX)),
    top: Math.max(0, Math.round((logicalPointY * targetZoom) - offsetY)),
  };
  state.viewportFocusDelayMs = 0;
  state.viewportFocusBehavior = "instant";
  state.viewportFocusSource = null;
  render();
}

function prepareBoardForEditing(note) {
  if (!note) return;
  state.viewportFocus = buildEditorViewportFocus(note, state.zoom);
  state.viewportFocusDelayMs = 0;
  state.viewportFocusBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
  state.viewportFocusSource = readViewportSnapshot();
}

function alignNewEditingNoteWithPanel() {
  if (window.matchMedia("(max-width: 980px)").matches) return;
  if (state.viewportFocus || state.viewportFocusDelayMs > 0) return;
  if (!state.editingNoteId || !isLocalNoteId(state.editingNoteId)) return;

  const note = ensureDraft(state.editingNoteId);
  const viewport = document.querySelector(".board-viewport");
  const panel = document.querySelector(".note-editor-panel");
  if (!note || !viewport || !panel || panel.classList.contains("is-hidden")) return;

  const noteScale = editingNoteScale();
  const noteLogicalWidth = NOTE_SIZE * noteScale;
  const noteLogicalHeight = NOTE_SIZE * noteScale;
  const visibleWidth = viewport.clientWidth / state.zoom;
  const visibleHeight = viewport.clientHeight / state.zoom;

  const targetX = viewport.scrollLeft / state.zoom + ((visibleWidth - noteLogicalWidth) / 2);
  const targetY = viewport.scrollTop / state.zoom + ((visibleHeight - noteLogicalHeight) / 2);
  const clamped = clampNotePosition(Math.round(targetX), Math.round(targetY), noteLogicalWidth, noteLogicalHeight);

  if (note.x === clamped.x && note.y === clamped.y) return;

  note.x = clamped.x;
  note.y = clamped.y;
  const persisted = state.notes.find((entry) => entry.id === note.id);
  if (persisted) {
    persisted.x = clamped.x;
    persisted.y = clamped.y;
  }

  render();
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

function showZoomIndicator(message) {
  const app = document.getElementById("app");
  if (!app || state.view !== "board" || !message) return;

  let indicator = app.querySelector(".zoom-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "zoom-indicator";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    app.append(indicator);
  }

  indicator.textContent = message;
  indicator.classList.add("is-visible");
  window.clearTimeout(state.zoomIndicatorTimer);
  state.zoomIndicatorTimer = window.setTimeout(() => {
    indicator.classList.remove("is-visible");
  }, 1100);
}

function closestNoteEditorFromNode(node) {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node.closest?.('[data-role="note-editor"]') || null;
  }
  return node.parentElement?.closest?.('[data-role="note-editor"]') || null;
}

function closestElementWithin(container, node) {
  if (!container || !node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element && container.contains(element) ? element : null;
}

function clampNoteFontSize(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return null;
  return clampValue(Math.round(nextValue), MIN_NOTE_FONT_SIZE, MAX_NOTE_FONT_SIZE);
}

function extractAllowedInlineFontSize(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;

  const directFontSize = typeof element.style?.fontSize === "string" ? element.style.fontSize.trim() : "";
  const rawStyle = typeof element.getAttribute === "function" ? (element.getAttribute("style") || "") : "";
  const fontSizeMatch = /^([0-9.]+)px$/i.exec(directFontSize)
    || /font-size\s*:\s*([0-9.]+)px/i.exec(rawStyle);
  if (fontSizeMatch) {
    return clampNoteFontSize(fontSizeMatch[1]);
  }

  if (element.tagName === "FONT") {
    const legacySize = Number(element.getAttribute("size"));
    const legacyMap = {
      1: 10,
      2: 13,
      3: 16,
      4: 18,
      5: 24,
      6: 32,
      7: 42,
    };
    if (legacyMap[legacySize]) {
      return clampNoteFontSize(legacyMap[legacySize]);
    }
  }

  return null;
}

function selectionRangeInEditor(editor) {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
    return null;
  }
  return range;
}

function rememberEditorSelection(editor) {
  const range = selectionRangeInEditor(editor);
  if (!range) return false;
  state.savedEditorSelection = {
    noteId: Number(editor.dataset.id),
    range: range.cloneRange(),
  };
  return true;
}

function restoreSavedEditorSelection(editor) {
  const saved = state.savedEditorSelection;
  if (!editor || !saved || saved.noteId !== Number(editor.dataset.id)) return false;
  if (!editor.contains(saved.range.startContainer) || !editor.contains(saved.range.endContainer)) {
    state.savedEditorSelection = null;
    return false;
  }

  const selection = window.getSelection?.();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(saved.range.cloneRange());
  return true;
}

function selectionFormattingState(editor, note) {
  const range = selectionRangeInEditor(editor);
  if (!range) return null;

  const sourceElement = closestElementWithin(editor, range.startContainer)
    || closestElementWithin(editor, window.getSelection()?.focusNode)
    || editor;
  const computed = window.getComputedStyle(sourceElement);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);

  return {
    fontSize: clampNoteFontSize(computed.fontSize) ?? note.fontSize,
    isBold: Number.isFinite(fontWeight) ? fontWeight >= 600 : computed.fontWeight === "bold",
    isItalic: computed.fontStyle === "italic",
    isUnderline: computed.textDecorationLine.includes("underline"),
  };
}

function getSelectedNoteEditor() {
  const selection = window.getSelection?.();
  if (selection?.rangeCount) {
    const anchorEditor = closestNoteEditorFromNode(selection.anchorNode);
    const focusEditor = closestNoteEditorFromNode(selection.focusNode);
    if (anchorEditor && anchorEditor === focusEditor) {
      return anchorEditor;
    }
  }

  return document.activeElement?.closest?.('[data-role="note-editor"]') || null;
}

function syncDraftFromEditor(editor) {
  if (!editor) return;
  const noteId = Number(editor.dataset.id);
  const draft = ensureDraft(noteId);
  if (!draft) return;
  draft.content = sanitizeRichText(editor.innerHTML);
  draft.author = state.userName;
}

function syncDraftFromActiveEditor(noteId = state.editingNoteId) {
  const editor = getSelectedNoteEditor() || document.querySelector(`.note-editor[data-id="${noteId}"]`);
  syncDraftFromEditor(editor);
}

function normalizeEditorFontMarkup(editor, forcedFontSize = null) {
  if (!editor) return;

  editor.querySelectorAll("font").forEach((fontElement) => {
    const nextFontSize = clampNoteFontSize(forcedFontSize) ?? extractAllowedInlineFontSize(fontElement);
    if (!nextFontSize) {
      const fragment = document.createDocumentFragment();
      while (fontElement.firstChild) {
        fragment.appendChild(fontElement.firstChild);
      }
      fontElement.replaceWith(fragment);
      return;
    }

    const span = document.createElement("span");
    span.setAttribute("style", `font-size: ${nextFontSize}px;`);
    while (fontElement.firstChild) {
      span.appendChild(fontElement.firstChild);
    }
    fontElement.replaceWith(span);
  });
}

function activeEditorRange(editor) {
  const currentRange = selectionRangeInEditor(editor);
  if (currentRange && !currentRange.collapsed) {
    return currentRange;
  }

  const saved = state.savedEditorSelection;
  if (!editor || !saved || saved.noteId !== Number(editor.dataset.id)) {
    return null;
  }
  if (!editor.contains(saved.range.startContainer) || !editor.contains(saved.range.endContainer)) {
    state.savedEditorSelection = null;
    return null;
  }
  return saved.range.cloneRange();
}

function collapseFontSizeWrapper(wrapper) {
  let currentWrapper = wrapper;

  while (currentWrapper.parentElement?.tagName === "SPAN") {
    const parent = currentWrapper.parentElement;
    if (!extractAllowedInlineFontSize(parent) || parent.childNodes.length !== 1 || parent.firstChild !== currentWrapper) {
      break;
    }
    parent.replaceWith(currentWrapper);
  }

  return currentWrapper;
}

function applyInlineFontSizeToSelection(editor, fontSize) {
  const range = activeEditorRange(editor);
  if (!range || range.collapsed) return false;

  const selection = window.getSelection?.();
  if (!selection) return false;

  const wrapper = document.createElement("span");
  wrapper.setAttribute("style", `font-size: ${fontSize}px;`);

  const fragment = range.extractContents();
  if (!fragment.hasChildNodes()) {
    return false;
  }

  wrapper.appendChild(fragment);
  range.insertNode(wrapper);
  const collapsedWrapper = collapseFontSizeWrapper(wrapper);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(collapsedWrapper);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  state.savedEditorSelection = {
    noteId: Number(editor.dataset.id),
    range: nextRange.cloneRange(),
  };
  return true;
}

function applyNoteTextFormat(command, fallbackProperty) {
  const activeNote = editingNote();
  if (!activeNote) return;

  const editor = getSelectedNoteEditor() || document.querySelector(`.note-editor[data-id="${activeNote.id}"]`);
  if (editor && Number(editor.dataset.id) === activeNote.id) {
    const currentRange = selectionRangeInEditor(editor);
    if (!currentRange || currentRange.collapsed) {
      restoreSavedEditorSelection(editor);
    }
    editor.focus({ preventScroll: true });
    document.execCommand(command);
    rememberEditorSelection(editor);
    syncDraftFromEditor(editor);
    syncEditorPanel();
    return;
  }

  updateSelectedNote({ [fallbackProperty]: !activeNote[fallbackProperty] });
  syncEditorPanel();
}

function applyNoteFontSize(nextFontSize) {
  const activeNote = editingNote();
  if (!activeNote) return;

  const fontSize = clampNoteFontSize(nextFontSize);
  if (!fontSize) return;

  const editor = getSelectedNoteEditor() || document.querySelector(`.note-editor[data-id="${activeNote.id}"]`);
  if (editor && Number(editor.dataset.id) === activeNote.id) {
    const currentRange = selectionRangeInEditor(editor);
    if (!currentRange || currentRange.collapsed) {
      restoreSavedEditorSelection(editor);
    }
  }
  if (editor && Number(editor.dataset.id) === activeNote.id && applyInlineFontSizeToSelection(editor, fontSize)) {
    editor.focus({ preventScroll: true });
    state.editorInlineFontSizePreview = {
      noteId: activeNote.id,
      fontSize,
    };
    syncDraftFromEditor(editor);
    syncEditorPanel();
    return;
  }

  state.editorInlineFontSizePreview = null;
  updateSelectedNote({ fontSize });
  syncEditorPanel();
}

function displayedEditorFontSize(note = editingNote()) {
  if (!note) return MIN_NOTE_FONT_SIZE;

  const inlineFontSizePreview = state.editorInlineFontSizePreview?.noteId === note.id
    ? state.editorInlineFontSizePreview.fontSize
    : null;
  const editor = getSelectedNoteEditor();
  const formatting = editor && Number(editor.dataset.id) === note.id
    ? selectionFormattingState(editor, note)
    : null;

  return clampNoteFontSize(inlineFontSizePreview ?? formatting?.fontSize ?? note.fontSize) ?? note.fontSize;
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
  const allowedTags = new Set(["BR", "DIV", "P", "B", "STRONG", "I", "EM", "U", "SPAN"]);

  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      if (child.tagName === "FONT") {
        const nextFontSize = extractAllowedInlineFontSize(child);
        const replacement = nextFontSize ? document.createElement("span") : document.createDocumentFragment();
        if (nextFontSize) {
          replacement.setAttribute("style", `font-size: ${nextFontSize}px;`);
        }
        while (child.firstChild) {
          replacement.appendChild(child.firstChild);
        }
        child.replaceWith(replacement);
        walk(node);
        return;
      }

      if (!allowedTags.has(child.tagName)) {
        const fragment = document.createDocumentFragment();
        while (child.firstChild) {
          fragment.appendChild(child.firstChild);
        }
        child.replaceWith(fragment);
        walk(node);
        return;
      }

      const nextFontSize = child.tagName === "SPAN" ? extractAllowedInlineFontSize(child) : null;
      [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
      if (child.tagName === "SPAN") {
        if (!nextFontSize) {
          const fragment = document.createDocumentFragment();
          while (child.firstChild) {
            fragment.appendChild(child.firstChild);
          }
          child.replaceWith(fragment);
          walk(node);
          return;
        }
        child.setAttribute("style", `font-size: ${nextFontSize}px;`);
      }
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

function clearSettlingNote() {
  if (state.settlingNoteTimer) {
    window.clearTimeout(state.settlingNoteTimer);
    state.settlingNoteTimer = null;
  }
  state.settlingNoteId = null;
}

function startSettlingNote(noteId) {
  clearSettlingNote();
  if (!noteId || Math.abs(state.zoom - 1) < 0.01) return;
  state.settlingNoteId = noteId;
  state.settlingNoteTimer = window.setTimeout(() => {
    state.settlingNoteTimer = null;
    state.settlingNoteId = null;
    render();
  }, 240);
}

function exitNoteEditing(noteId = state.editingNoteId) {
  if (!noteId) return;

  if (isLocalNoteId(noteId)) {
    cancelNote(noteId);
    return;
  }

  clearDraft(noteId);
  if (state.editingNoteId === noteId) {
    state.editingNoteId = null;
  }
  if (state.savedEditorSelection?.noteId === noteId) {
    state.savedEditorSelection = null;
  }
  if (state.editorInlineFontSizePreview?.noteId === noteId) {
    state.editorInlineFontSizePreview = null;
  }
  state.mobileEditorToolsOpen = false;
  state.pendingEditorFocusNoteId = null;
  startSettlingNote(noteId);
  render();
}

function hasOpenDrafts() {
  return Object.keys(state.drafts).length > 0;
}

function cancelNote(noteId) {
  if (!isLocalNoteId(noteId)) {
    clearDraft(noteId);
    if (state.editingNoteId === noteId) {
      state.editingNoteId = null;
    }
    if (state.savedEditorSelection?.noteId === noteId) {
      state.savedEditorSelection = null;
    }
    if (state.editorInlineFontSizePreview?.noteId === noteId) {
      state.editorInlineFontSizePreview = null;
    }
    state.mobileEditorToolsOpen = false;
    render();
    return;
  }

  clearPendingSaveTimer(noteId);
  state.notes = state.notes.filter((entry) => entry.id !== noteId);
  clearDraft(noteId);

  if (state.selectedNoteId === noteId) {
    state.selectedNoteId = state.notes[0]?.id ?? null;
  }
  if (state.editingNoteId === noteId) {
    state.editingNoteId = null;
  }
  if (state.savedEditorSelection?.noteId === noteId) {
    state.savedEditorSelection = null;
  }
  if (state.editorInlineFontSizePreview?.noteId === noteId) {
    state.editorInlineFontSizePreview = null;
  }
  state.mobileEditorToolsOpen = false;

  render();
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

  const payload = {
    ...serializeNote(note),
    code: state.board?.code,
    clientId: state.clientId,
    adminToken: state.adminToken,
    content: sanitizeRichText(note.content || ""),
  };
  const action = isLocalNoteId(note.id) ? "create_note" : "update_note";
  const data = await api(action, {
    method: "POST",
    body: payload,
  });

  clearPendingSaveTimer(noteId);

  if (isLocalNoteId(note.id)) {
    state.notes = state.notes.filter((entry) => entry.id !== noteId);
  }

  upsertNote(data.note);
  clearDraft(noteId);
  state.selectedNoteId = data.note.id;
  state.editingNoteId = null;
  if (state.savedEditorSelection?.noteId === noteId) {
    state.savedEditorSelection = null;
  }
  if (state.editorInlineFontSizePreview?.noteId === noteId) {
    state.editorInlineFontSizePreview = null;
  }
  state.mobileEditorToolsOpen = false;
  startSettlingNote(data.note.id);
  showToast(t("saved"));
  render();
}

async function deleteNote(noteId) {
  const note = getNoteById(noteId);
  if (!note) return;

  if (isLocalNoteId(noteId)) {
    clearPendingSaveTimer(noteId);
    state.notes = state.notes.filter((entry) => entry.id !== noteId);
    clearDraft(noteId);
    if (state.selectedNoteId === noteId) {
      state.selectedNoteId = state.notes[0]?.id ?? null;
    }
    if (state.editingNoteId === noteId) {
      state.editingNoteId = null;
    }
    render();
    return;
  }

  const data = await api("delete_note", {
    method: "POST",
    body: {
      id: noteId,
      clientId: state.clientId,
      adminToken: state.adminToken,
    },
  });

  clearPendingSaveTimer(noteId);
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

async function toggleNoteLike(noteId) {
  const note = getNoteById(noteId);
  if (!note || !state.board || !likesEnabled()) return;

  const data = await api("toggle_note_like", {
    method: "POST",
    body: {
      id: noteId,
      clientId: state.clientId,
      userName: state.userName,
      adminToken: state.adminToken,
      liked: !note.isLikedByCurrentUser,
    },
  });

  upsertNote(data.note);
  render();
}

function currentViewportBoardPosition(itemWidth = LABEL_MAX_WIDTH, itemHeight = LABEL_HEIGHT) {
  const boardViewport = document.querySelector(".board-viewport");
  const { width: viewportWidth, height: viewportHeight } = getBoardViewportSize();
  const viewportLeft = boardViewport ? boardViewport.scrollLeft / state.zoom : 0;
  const viewportTop = boardViewport ? boardViewport.scrollTop / state.zoom : 0;

  return clampLabelPosition(
    Math.max(24, Math.round(viewportLeft + (((viewportWidth / state.zoom) - itemWidth) * 0.5))),
    Math.max(24, Math.round(viewportTop + (((viewportHeight / state.zoom) - itemHeight) * 0.5))),
    itemWidth,
    itemHeight
  );
}

function bringLabelToFront(labelId) {
  const label = getLabelById(labelId);
  if (!label) return;
  const highestZ = state.labels.reduce((max, entry) => Math.max(max, entry.zIndex), 0) + 1;
  label.zIndex = highestZ;
}

async function createLabel(text) {
  if (!state.board) return;
  if (!canManageLabels()) {
    showToast(state.lang === "nl" ? "Alleen beheerders kunnen labels toevoegen." : "Only admins can add labels.", true);
    return;
  }
  if (!canCreateNotes()) {
    showToast(t("users_cannot_add_notes"), true);
    return;
  }

  const normalizedText = normalizeLabelText(text);
  if (!normalizedText) {
    throw new Error(t("label_text_required"));
  }

  const metrics = labelMetrics({ fontSize: DEFAULT_LABEL_FONT_SIZE });
  const position = currentViewportBoardPosition(metrics.width, metrics.height);
  const data = await api("create_label", {
    method: "POST",
    body: {
      code: state.board.code,
      clientId: state.clientId,
      adminToken: state.adminToken,
      author: state.userName,
      text: normalizedText,
      fontSize: DEFAULT_LABEL_FONT_SIZE,
      x: position.x,
      y: position.y,
    },
  });

  upsertLabel(data.label);
  state.selectedLabelId = data.label.id;
  state.selectedNoteId = null;
  render();
}

async function persistLabel(label) {
  if (!label || !state.board) return;

  state.pendingLabelSaveIds.add(label.id);
  try {
    const data = await api("update_label", {
      method: "POST",
      body: {
        ...serializeLabel(label),
        clientId: state.clientId,
        adminToken: state.adminToken,
      },
    });
    upsertLabel(data.label);
  } finally {
    state.pendingLabelSaveIds.delete(label.id);
  }
}

async function saveLabelText(labelId, text) {
  const label = getLabelById(labelId);
  if (!label) return;
  label.text = normalizeLabelText(text);
  label.author = state.userName;
  await persistLabel(label);
  render();
}

async function adjustLabelFontSize(labelId, delta) {
  const label = getLabelById(labelId);
  if (!label || !canEditLabel(label)) return;
  const nextFontSize = normalizedLabelFontSize((label.fontSize || DEFAULT_LABEL_FONT_SIZE) + delta);
  if (nextFontSize === normalizedLabelFontSize(label.fontSize)) return;
  label.fontSize = nextFontSize;
  label.author = state.userName;
  await persistLabel(label);
  render();
}

async function deleteLabel(labelId) {
  const label = getLabelById(labelId);
  if (!label) return;

  await api("delete_label", {
    method: "POST",
    body: {
      id: labelId,
      clientId: state.clientId,
      adminToken: state.adminToken,
    },
  });

  state.labels = state.labels.filter((entry) => entry.id !== labelId);
  if (state.selectedLabelId === labelId) {
    state.selectedLabelId = null;
  }
  render();
}

async function downloadBoardExport(format) {
  if (!state.board) return;

  const params = new URLSearchParams({
    action: "export_board",
    code: state.board.code,
    format,
  });
  if (state.adminToken) {
    params.set("adminToken", state.adminToken);
  }

  const response = await fetch(`./api.php?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Export failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fallbackName = `sticky-board-${state.board.code.toLowerCase()}.${format}`;
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  link.href = url;
  link.download = fileNameMatch?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(t("export_ready"));
}

async function saveManagementSettings(openBoardAfterSave = false) {
  if (!state.board || !isAdmin() || !state.settingsDraft) return;

  const payload = {
    ...state.settingsDraft,
    maxNotesPerUser: Number(state.settingsDraft.maxNotesPerUser) || 0,
    maxBoardColumns: Number(state.settingsDraft.maxBoardColumns) || 0,
    maxBoardRows: Number(state.settingsDraft.maxBoardRows) || 0,
    lineColumns: normalizedGuideCount(state.settingsDraft.lineColumns),
    lineRows: normalizedGuideCount(state.settingsDraft.lineRows),
    kickBlockMinutes: Math.max(1, Number(state.settingsDraft.kickBlockMinutes) || 15),
  };

  const data = await api("update_management_settings", {
    method: "POST",
    body: {
      code: state.board.code,
      adminToken: state.adminToken,
      settings: payload,
    },
  });

  state.board = data.board;
  state.settingsDraft = { ...data.board.settings };
  showToast(t("settings_saved"));

  if (openBoardAfterSave) {
    await openBoard(state.board.code);
  } else {
    render();
  }
}

async function saveAdminPin(pin) {
  if (!state.board || !isAdmin()) return;

  await api("set_admin_pin", {
    method: "POST",
    body: {
      code: state.board.code,
      adminToken: state.adminToken,
      pin,
    },
  });

  state.modal = null;
  showToast(t("pin_saved"));
  render();
}

async function kickMember(targetClientId, deleteNotes) {
  if (!state.board || !isAdmin()) return;
  const data = await api("kick_member", {
    method: "POST",
    body: {
      code: state.board.code,
      adminToken: state.adminToken,
      targetClientId,
      deleteNotes,
    },
  });
  state.members = data.members || [];
  showToast(deleteNotes ? t("user_kicked_notes_removed") : t("user_kicked"));
  await refreshBoard();
}

async function createBoard(formData) {
  const title = formData.get("title")?.toString().trim() || t("new_board");
  const name = formData.get("userName")?.toString().trim() || defaultUserName();
  const managementMode = formData.get("managementMode") === "on";
  persistUserName(name);
  const data = await api("create_board", {
    method: "POST",
    body: {
      title,
      managementMode,
      adminName: name,
      clientId: state.clientId,
    },
  });
  setRoute(data.board.code);
  if (adminTokenFromPayload(data)) {
    persistAdminToken(data.board.code, adminTokenFromPayload(data));
  }

  if (isManagementBoard(data.board)) {
    state.board = data.board;
    state.members = [];
    state.notes = [];
    state.labels = [];
    state.settingsDraft = { ...data.board.settings };
    state.view = "settings";
    state.modal = {
      type: "set-pin",
      pin: "",
      confirmPin: "",
      locked: true,
    };
    render();
    return;
  }

  state.modal = null;
  await openBoard(data.board.code);
}

async function joinBoard(formData) {
  const code = normalizeJoinCode(formData.get("code")?.toString() || "");
  const name = formData.get("userName")?.toString().trim() || defaultUserName();
  persistUserName(name);
  loadAdminToken(code);
  const data = await api("join_board", {
    method: "POST",
    body: {
      code,
      clientId: state.clientId,
      userName: name,
    },
  });
  setRoute(data.board.code);
  await openBoard(data.board.code);
}

async function adminLogin({ code, pin, userName }) {
  const normalizedCode = normalizeJoinCode(code);
  const normalizedPin = normalizePinValue(pin);
  const name = userName?.toString().trim() || defaultUserName();
  persistUserName(name);
  const data = await api("admin_login", {
    method: "POST",
    body: {
      code: normalizedCode,
      pin: normalizedPin,
      clientId: state.clientId,
      userName: name,
    },
  });
  persistAdminToken(normalizedCode, adminTokenFromPayload(data));
  setRoute(data.board.code);
  state.board = data.board;
  state.notes = data.notes || [];
  state.labels = data.labels || [];
  state.members = data.members || [];
  state.settingsDraft = null;
  state.view = "board";
  state.drafts = {};
  state.selectedNoteId = state.notes[0]?.id ?? null;
  state.selectedLabelId = null;
  state.editingNoteId = null;
  state.qrModalOpen = false;
  state.headerExpanded = false;
  state.zoom = 1;
  centerBoardInView();
  state.presentationMode = false;
  render();
}

function promptDirectBoardJoin(code) {
  state.view = "home";
  state.board = null;
  state.notes = [];
  state.labels = [];
  state.members = [];
  state.modal = {
    type: "direct-board-name",
    code,
    userName: state.userName || defaultUserName(),
    error: "",
  };
  render();
}

async function submitDirectBoardJoin() {
  const code = normalizeJoinCode(state.modal?.code || boardCodeFromUrl());
  const userName = state.modal?.userName?.toString().trim() || defaultUserName();
  persistUserName(userName);
  state.modal = null;
  render();
  await openBoard(code);
}

async function openBoard(code) {
  try {
    const boardData = await fetchBoardByCode(code);
    state.board = boardData.board;
    state.notes = boardData.notes || [];
    state.labels = boardData.labels || [];
    state.members = boardData.members || [];
    state.settingsDraft = null;
    state.drafts = {};
    state.nextLocalNoteId = -1;
    state.selectedNoteId = state.notes[0]?.id ?? null;
    state.selectedLabelId = null;
    state.editingNoteId = null;
    state.qrModalOpen = false;
    state.usersPanelOpen = false;
    state.headerExpanded = false;
    state.zoom = 1;
    centerBoardInView();
    state.presentationMode = false;
    state.view = "board";
    render();
  } catch (error) {
    if (error.status === 403) {
      persistAdminToken(code, null);
      state.board = null;
      state.notes = [];
      state.labels = [];
      state.members = [];
      state.view = "home";
      setRoute("");
      render();
    }
    throw error;
  }
}

async function refreshBoard() {
  if (!state.board) return;
  const previousNotes = state.notes;
  let payload;
  try {
    payload = await fetchBoardByCode(state.board.code);
  } catch (error) {
    if (error.status === 403) {
      persistAdminToken(state.board.code, null);
      const message = error.payload?.bannedUntil
        ? t("board_blocked_until", { until: new Date(error.payload.bannedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
        : error.message;
      state.board = null;
      state.notes = [];
      state.labels = [];
      state.members = [];
      state.view = "home";
      setRoute("");
      render();
      showToast(message, true);
      return;
    }
    throw error;
  }
  const nextNotes = mergeRemoteNotesWithLocalState(payload.notes || []);
  const nextLabels = mergeRemoteLabelsWithLocalState(payload.labels || []);
  const nextMembers = payload.members || state.members;
  const currentSignature = boardStateSignature({
    board: state.board,
    notes: state.notes,
    labels: state.labels,
    members: state.members,
  });
  const nextSignature = boardStateSignature({
    board: payload.board,
    notes: nextNotes,
    labels: nextLabels,
    members: nextMembers,
  });

  if (currentSignature === nextSignature) {
    return;
  }

  state.board = payload.board;
  state.notes = nextNotes;
  state.labels = nextLabels;
  state.members = nextMembers;
  if (!state.notes.some((note) => note.id === state.selectedNoteId)) {
    state.selectedNoteId = state.notes[0]?.id ?? null;
  }
  if (!state.labels.some((label) => label.id === state.selectedLabelId)) {
    state.selectedLabelId = null;
  }
  if (!state.notes.some((note) => note.id === state.editingNoteId)) {
    state.editingNoteId = null;
  }

  if (state.presentationMode) {
    state.presentationBoardVisualSource = readPresentationBoardVisualSnapshot();
    const transitions = computePresentationNoteTransitions(previousNotes, nextNotes);
    state.presentationMovedNoteIds = transitions.movedNoteIds;
    state.presentationEnteringNoteIds = transitions.enteringNoteIds;
    window.setTimeout(() => {
      animateFitNotesInView();
    }, 0);
    return;
  }

  render();
}

async function createNote() {
  if (!state.board) return;
  if (!canCreateNotes()) {
    showToast(t("users_cannot_add_notes"), true);
    return;
  }

  const settings = boardSettings();
  if (settings.maxNotesPerUser > 0 && !isAdmin() && notesOwnedByCurrentUser() >= settings.maxNotesPerUser) {
    showToast(t("max_notes_reached"), true);
    return;
  }

  const boardViewport = document.querySelector(".board-viewport");
  const { width: viewportWidth, height: viewportHeight } = getBoardViewportSize();
  const viewportLeft = boardViewport ? boardViewport.scrollLeft / state.zoom : 0;
  const viewportTop = boardViewport ? boardViewport.scrollTop / state.zoom : 0;
  const noteScale = editingNoteScale();
  const noteLogicalWidth = NOTE_SIZE * noteScale;
  const noteLogicalHeight = NOTE_SIZE * noteScale;
  const clamped = clampNotePosition(
    Math.max(24, Math.round(viewportLeft + ((viewportWidth / state.zoom) - noteLogicalWidth) * 0.5)),
    Math.max(24, Math.round(viewportTop + ((viewportHeight / state.zoom) - noteLogicalHeight) * 0.5)),
    noteLogicalWidth,
    noteLogicalHeight
  );
  const note = {
    id: nextLocalNoteId(),
    boardId: state.board.id,
    ownerClientId: state.clientId,
    author: state.userName,
    content: "",
    color: "yellow",
    fontFamily: "comic",
    fontSize: 22,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    x: clamped.x,
    y: clamped.y,
    zIndex: state.notes.reduce((max, entry) => Math.max(max, entry.zIndex), 0) + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 0,
    isLikedByCurrentUser: false,
  };
  upsertNote(note);
  state.drafts[note.id] = {
    ...note,
    content: "",
  };
  state.selectedNoteId = note.id;
  state.selectedLabelId = null;
  state.editingNoteId = note.id;
  state.pendingEditorFocusNoteId = note.id;
  render();
}

async function updateBoardTitle(title) {
  if (!state.board) return;
  const trimmed = title.trim() || t("new_board");
  const data = await api("update_board", {
    method: "POST",
    body: { code: state.board.code, title: trimmed, adminToken: state.adminToken },
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
  state.selectedLabelId = null;
}

function openNoteEditor(noteId) {
  clearSettlingNote();
  state.selectedNoteId = noteId;
  state.selectedLabelId = null;
  state.editingNoteId = noteId;
  state.mobileEditorToolsOpen = false;
  const draft = ensureDraft(noteId);
  bringToFront(noteId);
  state.pendingEditorFocusNoteId = noteId;
  prepareBoardForEditing(draft || getRenderableNote(noteId));
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

function renderHomeLanguagePicker() {
  const currentLanguage = selectedLanguageOption();
  const options = languageOptions
    .map((option) => `<option value="${option.id}" ${option.id === state.lang ? "selected" : ""}>${option.flag} ${option.code}</option>`)
    .join("");

  return `
    <label class="home-language-picker" data-role="language-picker">
      <span class="home-language-flag" aria-hidden="true">${currentLanguage.flag}</span>
      <span class="home-language-code">${currentLanguage.code}</span>
      <svg class="home-language-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <select class="home-language-select" data-action="change-language" aria-label="Language">
        ${options}
      </select>
    </label>
  `;
}

function renderHome() {
  clearHomeAmbientNotes();
  app.innerHTML = `
    <main class="home-shell">
      <div class="home-ambient-notes" data-role="home-ambient-notes" aria-hidden="true"></div>
      ${renderHomeLanguagePicker()}
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">${t("app_name")}</p>
          <h1>${t("home_title")}</h1>
        </div>
        <div class="forms-grid home-actions-grid">
          <form class="panel" data-form="join-board">
            <h2>${t("join_board")}</h2>
            <label>
              <span>${t("board_code")}</span>
              ${renderJoinCodeInputGroup("home-join-code", state.homeJoinCode, "code")}
            </label>
            <label>
              <span>${t("your_name")}</span>
              <input name="userName" maxlength="60" value="${escapeHtml(state.homeJoinUserName || state.userName)}" />
            </label>
            <div class="join-actions">
              <button type="submit">${t("join_board")}</button>
              <button
                type="button"
                class="icon-button secondary-button"
                data-action="open-admin-login"
                data-tooltip="${t("login_with_pin")}"
                aria-label="${t("login_with_pin")}"
                style="display:${isAdminLoginAvailable(state.homeJoinBoardAccess) ? "inline-flex" : "none"}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3Zm3 3a2 2 0 0 1 1 3.73V19h-2v-2.27A2 2 0 0 1 12 13Z" fill="currentColor"/></svg>
              </button>
            </div>
          </form>
          <button class="link-card-button" data-action="open-create-board-modal" type="button">
            <strong>${t("start_new_board")}</strong>
          </button>
        </div>
      </section>
      ${renderModal()}
    </main>
  `;

  app.querySelector('[data-form="join-board"]').addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await joinBoard(new FormData(event.currentTarget));
    } catch (error) {
      showToast(error.message, true);
    }
  });

  app.querySelector('[data-action="open-create-board-modal"]').addEventListener("click", () => {
    state.modal = {
      type: "new-board",
      title: t("new_board"),
      userName: state.userName || defaultUserName(),
      managementMode: false,
    };
    render();
  });

  const joinForm = app.querySelector('[data-form="join-board"]');
  const joinUserNameInput = joinForm.querySelector('input[name="userName"]');
  const adminLoginButton = joinForm.querySelector('[data-action="open-admin-login"]');

  joinUserNameInput.addEventListener("input", (event) => {
    state.homeJoinUserName = event.currentTarget.value;
  });

  adminLoginButton.addEventListener("click", () => {
    if (!isAdminLoginAvailable(state.homeJoinBoardAccess)) return;
    state.modal = {
      type: "admin-login",
      code: state.homeJoinCode,
      userName: joinUserNameInput.value.trim() || state.homeJoinUserName || state.userName,
      pin: "",
      error: "",
    };
    render();
  });

  app.querySelector('[data-action="change-language"]').addEventListener("change", async (event) => {
    await setLanguage(event.currentTarget.value);
  });

  bindCodeInputGroups();
  scheduleHomeJoinAccessLookup(state.homeJoinCode);
  bindModalHandlers();
  initializeHomeAmbientNotes();
}

function renderModal() {
  if (!state.modal) return "";

  if (state.modal.type === "set-pin") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("choose_pin_title")}</h3>
          <p>${t("choose_pin_body")}</p>
          ${renderPinInputGroup("pin-entry", state.modal.pin || "")}
          ${state.modal.error ? `<p class="modal-error">${escapeHtml(state.modal.error)}</p>` : ""}
          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="cancel-pin-flow">${t("close")}</button>
            <button type="button" data-action="submit-pin-step">${t("continue_label")}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "confirm-pin") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("confirm_pin_title")}</h3>
          <p>${t("confirm_pin_body")}</p>
          ${renderPinInputGroup("pin-confirm-entry", state.modal.confirmPin || "")}
          ${state.modal.error ? `<p class="modal-error">${escapeHtml(state.modal.error)}</p>` : ""}
          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="cancel-pin-flow">${t("close")}</button>
            <button type="button" class="secondary-button" data-action="back-pin-step">${t("back_label")}</button>
            <button type="button" data-action="confirm-pin-step">${t("save_pin")}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "admin-login") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("login_with_pin")}</h3>
          <p>${escapeHtml(state.modal.code || "")}</p>
          ${renderPinInputGroup("admin-login-modal", state.modal.pin || "")}
          ${state.modal.error ? `<p class="modal-error">${escapeHtml(state.modal.error)}</p>` : ""}
          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="cancel-pin-flow">${t("close")}</button>
            <button type="button" data-action="submit-admin-login">${t("login_with_pin")}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "direct-board-name") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("your_name")}</h3>
          <p>${t("share_code")}: ${escapeHtml(state.modal.code || "")}</p>
          <label>
            <span>${t("your_name")}</span>
            <input
              data-role="direct-board-user-name"
              maxlength="60"
              value="${escapeHtml(state.modal.userName || state.userName)}"
            />
          </label>
          ${state.modal.error ? `<p class="modal-error">${escapeHtml(state.modal.error)}</p>` : ""}
          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="cancel-direct-board">${t("close")}</button>
            <button type="button" data-action="submit-direct-board">${t("join_board")}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "new-board") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("start_new_board")}</h3>
          <form data-form="new-board-modal" class="modal-form">
            <label>
              <span>${t("board_title")}</span>
              <input name="title" maxlength="120" value="${escapeHtml(state.modal.title || t("new_board"))}" />
            </label>
            <label>
              <span>${t("your_name")}</span>
              <input name="userName" maxlength="60" value="${escapeHtml(state.modal.userName || state.userName)}" />
            </label>
            <label class="checkbox-row">
              <input type="checkbox" name="managementMode" ${state.modal.managementMode ? "checked" : ""} />
              <span>${t("supervised_mode")}</span>
            </label>
            <div class="modal-actions">
              <button type="button" class="secondary-button" data-action="close-new-board-modal">${t("close")}</button>
              <button type="submit">${t("create_board")}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "label-editor") {
    const isEditingLabel = Number.isFinite(Number(state.modal.labelId));
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${isEditingLabel ? t("edit_label") : t("create_label")}</h3>
          <form data-form="label-editor-modal" class="modal-form">
            <label>
              <span>${t("label_text")}</span>
              <input name="text" maxlength="180" value="${escapeHtml(state.modal.text || "")}" />
            </label>
            ${state.modal.error ? `<p class="modal-error">${escapeHtml(state.modal.error)}</p>` : ""}
            <div class="modal-actions">
              <button type="button" class="secondary-button" data-action="close-label-modal">${t("close")}</button>
              <button type="submit">${isEditingLabel ? t("save_label") : t("create_label")}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (state.modal.type === "line-settings") {
    return `
      <div class="app-modal-overlay" data-action="close-modal">
        <div class="panel app-modal" data-modal-root>
          <h3>${t("board_lines")}</h3>
          <form data-form="line-settings-modal" class="modal-form">
            <div class="settings-grid">
              <label>
                <span>${t("line_columns")}</span>
                <input type="number" min="0" name="lineColumns" value="${normalizedGuideCount(state.modal.lineColumns)}" />
              </label>
              <label>
                <span>${t("line_rows")}</span>
                <input type="number" min="0" name="lineRows" value="${normalizedGuideCount(state.modal.lineRows)}" />
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="secondary-button" data-action="close-line-settings">${t("close")}</button>
              <button type="submit">${t("save_settings")}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  return "";
}

function renderSettingsScreen() {
  const settings = boardSettings();
  const settingsCopy = state.lang === "nl"
      ? {
        userOptionsTitle: "Gebruikersopties",
        boardLayoutTitle: "Bord en vakken",
        boardSizeTitle: "Bordformaat",
        boardWidthShort: "Breedte",
        boardHeightShort: "Hoogte",
        maxNotesTitle: "Maximum notes per gebruiker",
        boxesTitle: "Vakken",
        boxesHorizontalShort: "Horizontaal",
        boxesVerticalShort: "Verticaal",
      }
    : {
        userOptionsTitle: "User options",
        boardLayoutTitle: "Board and sections",
        boardSizeTitle: "Board size",
        boardWidthShort: "Width",
        boardHeightShort: "Height",
        maxNotesTitle: "Maximum notes per user",
        boxesTitle: "Sections",
        boxesHorizontalShort: "Horizontal",
        boxesVerticalShort: "Vertical",
      };
  app.innerHTML = `
    <main class="home-shell settings-shell">
      <section class="hero-card settings-card">
        <div class="hero-copy settings-hero-copy">
          <div class="settings-hero-top">
            <p class="eyebrow">${t("supervised_mode")}</p>
            <h1>${escapeHtml(state.board?.title || t("new_board"))}</h1>
            <div class="settings-meta-row">
              <div class="settings-meta-pill">
                <span>${t("share_code")}</span>
                <strong>${escapeHtml(state.board?.code || "")}</strong>
              </div>
              <div class="settings-meta-actions">
                <button type="button" class="secondary-button settings-meta-button" data-action="toggle-qr" data-tooltip="${t("open_qr")}" aria-label="${t("open_qr")}">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3zM5 5v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm10-2h2v2h-2zm2 2h2v2h-2zm-4 0h2v6h-2zm6 2h2v4h-4v-2h2zm-4 0h2v2h-2z" fill="currentColor"/></svg>
                </button>
                <button type="button" class="secondary-button settings-meta-button settings-pin-button" data-action="change-pin">${t("change_pin")}</button>
              </div>
            </div>
          </div>
          <div class="modal-actions settings-actions settings-hero-actions">
            <button type="submit" form="management-settings-form">${t("open_board")}</button>
          </div>
        </div>
        <form class="panel settings-form" data-form="management-settings" id="management-settings-form">
          <div class="settings-form-grid">
            <section class="settings-composite-card settings-main-block">
              <div class="settings-block-title">${settingsCopy.userOptionsTitle}</div>
              <label class="checkbox-row settings-toggle-card">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor"/></svg></span>
                <input type="checkbox" name="allowViewerCreateNotes" ${settings.allowViewerCreateNotes ? "checked" : ""} />
                <span>${t("allow_viewer_create_notes")}</span>
              </label>
              <label class="checkbox-row settings-toggle-card">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-6.72-4.34-9.2-8.06C.63 9.74 2.24 5 6.46 5c2.13 0 3.36 1.16 4.19 2.3C11.48 6.16 12.71 5 14.84 5 19.06 5 20.67 9.74 18.2 12.94 15.72 16.66 12 21 12 21Z" fill="currentColor"/></svg></span>
                <input type="checkbox" name="likesEnabled" ${settings.likesEnabled ? "checked" : ""} />
                <span>${t("likes_enabled")}</span>
              </label>
              <label class="checkbox-row settings-toggle-card">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
                <input type="checkbox" name="allowOnlyOwnMove" ${settings.allowOnlyOwnMove ? "checked" : ""} />
                <span>${t("allow_only_own_move")}</span>
              </label>
              <label class="checkbox-row settings-toggle-card">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4zm-1 6h8v9H8z" fill="currentColor"/></svg></span>
                <input type="checkbox" name="allowOnlyOwnDelete" ${settings.allowOnlyOwnDelete ? "checked" : ""} />
                <span>${t("allow_only_own_delete")}</span>
              </label>
              <label class="checkbox-row settings-toggle-card">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4 15.5 9.9-9.9 4.5 4.5-9.9 9.9H4zm14.7-10.8 1.6-1.6a1.5 1.5 0 0 1 2.1 2.1l-1.6 1.6z" fill="currentColor"/></svg></span>
                <input type="checkbox" name="allowOnlyOwnEdit" ${settings.allowOnlyOwnEdit ? "checked" : ""} />
                <span>${t("allow_only_own_edit")}</span>
              </label>
              <label class="settings-field">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9h6v6H9z" fill="currentColor"/></svg></span>
                <span>${settingsCopy.maxNotesTitle}</span>
                <input type="number" min="0" name="maxNotesPerUser" value="${settings.maxNotesPerUser}" />
              </label>
              <label class="settings-field">
                <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 7v5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>
                <span>${t("kick_block_minutes")}</span>
                <input type="number" min="1" name="kickBlockMinutes" value="${settings.kickBlockMinutes}" />
              </label>
            </section>
            <section class="settings-composite-card settings-main-block">
              <div class="settings-block-title">${settingsCopy.boardLayoutTitle}</div>
              <div class="settings-subsection">
                <div class="settings-card-header">
                  <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
                  <div>
                    <strong>${settingsCopy.boardSizeTitle}</strong>
                  </div>
                </div>
                <div class="settings-pair-grid">
                  <label class="settings-field compact">
                    <span>${settingsCopy.boardWidthShort}</span>
                    <input type="number" min="${MIN_BOARD_COLUMNS}" name="maxBoardColumns" value="${settings.maxBoardColumns}" />
                  </label>
                  <label class="settings-field compact">
                    <span>${settingsCopy.boardHeightShort}</span>
                    <input type="number" min="${MIN_BOARD_ROWS}" name="maxBoardRows" value="${settings.maxBoardRows}" />
                  </label>
                </div>
              </div>
              <div class="settings-subsection">
                <div class="settings-card-header">
                  <span class="settings-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
                  <div>
                    <strong>${settingsCopy.boxesTitle}</strong>
                  </div>
                </div>
                <div class="settings-pair-grid">
                  <label class="settings-field compact">
                    <span>${settingsCopy.boxesHorizontalShort}</span>
                    <input type="number" min="0" name="lineColumns" value="${displayGuideCountValue(settings.lineColumns)}" />
                  </label>
                  <label class="settings-field compact">
                    <span>${settingsCopy.boxesVerticalShort}</span>
                    <input type="number" min="0" name="lineRows" value="${displayGuideCountValue(settings.lineRows)}" />
                  </label>
                </div>
              </div>
              <div class="settings-export-row settings-inline-card">
                <span class="panel-caption">${t("export_board")}</span>
                <div class="settings-export-actions">
                  <button type="button" class="secondary-button" data-action="export-board" data-format="txt">TXT</button>
                  <button type="button" class="secondary-button" data-action="export-board" data-format="csv">CSV</button>
                </div>
              </div>
            </section>
          </div>
        </form>
      </section>
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
      ${renderModal()}
    </main>
  `;

  app.querySelector('[data-form="management-settings"]').addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.settingsDraft = {
      allowViewerCreateNotes: form.get("allowViewerCreateNotes") === "on",
      likesEnabled: form.get("likesEnabled") === "on",
      allowOnlyOwnMove: form.get("allowOnlyOwnMove") === "on",
      allowOnlyOwnDelete: form.get("allowOnlyOwnDelete") === "on",
      allowOnlyOwnEdit: form.get("allowOnlyOwnEdit") === "on",
      maxNotesPerUser: Number(form.get("maxNotesPerUser") || 0),
      maxBoardColumns: Math.max(MIN_BOARD_COLUMNS, Number(form.get("maxBoardColumns") || DEFAULT_BOARD_COLUMNS)),
      maxBoardRows: Math.max(MIN_BOARD_ROWS, Number(form.get("maxBoardRows") || DEFAULT_BOARD_ROWS)),
      lineColumns: normalizedGuideCount(form.get("lineColumns") || 0),
      lineRows: normalizedGuideCount(form.get("lineRows") || 0),
      kickBlockMinutes: Number(form.get("kickBlockMinutes") || 15),
    };

    try {
      await saveManagementSettings(true);
    } catch (error) {
      showToast(error.message, true);
    }
  });

  app.querySelectorAll('[data-form="management-settings"] input[name="lineColumns"], [data-form="management-settings"] input[name="lineRows"]').forEach((input) => {
    input.addEventListener("input", () => normalizeGuideCountInput(input));
    input.addEventListener("change", () => normalizeGuideCountInput(input));
  });

  app.querySelector('[data-action="change-pin"]').addEventListener("click", () => {
    state.modal = { type: "set-pin", pin: "", confirmPin: "", locked: false };
    render();
  });

  app.querySelectorAll('[data-action="toggle-qr"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.qrModalOpen = !state.qrModalOpen;
      render();
    });
  });

  const shareOverlay = app.querySelector(".share-overlay");
  if (shareOverlay) {
    shareOverlay.addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.qrModalOpen = false;
      render();
    });
  }

  app.querySelectorAll('[data-action="close-qr"]').forEach((button) => {
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

  app.querySelectorAll('[data-action="export-board"]').forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await downloadBoardExport(button.dataset.format || "txt");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  bindModalHandlers();
}

function bindModalHandlers() {
  if (!state.modal) return;

  const root = app.querySelector("[data-modal-root]");
  if (!root) return;

  bindPinInputGroups();
  bindCodeInputGroups();
  if (state.modal.type === "set-pin") {
    focusPinDigit("pin-entry", 0);
  }
  if (state.modal.type === "confirm-pin") {
    focusPinDigit("pin-confirm-entry", 0);
  }
  if (state.modal.type === "admin-login") {
    focusPinDigit("admin-login-modal", 0);
  }
  if (state.modal.type === "direct-board-name") {
    root.querySelector('[data-role="direct-board-user-name"]')?.focus();
  }
  if (state.modal.type === "new-board") {
    root.querySelector('[data-form="new-board-modal"] input[name="title"]')?.focus();
  }
  if (state.modal.type === "label-editor") {
    root.querySelector('[data-form="label-editor-modal"] input[name="text"]')?.focus();
  }
  if (state.modal.type === "line-settings") {
    root.querySelector('[data-form="line-settings-modal"] input[name="lineColumns"]')?.focus();
  }

  app.querySelectorAll('[data-action="close-modal"]').forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      if (state.modal?.type === "direct-board-name") {
        state.modal = null;
        setRoute("");
        render();
        return;
      }
      state.modal = null;
      render();
    });
  });

  app.querySelectorAll('[data-action="cancel-pin-flow"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.modal = null;
      render();
    });
  });

  app.querySelectorAll('[data-action="cancel-direct-board"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.modal = null;
      setRoute("");
      render();
    });
  });

  app.querySelectorAll('[data-action="close-new-board-modal"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.modal = null;
      render();
    });
  });

  app.querySelectorAll('[data-action="close-label-modal"], [data-action="close-line-settings"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.modal = null;
      render();
    });
  });

  app.querySelectorAll('[data-role="direct-board-user-name"]').forEach((input) => {
    input.addEventListener("input", (event) => {
      state.modal = {
        ...state.modal,
        userName: event.currentTarget.value,
        error: "",
      };
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      app.querySelector('[data-action="submit-direct-board"]')?.click();
    });
  });

  app.querySelectorAll('[data-action="submit-direct-board"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const userName = state.modal?.userName?.toString().trim() || "";
      if (!userName) {
        state.modal = {
          ...state.modal,
          error: t("your_name"),
        };
        render();
        return;
      }

      try {
        await submitDirectBoardJoin();
      } catch (error) {
        state.modal = {
          ...state.modal,
          error: error.message,
        };
        render();
      }
    });
  });

  app.querySelectorAll('[data-form="new-board-modal"]').forEach((form) => {
    form.addEventListener("input", (event) => {
      const formData = new FormData(form);
      state.modal = {
        ...state.modal,
        title: formData.get("title")?.toString() || t("new_board"),
        userName: formData.get("userName")?.toString() || state.userName,
        managementMode: formData.get("managementMode") === "on",
      };
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await createBoard(new FormData(form));
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-form="label-editor-modal"]').forEach((form) => {
    form.addEventListener("input", () => {
      const formData = new FormData(form);
      state.modal = {
        ...state.modal,
        text: formData.get("text")?.toString() || "",
        error: "",
      };
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = normalizeLabelText(new FormData(form).get("text")?.toString() || "");
      if (!text) {
        state.modal = {
          ...state.modal,
          error: t("label_text_required"),
        };
        render();
        return;
      }

      try {
        const labelId = Number(state.modal?.labelId);
        if (Number.isFinite(labelId) && labelId > 0) {
          await saveLabelText(labelId, text);
        } else {
          await createLabel(text);
        }
        state.modal = null;
        render();
      } catch (error) {
        state.modal = {
          ...state.modal,
          error: error.message,
        };
        render();
      }
    });
  });

  app.querySelectorAll('[data-form="line-settings-modal"]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      state.settingsDraft = {
        ...boardSettings(),
        lineColumns: normalizedGuideCount(formData.get("lineColumns") || 0),
        lineRows: normalizedGuideCount(formData.get("lineRows") || 0),
      };
      state.modal = null;
      render();
    });
  });

  app.querySelectorAll('[data-action="submit-pin-step"]').forEach((button) => {
    button.addEventListener("click", () => {
      const pin = syncPinGroup("pin-entry");
      if (!/^\d{4}$/.test(pin)) {
        state.modal = {
          ...state.modal,
          pin,
          error: t("pin_invalid"),
        };
        render();
        return;
      }
      state.modal = { type: "confirm-pin", pin, confirmPin: "", error: "" };
      render();
    });
  });

  app.querySelectorAll('[data-action="back-pin-step"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.modal = { type: "set-pin", pin: state.modal?.pin || "", confirmPin: "", error: "" };
      render();
    });
  });

  app.querySelectorAll('[data-action="confirm-pin-step"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const pin = state.modal?.pin || "";
      const confirmPin = syncPinGroup("pin-confirm-entry");
      if (pin !== confirmPin) {
        state.modal = {
          ...state.modal,
          confirmPin,
          error: t("pin_mismatch"),
        };
        render();
        return;
      }
      try {
        await saveAdminPin(pin);
      } catch (error) {
        state.modal = {
          ...state.modal,
          confirmPin,
          error: error.message,
        };
        render();
      }
    });
  });

  app.querySelectorAll('[data-action="submit-admin-login"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const pin = syncPinGroup("admin-login-modal");
      if (!/^\d{4}$/.test(pin)) {
        state.modal = {
          ...state.modal,
          pin,
          error: t("pin_invalid"),
        };
        render();
        return;
      }

      try {
        await adminLogin({
          code: state.modal?.code || state.homeJoinCode,
          pin,
          userName: state.modal?.userName || state.homeJoinUserName || state.userName,
        });
        state.modal = null;
        state.homeJoinBoardAccess = null;
      } catch (error) {
        state.modal = {
          ...state.modal,
          pin,
          error: error.message,
        };
        render();
      }
    });
  });
}

function colorLabel(color) {
  return t(`color_${color}`);
}

function fontLabel(font) {
  return t(`font_${font}`);
}

function getCanvasMetrics() {
  const noteWidth = NOTE_SIZE;
  const noteHeight = NOTE_SIZE;
  const margin = 340;
  const minWidth = normalizedBoardColumns() * NOTE_SIZE;
  const minHeight = normalizedBoardRows() * NOTE_SIZE;

  if (state.notes.length === 0 && state.labels.length === 0) {
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

  state.labels.forEach((label) => {
    const metrics = labelMetrics(label);
    minX = Math.min(minX, label.x);
    minY = Math.min(minY, label.y);
    maxX = Math.max(maxX, label.x + metrics.width);
    maxY = Math.max(maxY, label.y + metrics.height);
  });

  return {
    width: Math.max(minWidth, maxX + margin),
    height: Math.max(minHeight, maxY + margin),
    bounds: { minX, minY, maxX, maxY },
  };
}

function zoomIn() {
  setZoomPreservingViewport(Math.min(2.5, state.zoom + 0.1));
}

function zoomOut() {
  setZoomPreservingViewport(Math.max(0.5, state.zoom - 0.1));
}

function fitNotesInView() {
  const viewport = document.querySelector(".board-viewport");
  const metrics = getCanvasMetrics();

  if (!viewport || (state.notes.length === 0 && state.labels.length === 0)) {
    state.zoom = 1;
    render();
    return;
  }

  const fitPadding = state.presentationMode ? 180 : 140;
  const minZoom = state.presentationMode ? 0.15 : 0.45;
  const viewportWidth = viewport.clientWidth - 64;
  const viewportHeight = viewport.clientHeight - 64;
  const notesWidth = Math.max(280, metrics.bounds.maxX - metrics.bounds.minX + fitPadding * 2);
  const notesHeight = Math.max(280, metrics.bounds.maxY - metrics.bounds.minY + fitPadding * 2);
  const nextZoom = Math.max(minZoom, Math.min(1.6, Math.min(viewportWidth / notesWidth, viewportHeight / notesHeight)));
  state.zoom = Number(nextZoom.toFixed(2));
  state.viewportFocus = {
    left: Math.max(0, (metrics.bounds.minX - fitPadding) * state.zoom),
    top: Math.max(0, (metrics.bounds.minY - fitPadding) * state.zoom),
  };
  state.viewportFocusBehavior = "instant";
  state.viewportFocusSource = null;
  render();
}

function animateFitNotesInView() {
  const viewport = document.querySelector(".board-viewport");
  const metrics = getCanvasMetrics();

  if (!viewport || (state.notes.length === 0 && state.labels.length === 0)) {
    state.zoom = 1;
    render();
    return;
  }

  const fitPadding = state.presentationMode ? 180 : 140;
  const minZoom = state.presentationMode ? 0.15 : 0.45;
  const viewportWidth = viewport.clientWidth - 64;
  const viewportHeight = viewport.clientHeight - 64;
  const notesWidth = Math.max(280, metrics.bounds.maxX - metrics.bounds.minX + fitPadding * 2);
  const notesHeight = Math.max(280, metrics.bounds.maxY - metrics.bounds.minY + fitPadding * 2);
  const targetZoom = Math.max(minZoom, Math.min(1.6, Math.min(viewportWidth / notesWidth, viewportHeight / notesHeight)));
  const targetLeft = Math.max(0, (metrics.bounds.minX - fitPadding) * targetZoom);
  const targetTop = Math.max(0, (metrics.bounds.minY - fitPadding) * targetZoom);

  state.zoom = Number(targetZoom.toFixed(2));
  state.viewportFocus = { left: targetLeft, top: targetTop };
  state.viewportFocusBehavior = "smooth";
  state.viewportFocusSource = readViewportSnapshot();
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
  state.presentationBoardVisualSource = readPresentationBoardVisualSnapshot();
  state.presentationMovedNoteIds = [];
  state.presentationEnteringNoteIds = [];
  state.presentationMode = true;
  state.qrModalOpen = false;
  state.headerExpanded = false;
  state.editingNoteId = null;
  animateFitNotesInView();
  showPresentationHint();
}

function exitPresentationMode() {
  if (!state.presentationMode) return;
  state.presentationMode = false;
  state.presentationBoardVisualSource = null;
  state.presentationMovedNoteIds = [];
  state.presentationEnteringNoteIds = [];
  render();
}

function applyViewportFocus() {
  if (!state.viewportFocus) return;
  const viewport = document.querySelector(".board-viewport");
  const panel = document.querySelector(".note-editor-panel");
  if (!viewport) return;
  const focus = state.viewportFocus;
  const delay = state.viewportFocusDelayMs || 0;
  const behavior = state.viewportFocusBehavior || "instant";
  const source = state.viewportFocusSource;
  window.setTimeout(() => {
    const previousScrollBehavior = viewport.style.scrollBehavior;
    const smoothDuration = state.presentationMode ? 2000 : 380;
    const finishFocus = () => {
      if (state.viewportAnimationFrame) {
        window.cancelAnimationFrame(state.viewportAnimationFrame);
        state.viewportAnimationFrame = null;
      }
      viewport.style.scrollBehavior = previousScrollBehavior;
      state.viewportFocus = null;
      state.viewportFocusDelayMs = 0;
      state.viewportFocusBehavior = "instant";
      state.viewportFocusSource = null;
    };
    const easeInOutCubic = (value) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - (Math.pow(-2 * value + 2, 3) / 2)
    );
    const animateViewportScroll = (start, target, duration) => {
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = easeInOutCubic(progress);
        viewport.scrollLeft = start.left + ((target.left - start.left) * eased);
        viewport.scrollTop = start.top + ((target.top - start.top) * eased);

        if (progress < 1) {
          state.viewportAnimationFrame = window.requestAnimationFrame(step);
          return;
        }

        state.viewportAnimationFrame = null;
        panel?.classList.remove("is-primed");
        finishFocus();
      };

      state.viewportAnimationFrame = window.requestAnimationFrame(step);
    };

    if (behavior === "smooth" && source) {
      viewport.style.scrollBehavior = "auto";
      viewport.scrollTo({ left: source.left, top: source.top, behavior: "instant" });
    }

    window.requestAnimationFrame(() => {
      if (behavior === "smooth") {
        viewport.classList.add("is-focus-animating");
        viewport.style.scrollBehavior = "auto";
        animateViewportScroll(
          source || { left: viewport.scrollLeft, top: viewport.scrollTop },
          focus,
          smoothDuration
        );
        window.setTimeout(() => {
          viewport.classList.remove("is-focus-animating");
        }, smoothDuration);
        return;
      }

      viewport.style.scrollBehavior = "auto";
      viewport.scrollTo({ left: focus.left, top: focus.top, behavior: "instant" });
      window.setTimeout(() => {
        viewport.scrollTo({ left: focus.left, top: focus.top, behavior: "instant" });
        panel?.classList.remove("is-primed");
        finishFocus();
      }, 80);
    });
  }, delay);
}

function captureViewportForRerender() {
  if (state.viewportFocus || state.view !== "board" || !state.board) return;
  const viewport = document.querySelector(".board-viewport");
  if (!viewport) return;
  state.viewportFocus = {
    left: viewport.scrollLeft,
    top: viewport.scrollTop,
  };
  state.viewportFocusDelayMs = 0;
  state.viewportFocusBehavior = "instant";
  state.viewportFocusSource = null;
}

function readViewportSnapshot() {
  const viewport = document.querySelector(".board-viewport");
  if (!viewport) return null;
  return {
    left: viewport.scrollLeft,
    top: viewport.scrollTop,
  };
}

function readPresentationBoardVisualSnapshot() {
  const viewport = document.querySelector(".board-viewport");
  const viewportContent = document.querySelector(".board-viewport-content");
  const canvas = document.querySelector(".board-canvas");
  const content = document.querySelector(".board-canvas-content");
  if (!viewport || !viewportContent || !canvas || !content) return null;

  return {
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
    viewportContentWidth: viewportContent.style.width,
    viewportContentHeight: viewportContent.style.height,
    canvasLeft: canvas.style.left,
    canvasTop: canvas.style.top,
    canvasWidth: canvas.style.width,
    canvasHeight: canvas.style.height,
    contentWidth: content.style.width,
    contentHeight: content.style.height,
    contentTransform: content.style.transform,
  };
}

function preparePresentationBoardVisualTransition(targetMetrics, targetZoom) {
  if (!state.presentationMode || state.viewportFocusBehavior !== "smooth") return;

  const viewport = document.querySelector(".board-viewport");
  const viewportContent = document.querySelector(".board-viewport-content");
  const canvas = document.querySelector(".board-canvas");
  const content = document.querySelector(".board-canvas-content");
  const source = state.presentationBoardVisualSource;
  if (!viewport || !viewportContent || !canvas || !content || !source) return;

  state.presentationBoardVisualSource = null;
  const viewportWidth = viewport.clientWidth || window.innerWidth;
  const viewportHeight = viewport.clientHeight || window.innerHeight;
  const targetCanvasWidthValue = Math.round(targetMetrics.width * targetZoom);
  const targetCanvasHeightValue = Math.round(targetMetrics.height * targetZoom);
  const targetViewportContentWidthValue = Math.max(viewportWidth, targetCanvasWidthValue);
  const targetViewportContentHeightValue = Math.max(viewportHeight, targetCanvasHeightValue);
  const targetCanvasWidth = `${targetCanvasWidthValue}px`;
  const targetCanvasHeight = `${targetCanvasHeightValue}px`;
  const targetViewportContentWidth = `${targetViewportContentWidthValue}px`;
  const targetViewportContentHeight = `${targetViewportContentHeightValue}px`;
  const targetCanvasLeft = `${Math.max(0, Math.round((targetViewportContentWidthValue - targetCanvasWidthValue) / 2))}px`;
  const targetCanvasTop = `${Math.max(0, Math.round((targetViewportContentHeightValue - targetCanvasHeightValue) / 2))}px`;
  const targetContentWidth = `${targetMetrics.width}px`;
  const targetContentHeight = `${targetMetrics.height}px`;
  const targetTransform = `scale(${targetZoom})`;
  const transitionDuration = "2000ms";

  viewportContent.style.transitionDuration = "0ms";
  canvas.style.transitionDuration = "0ms";
  content.style.transitionDuration = "0ms";
  viewportContent.style.width = source.viewportContentWidth || targetViewportContentWidth;
  viewportContent.style.height = source.viewportContentHeight || targetViewportContentHeight;
  canvas.style.left = source.canvasLeft || targetCanvasLeft;
  canvas.style.top = source.canvasTop || targetCanvasTop;
  canvas.style.width = source.canvasWidth || targetCanvasWidth;
  canvas.style.height = source.canvasHeight || targetCanvasHeight;
  content.style.width = source.contentWidth || targetContentWidth;
  content.style.height = source.contentHeight || targetContentHeight;
  content.style.transform = source.contentTransform || targetTransform;

  viewport.scrollLeft = source.scrollLeft ?? viewport.scrollLeft;
  viewport.scrollTop = source.scrollTop ?? viewport.scrollTop;

  canvas.getBoundingClientRect();

  window.requestAnimationFrame(() => {
    viewportContent.style.transitionDuration = transitionDuration;
    canvas.style.transitionDuration = transitionDuration;
    content.style.transitionDuration = transitionDuration;
    window.requestAnimationFrame(() => {
      viewportContent.style.width = targetViewportContentWidth;
      viewportContent.style.height = targetViewportContentHeight;
      canvas.style.left = targetCanvasLeft;
      canvas.style.top = targetCanvasTop;
      canvas.style.width = targetCanvasWidth;
      canvas.style.height = targetCanvasHeight;
      content.style.width = targetContentWidth;
      content.style.height = targetContentHeight;
      content.style.transform = targetTransform;
    });
  });
}

function applyPresentationNoteTransitions() {
  if (state.presentationLayoutCleanupTimer) {
    window.clearTimeout(state.presentationLayoutCleanupTimer);
    state.presentationLayoutCleanupTimer = null;
  }

  const movedNoteIds = new Set(state.presentationMovedNoteIds || []);
  const enteringNoteIds = new Set(state.presentationEnteringNoteIds || []);
  state.presentationMovedNoteIds = [];
  state.presentationEnteringNoteIds = [];

  if (!state.presentationMode || (!movedNoteIds.size && !enteringNoteIds.size)) {
    return;
  }

  const movedNotes = [];
  const enteringNotes = [];

  document.querySelectorAll(".sticky-note").forEach((element) => {
    const noteId = Number(element.dataset.id);
    if (movedNoteIds.has(noteId)) {
      element.classList.add("is-layout-animating");
      movedNotes.push(element);
    } else if (enteringNoteIds.has(noteId)) {
      element.classList.add("is-layout-entering");
      enteringNotes.push(element);
    }
  });

  if (!movedNotes.length && !enteringNotes.length) {
    return;
  }

  state.presentationLayoutCleanupTimer = window.setTimeout(() => {
    movedNotes.forEach((element) => {
      element.classList.remove("is-layout-animating");
    });
    enteringNotes.forEach((element) => {
      element.classList.remove("is-layout-entering");
    });
    state.presentationLayoutCleanupTimer = null;
  }, 1000);
}

function syncEditorPanel() {
  const panel = document.querySelector(".note-editor-panel");
  if (!panel) return;

  const note = editingNote();
  panel.classList.toggle("is-hidden", !note);
  panel.classList.toggle("is-collapsed-mobile", Boolean(
    note
    && isCompactViewport()
    && !state.mobileEditorToolsOpen
  ));
  if (!note) return;

  panel.querySelectorAll("[data-action='color']").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === note.color);
  });
  panel.querySelectorAll("[data-action='set-font-size']").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.value) === displayedEditorFontSize(note));
  });

  const fontSelect = panel.querySelector('[data-role="font-family"]');
  const boldButton = panel.querySelector('[data-action="toggle-bold"]');
  const italicButton = panel.querySelector('[data-action="toggle-italic"]');
  const underlineButton = panel.querySelector('[data-action="toggle-underline"]');

  if (fontSelect) fontSelect.value = note.fontFamily;
  const editor = getSelectedNoteEditor();
  const formatting = editor && Number(editor.dataset.id) === note.id
    ? selectionFormattingState(editor, note)
    : null;
  if (boldButton) boldButton.classList.toggle("active", formatting?.isBold ?? note.isBold);
  if (italicButton) italicButton.classList.toggle("active", formatting?.isItalic ?? note.isItalic);
  if (underlineButton) underlineButton.classList.toggle("active", formatting?.isUnderline ?? note.isUnderline);
}

function projectedEditingNoteRect(surfaceRect, note, focusLeft, focusTop) {
  if (!note) return null;

  const noteScale = state.editingNoteId === note.id
    ? editingNoteScale() * (isLocalNoteId(note.id) ? 1.02 : 1)
    : 1;
  const width = NOTE_SIZE * noteScale * state.zoom;
  const height = NOTE_SIZE * noteScale * state.zoom;
  const left = (note.x * state.zoom) - focusLeft;
  const top = (note.y * state.zoom) - focusTop;

  return {
    left: surfaceRect.left + left,
    right: surfaceRect.left + left + width,
    top: surfaceRect.top + top,
    bottom: surfaceRect.top + top + height,
    width,
    height,
  };
}

function updateEditorPanelPosition() {
  const panel = document.querySelector(".note-editor-panel");
  if (!panel || panel.classList.contains("is-hidden")) return;
  const panelSection = panel.querySelector(".panel-section");
  if (!panelSection) return;

  if (window.matchMedia("(max-width: 980px)").matches) {
    panelSection.style.left = "";
    panelSection.style.top = "";
    panelSection.style.right = "";
    panelSection.style.bottom = "";
    panelSection.style.maxHeight = "";
    return;
  }

  const noteId = state.editingNoteId;
  const activeNote = noteId !== null ? document.querySelector(`.sticky-note[data-id="${noteId}"]`) : null;
  const boardSurface = document.querySelector(".board-surface");
  const boardViewport = document.querySelector(".board-viewport");
  if (!boardSurface || !boardViewport) return;

  const surfaceRect = boardSurface.getBoundingClientRect();
  const viewportRect = boardViewport.getBoundingClientRect();
  const panelRect = panelSection.getBoundingClientRect();
  const gap = 18;
  const edgePadding = 16;
  const panelWidth = panelRect.width || 320;
  const panelHeight = panelRect.height || 260;
  const editingNoteData = noteId !== null ? editingNote() : null;
  const shouldUseProjectedRect = Boolean(state.viewportFocus)
    && state.viewportFocusBehavior === "smooth"
    && (panel.classList.contains("is-primed") || document.querySelector(".board-viewport")?.classList.contains("is-focus-animating"))
    && editingNoteData;
  const noteRect = shouldUseProjectedRect
    ? projectedEditingNoteRect(surfaceRect, editingNoteData, state.viewportFocus.left, state.viewportFocus.top)
    : activeNote?.getBoundingClientRect();
  if (!noteRect) return;

  let left = noteRect.right + gap;
  if (left + panelWidth > viewportRect.right - edgePadding) {
    left = noteRect.left - panelWidth - gap;
  }
  left = Math.max(
    viewportRect.left + edgePadding,
    Math.min(left, viewportRect.right - panelWidth - edgePadding)
  );

  let top = noteRect.top + ((noteRect.height - panelHeight) / 2);
  top = Math.max(
    viewportRect.top + 72,
    Math.min(top, viewportRect.bottom - panelHeight - edgePadding)
  );

  panelSection.style.left = `${Math.round(left)}px`;
  panelSection.style.top = `${Math.round(top)}px`;
  panelSection.style.right = "auto";
  panelSection.style.bottom = "auto";
}

function restoreViewportBeforeSmoothFocus() {
  if (!state.viewportFocus || state.viewportFocusBehavior !== "smooth" || !state.viewportFocusSource) {
    return;
  }

  const viewport = document.querySelector(".board-viewport");
  if (!viewport) return;

  const previousScrollBehavior = viewport.style.scrollBehavior;
  viewport.style.scrollBehavior = "auto";
  viewport.scrollLeft = state.viewportFocusSource.left;
  viewport.scrollTop = state.viewportFocusSource.top;
  viewport.style.scrollBehavior = previousScrollBehavior;
}

function renderBoardGuideOverlay(metrics) {
  const lineColumns = normalizedGuideCount(boardSettings().lineColumns);
  const lineRows = normalizedGuideCount(boardSettings().lineRows);
  if (lineColumns <= 0 && lineRows <= 0) {
    return "";
  }

  const columnLines = Array.from({ length: Math.max(0, lineColumns - 1) }, (_entry, index) => {
    const position = (((index + 1) / lineColumns) * 100).toFixed(4);
    return `<div class="board-guide-line vertical" style="left:${position}%;" aria-hidden="true"></div>`;
  }).join("");
  const rowLines = Array.from({ length: Math.max(0, lineRows - 1) }, (_entry, index) => {
    const position = (((index + 1) / lineRows) * 100).toFixed(4);
    return `<div class="board-guide-line horizontal" style="top:${position}%;" aria-hidden="true"></div>`;
  }).join("");

  return `
    <div
      class="board-guide-grid ${lineColumns > 0 ? "has-columns" : ""} ${lineRows > 0 ? "has-rows" : ""}"
      aria-hidden="true"
      style="width:${metrics.width}px; height:${metrics.height}px;"
    >${columnLines}${rowLines}</div>
  `;
}

function renderBoardLabel(label) {
  const selected = state.selectedLabelId === label.id;
  const labelCanEdit = canEditLabel(label);
  const labelCanDelete = canDeleteLabel(label);
  const fontSize = normalizedLabelFontSize(label.fontSize);

  return `
    <div
      class="board-label ${selected ? "selected" : ""}"
      data-label-id="${label.id}"
      style="left:${label.x}px; top:${label.y}px; z-index:${label.zIndex}; --label-font-size:${fontSize}px;"
    >
      <div class="board-label-text">${escapeHtml(label.text)}</div>
      ${selected ? `
        <div class="board-label-actions">
          ${labelCanEdit ? `
            <button
              class="board-label-action"
              type="button"
              data-action="decrease-label-size"
              data-id="${label.id}"
              data-tooltip="${t("decrease_font_size")}"
              aria-label="${t("decrease_font_size")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            </button>
            <button
              class="board-label-action"
              type="button"
              data-action="increase-label-size"
              data-id="${label.id}"
              data-tooltip="${t("increase_font_size")}"
              aria-label="${t("increase_font_size")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            </button>
          ` : ""}
          ${labelCanEdit ? `
            <button
              class="board-label-action"
              type="button"
              data-action="edit-label"
              data-id="${label.id}"
              data-tooltip="${t("edit_label")}"
              aria-label="${t("edit_label")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 15.5 9.9-9.9 4.5 4.5-9.9 9.9H4zm14.7-10.8 1.6-1.6a1.5 1.5 0 0 1 2.1 2.1l-1.6 1.6z" fill="currentColor"/></svg>
            </button>
          ` : ""}
          ${labelCanDelete ? `
            <button
              class="board-label-action"
              type="button"
              data-action="delete-label"
              data-id="${label.id}"
              data-tooltip="${t("delete_label")}"
              aria-label="${t("delete_label")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.41 5 12 10.59 17.59 5 19 6.41 13.41 12 19 17.59 17.59 19 12 13.41 6.41 19 5 17.59 10.59 12 5 6.41z" fill="currentColor"/></svg>
            </button>
          ` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function renderBoard() {
  const note = editingNote();
  const metrics = getCanvasMetrics();
  const viewportSize = getBoardViewportSize();
  const canvasWidth = Math.round(metrics.width * state.zoom);
  const canvasHeight = Math.round(metrics.height * state.zoom);
  const viewportLayout = computeBoardViewportLayout(state.zoom, viewportSize.width, viewportSize.height);
  const viewportContentWidth = viewportLayout.viewportContentWidth;
  const viewportContentHeight = viewportLayout.viewportContentHeight;
  const canvasOffsetX = viewportLayout.canvasOffsetX;
  const canvasOffsetY = viewportLayout.canvasOffsetY;
  const boardLabel = `${state.board.title} - ${state.userName}`;
  const hasUnsavedNewNote = state.notes.some((entry) => isLocalNoteId(entry.id));
  const canShowQr = !isManagementBoard(state.board) || isAdmin();
  const isEditingBoard = Boolean(note);
  const boardActionDisabled = isEditingBoard ? "disabled" : "";
  const editorPanelClass = [
    "note-editor-panel",
    note ? "" : "is-hidden",
    note && isCompactViewport() && !state.mobileEditorToolsOpen ? "is-collapsed-mobile" : "",
    note && state.viewportFocus && state.viewportFocusBehavior === "smooth" ? "is-primed" : "",
  ].filter(Boolean).join(" ");
  app.innerHTML = `
    <div class="board-layout ${state.presentationMode ? "presentation-mode" : ""} ${hasUnsavedNewNote ? "has-unsaved-new-note" : ""} ${isEditingBoard ? "is-editing-note" : ""}">
      <main class="board-main">
        <div class="board-surface">
          <div class="board-viewport">
            <div class="board-viewport-content" style="width:${viewportContentWidth}px; height:${viewportContentHeight}px;">
              <div class="board-canvas" style="left:${canvasOffsetX}px; top:${canvasOffsetY}px; width:${canvasWidth}px; height:${canvasHeight}px;">
                <div class="board-canvas-content" style="width:${metrics.width}px; height:${metrics.height}px; transform:scale(${state.zoom});">
                  ${renderBoardGuideOverlay(metrics)}
                  ${state.labels.map(renderBoardLabel).join("")}
                  ${state.notes.map(renderNoteCard).join("")}
                  ${state.notes.length === 0 && state.labels.length === 0 ? `<div class="empty-state">${t("empty_board")}</div>` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <header class="floating-bar">
        <div class="board-title-shell">
          <div class="board-title-row">
            <button
              class="brand-block board-title-pill"
              data-action="toggle-header"
              type="button"
              aria-expanded="${state.headerExpanded ? "true" : "false"}"
              data-tooltip="${t("edit_board_meta")}"
              ${boardActionDisabled}
            >
              <span class="board-title-pill-text">${escapeHtml(boardLabel)}</span>
            </button>
            ${canShowQr ? `
              <button class="icon-button board-share-button" data-action="toggle-qr" type="button" data-tooltip="${t("open_qr")}" aria-label="${t("open_qr")}" ${boardActionDisabled}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3zM5 5v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm10-2h2v2h-2zm2 2h2v2h-2zm-4 0h2v6h-2zm6 2h2v4h-4v-2h2zm-4 0h2v2h-2z" fill="currentColor"/></svg>
              </button>
            ` : ""}
          </div>
          ${state.headerExpanded ? `
            <div class="brand-block board-title-editor">
              <label>
                <span>${t("board_title")}</span>
                <input class="board-title-input" data-role="board-title" maxlength="120" value="${escapeHtml(state.board.title)}" ${isEditingBoard ? "disabled" : ""} />
              </label>
              <label>
                <span>${t("your_name")}</span>
                <input data-role="user-name" maxlength="60" value="${escapeHtml(state.userName)}" ${isEditingBoard ? "disabled" : ""} />
              </label>
            </div>
          ` : ""}
        </div>
        <div class="floating-tools">
          <button class="icon-button" data-action="home" type="button" data-tooltip="${t("back_home")}" aria-label="${t("back_home")}" ${boardActionDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="zoom-out" type="button" data-tooltip="${t("zoom_out")}" aria-label="${t("zoom_out")}" ${boardActionDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.87 10.58l4.27 4.27 1.41-1.41-4.27-4.27A6 6 0 0 0 10 4Zm-3 6h6v2H7z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="zoom-in" type="button" data-tooltip="${t("zoom_in")}" aria-label="${t("zoom_in")}" ${boardActionDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.87 10.58l4.27 4.27 1.41-1.41-4.27-4.27A6 6 0 0 0 10 4Zm-1 3h2v2h2v2h-2v2H9v-2H7V9h2z" fill="currentColor"/></svg>
          </button>
          <button class="icon-button" data-action="fit-notes" type="button" data-tooltip="${t("fit_notes")}" aria-label="${t("fit_notes")}" ${boardActionDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3zm10-5h5v5h-2V6h-3zM6 15v3h3v2H4v-5zm11 0h2v5h-5v-2h3z" fill="currentColor"/></svg>
          </button>
          ${canManageLabels() ? `
            <button class="icon-button" data-action="add-label" type="button" data-tooltip="${canCreateNotes() ? t("add_label") : t("users_cannot_add_notes")}" aria-label="${t("add_label")}" ${canCreateNotes() && !isEditingBoard ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor"/></svg>
            </button>
          ` : ""}
          ${canOpenAdminLoginOnBoard() ? `
            <button class="icon-button" data-action="open-board-admin-login" type="button" data-tooltip="${t("login_with_pin")}" aria-label="${t("login_with_pin")}" ${boardActionDisabled}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3Zm3 3a2 2 0 0 1 1 3.73V19h-2v-2.27A2 2 0 0 1 12 13Z" fill="currentColor"/></svg>
            </button>
          ` : ""}
          ${isAdmin() ? `
            <button class="icon-button" data-action="open-settings" type="button" data-tooltip="${t("save_settings")}" aria-label="${t("save_settings")}" ${boardActionDisabled}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor"/></svg>
            </button>
          ` : ""}
          ${isAdmin() ? `
            <button class="icon-button" data-action="toggle-users" type="button" data-tooltip="${t("manage_users")}" aria-label="${t("manage_users")}" ${boardActionDisabled}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Zm-8 0c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5Z" fill="currentColor"/></svg>
            </button>
          ` : ""}
          <button class="icon-button presentation-mode-button" data-action="presentation-mode" type="button" data-tooltip="${t("presentation_mode")}" aria-label="${t("presentation_mode")}" ${boardActionDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H4zm2 2v6h12V7zm4 10h4v2h-4z" fill="currentColor"/></svg>
          </button>
        </div>
      </header>
      <button class="add-note-fab" data-action="add-note" type="button" data-tooltip="${canCreateNotes() ? t("add_note") : t("users_cannot_add_notes")}" aria-label="${t("add_note")}" ${canCreateNotes() && !isEditingBoard ? "" : "disabled"}>
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
      <button class="trash-zone" type="button" data-tooltip="${t("trash_note")}" aria-label="${t("trash_note")}" ${boardActionDisabled}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 9h2v8H7zm1 11a2 2 0 0 1-2-2V8h12v10a2 2 0 0 1-2 2z" fill="currentColor"/></svg>
      </button>
      <aside class="${editorPanelClass}">
        <div class="panel-section">
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
            <div class="font-size-presets" role="group" aria-label="${t("font_size")}">
              ${NOTE_FONT_SIZE_PRESETS.map((fontSize) => `
                <button
                  class="font-size-preset ${displayedEditorFontSize(note) === fontSize ? "active" : ""}"
                  data-action="set-font-size"
                  data-value="${fontSize}"
                  data-tooltip="${fontSize}px"
                  aria-label="${fontSize}px"
                  type="button"
                  style="font-size:${Math.max(12, Math.round(fontSize * 0.62))}px;"
                >
                  A
                </button>
              `).join("")}
            </div>
          </label>
          <div class="toolbar-row text-format-tools">
            <button class="${note?.isBold ? "active" : ""}" data-action="toggle-bold" type="button">B</button>
            <button class="${note?.isItalic ? "active" : ""}" data-action="toggle-italic" type="button"><em>I</em></button>
            <button class="${note?.isUnderline ? "active" : ""}" data-action="toggle-underline" type="button"><u>U</u></button>
          </div>
        </div>
      </aside>
      ${renderUsersPanel()}
      ${renderModal()}
    </div>
  `;

  preparePresentationBoardVisualTransition(metrics, state.zoom);
  restoreViewportBeforeSmoothFocus();
  applyViewportFocus();
  applyPresentationNoteTransitions();
  window.requestAnimationFrame(() => {
    focusPendingEditor();
    updateEditorPanelPosition();
    if (state.viewportFocus || state.viewportFocusDelayMs > 0) {
      window.setTimeout(() => {
        updateEditorPanelPosition();
        alignNewEditingNoteWithPanel();
      }, (state.viewportFocusDelayMs || 0) + 140);
      return;
    }
    alignNewEditingNoteWithPanel();
  });

  const boardViewport = app.querySelector(".board-viewport");
  if (boardViewport) {
    const activeTouchPointers = new Map();
    let pinchZoom = null;
    const viewportContent = app.querySelector(".board-viewport-content");
    const boardCanvas = app.querySelector(".board-canvas");
    const boardContent = app.querySelector(".board-canvas-content");
    const blockedInteractiveSelector = ".floating-bar, .floating-tools, .note-editor-panel, .share-overlay, .users-panel, .app-modal-overlay";
    const blockedBoardPanSelector = `.sticky-note, .board-label, ${blockedInteractiveSelector}`;

    const releaseCurrentInteraction = () => {
      if (state.boardPan?.pointerId !== undefined && boardViewport.hasPointerCapture?.(state.boardPan.pointerId)) {
        try {
          boardViewport.releasePointerCapture(state.boardPan.pointerId);
        } catch (_error) {
          // Ignore release failures for synthetic or already-ended pointers.
        }
      }
      state.boardPan = null;
      state.drag = null;
      boardViewport.classList.remove("is-panning");
    };

    const updateTrackedTouchPointer = (event) => {
      if (event.pointerType !== "touch") return false;
      if (event.target.closest(blockedInteractiveSelector)) return false;
      activeTouchPointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      return true;
    };

    const clearTrackedTouchPointer = (pointerId) => {
      activeTouchPointers.delete(pointerId);
      if (activeTouchPointers.size < 2 && pinchZoom) {
        const finalZoom = roundZoomValue(pinchZoom.currentZoom);
        const finalScrollLeft = Math.round(boardViewport.scrollLeft);
        const finalScrollTop = Math.round(boardViewport.scrollTop);
        pinchZoom = null;
        boardViewport.classList.remove("is-pinching");
        state.zoom = finalZoom;
        state.viewportFocus = {
          left: finalScrollLeft,
          top: finalScrollTop,
        };
        state.viewportFocusDelayMs = 0;
        state.viewportFocusBehavior = "instant";
        state.viewportFocusSource = null;
        render();
      }
    };

    const touchPointers = () => [...activeTouchPointers.values()];
    const touchDistance = (first, second) => Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    const touchMidpoint = (first, second, rect) => ({
      x: ((first.clientX + second.clientX) / 2) - rect.left,
      y: ((first.clientY + second.clientY) / 2) - rect.top,
    });

    const maybeStartPinchZoom = () => {
      if (!isCompactViewport() || state.editingNoteId || pinchZoom || activeTouchPointers.size < 2) return;
      const [first, second] = touchPointers();
      const viewportRect = boardViewport.getBoundingClientRect();
      const startMidpoint = touchMidpoint(first, second, viewportRect);
      const startDistance = touchDistance(first, second);
      if (!Number.isFinite(startDistance) || startDistance < 12) return;

      releaseCurrentInteraction();
      pinchZoom = {
        startZoom: state.zoom,
        currentZoom: state.zoom,
        startDistance,
        viewportRect,
        logicalMidpointX: (boardViewport.scrollLeft + startMidpoint.x) / state.zoom,
        logicalMidpointY: (boardViewport.scrollTop + startMidpoint.y) / state.zoom,
      };
      boardViewport.classList.add("is-pinching");
    };

    const updatePinchZoom = () => {
      if (!pinchZoom || activeTouchPointers.size < 2) return;
      const [first, second] = touchPointers();
      const currentDistance = touchDistance(first, second);
      if (!Number.isFinite(currentDistance) || currentDistance <= 0) return;

      const midpoint = touchMidpoint(first, second, pinchZoom.viewportRect);
      const nextZoom = clampValue(
        pinchZoom.startZoom * (currentDistance / pinchZoom.startDistance),
        0.5,
        2.5
      );
      pinchZoom.currentZoom = nextZoom;

      const nextScrollLeft = (pinchZoom.logicalMidpointX * nextZoom) - midpoint.x;
      const nextScrollTop = (pinchZoom.logicalMidpointY * nextZoom) - midpoint.y;
      applyBoardViewportVisualLayout({
        zoom: nextZoom,
        scrollLeft: nextScrollLeft,
        scrollTop: nextScrollTop,
        viewport: boardViewport,
        viewportContent,
        canvas: boardCanvas,
        content: boardContent,
      });
    };

    boardViewport.addEventListener("scroll", () => {
      updateEditorPanelPosition();
    }, { passive: true });

    boardViewport.addEventListener("pointerdown", (event) => {
      const trackedTouch = updateTrackedTouchPointer(event);
      if (trackedTouch) {
        maybeStartPinchZoom();
        if (pinchZoom) {
          event.preventDefault();
          return;
        }
      }
      if (event.button !== 0) return;
      if (state.editingNoteId) return;
      if (event.target.closest(blockedBoardPanSelector)) return;
      event.preventDefault();
      state.boardPan = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: boardViewport.scrollLeft,
        scrollTop: boardViewport.scrollTop,
        moved: false,
      };
      try {
        boardViewport.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Synthetic pointer events used by tests do not support capture.
      }
      boardViewport.classList.add("is-panning");
    });

    boardViewport.addEventListener("pointermove", (event) => {
      const trackedTouch = updateTrackedTouchPointer(event);
      if (trackedTouch && pinchZoom) {
        event.preventDefault();
        updatePinchZoom();
        return;
      }
      if (!state.boardPan || state.boardPan.pointerId !== event.pointerId) return;
      event.preventDefault();
      const deltaX = event.clientX - state.boardPan.startX;
      const deltaY = event.clientY - state.boardPan.startY;
      const threshold = dragIntentThreshold(state.boardPan.pointerType);
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        state.boardPan.moved = true;
      }
      boardViewport.scrollLeft = state.boardPan.scrollLeft - deltaX;
      boardViewport.scrollTop = state.boardPan.scrollTop - deltaY;
    });

    const endBoardPan = (event) => {
      if (event?.pointerType === "touch") {
        clearTrackedTouchPointer(event.pointerId);
      }
      if (!state.boardPan) return;
      if (event && state.boardPan.pointerId !== event.pointerId) return;
      if (state.boardPan.moved) {
        state.lastBoardPanEndedAt = Date.now();
      }
      if (event && boardViewport.hasPointerCapture?.(event.pointerId)) {
        try {
          boardViewport.releasePointerCapture(event.pointerId);
        } catch (_error) {
          // Ignore release failures for synthetic or already-ended pointers.
        }
      }
      state.boardPan = null;
      boardViewport.classList.remove("is-panning");
    };

    boardViewport.addEventListener("pointerup", endBoardPan);
    boardViewport.addEventListener("pointercancel", endBoardPan);
    boardViewport.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") {
        clearTrackedTouchPointer(event.pointerId);
      }
    });

    boardViewport.addEventListener("wheel", (event) => {
      if (state.boardPan) return;
      if (state.editingNoteId) return;
      if (event.ctrlKey || event.metaKey) return;
      if (event.target.closest(".floating-bar, .floating-tools, .note-editor-panel, .share-overlay, .users-panel, .app-modal-overlay")) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      const direction = Math.sign(event.deltaY);
      if (!direction) return;

      event.preventDefault();
      const nextZoom = clampValue(state.zoom + (direction < 0 ? 0.1 : -0.1), 0.5, 2.5);
      setZoomAroundViewportPoint(nextZoom, event.clientX, event.clientY);
      showZoomIndicator(`${Math.round(state.zoom * 100)}%`);
    }, { passive: false });
  }

  window.addEventListener("resize", updateEditorPanelPosition, { once: true });

  app.querySelector('[data-action="home"]').addEventListener("click", () => {
    if (state.board?.code) {
      persistAdminToken(state.board.code, null);
    }
    state.view = "home";
    state.board = null;
    state.notes = [];
    state.labels = [];
    state.members = [];
    state.settingsDraft = null;
    state.selectedNoteId = null;
    state.selectedLabelId = null;
    state.editingNoteId = null;
    state.qrModalOpen = false;
    state.usersPanelOpen = false;
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

  app.querySelector('[data-action="add-label"]')?.addEventListener("click", () => {
    state.modal = {
      type: "label-editor",
      labelId: null,
      text: "",
      error: "",
    };
    render();
  });

  app.querySelectorAll('[data-action="toggle-qr"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.qrModalOpen = !state.qrModalOpen;
      render();
    });
  });

  app.querySelector('[data-action="zoom-in"]').addEventListener("click", () => {
    zoomIn();
    showZoomIndicator(`${Math.round(state.zoom * 100)}%`);
  });
  app.querySelector('[data-action="zoom-out"]').addEventListener("click", () => {
    zoomOut();
    showZoomIndicator(`${Math.round(state.zoom * 100)}%`);
  });
  app.querySelector('[data-action="fit-notes"]').addEventListener("click", () => {
    fitNotesInView();
    window.setTimeout(() => {
      showZoomIndicator(`${Math.round(state.zoom * 100)}%`);
    }, 0);
  });
  app.querySelector('[data-action="presentation-mode"]').addEventListener("click", () => {
    enterPresentationMode();
  });

  app.querySelectorAll('[data-action="toggle-users"]').forEach((usersToggle) => {
    usersToggle.addEventListener("click", () => {
      state.usersPanelOpen = !state.usersPanelOpen;
      render();
    });
  });

  app.querySelectorAll('[data-action="open-board-admin-login"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isManagementBoard(state.board) || isAdmin()) return;
      state.modal = {
        type: "admin-login",
        code: state.board.code,
        userName: state.userName,
        pin: "",
        error: "",
      };
      render();
    });
  });

  app.querySelectorAll('[data-action="open-settings"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.settingsDraft = { ...state.board.settings };
      state.view = "settings";
      state.usersPanelOpen = false;
      render();
    });
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

  app.querySelectorAll('.note-editor-panel [data-action="set-font-size"], .note-editor-panel [data-action="toggle-bold"], .note-editor-panel [data-action="toggle-italic"], .note-editor-panel [data-action="toggle-underline"]').forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (!editingNote()) return;
      event.preventDefault();
    });
    button.addEventListener("mousedown", (event) => {
      if (!editingNote()) return;
      event.preventDefault();
    });
  });

  app.querySelectorAll('.note-editor-panel [data-action="set-font-size"]').forEach((button) => {
    button.addEventListener("click", () => {
      if (!editingNote()) return;
      applyNoteFontSize(Number(button.dataset.value));
    });
  });

  app.querySelector('.note-editor-panel [data-action="toggle-bold"]').addEventListener("click", () => {
    applyNoteTextFormat("bold", "isBold");
  });

  app.querySelector('.note-editor-panel [data-action="toggle-italic"]').addEventListener("click", () => {
    applyNoteTextFormat("italic", "isItalic");
  });

  app.querySelector('.note-editor-panel [data-action="toggle-underline"]').addEventListener("click", () => {
    applyNoteTextFormat("underline", "isUnderline");
  });

  app.querySelector(".board-surface").addEventListener("click", (event) => {
    if (event.target.closest(".sticky-note, .board-label")) return;
    if (event.target.closest(".floating-bar, .floating-tools, .note-editor-panel, .share-overlay, .users-panel, .app-modal-overlay")) return;
    if (Date.now() - state.lastBoardPanEndedAt < 120) return;
    if (state.editingNoteId) return;
    if (state.selectedNoteId === null && state.selectedLabelId === null) return;
    state.editingNoteId = null;
    state.selectedNoteId = null;
    state.selectedLabelId = null;
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
    const inlineCancel = element.querySelector('[data-action="cancel-note-inline"]');
    const inlineFormatToggle = element.querySelector('[data-action="toggle-mobile-editor-tools"]');
    const isUnsavedNewNote = isLocalNoteId(noteId);

    element.addEventListener("pointerdown", (event) => {
      if (state.presentationMode) return;
      if (isUnsavedNewNote) return;
      if (state.editingNoteId === noteId) return;
      if (
        event.target.closest('[data-role="note-editor"]')
        || event.target.closest('[data-action="save-note-inline"]')
        || event.target.closest('[data-action="toggle-like"]')
      ) return;
      const activeNote = getRenderableNote(noteId);
      if (!activeNote) return;
      if (!canMoveNote(activeNote)) {
        state.selectedNoteId = noteId;
        state.selectedLabelId = null;
        if (!state.editingNoteId && canEditNote(activeNote)) {
          openNoteEditor(noteId);
        } else {
          render();
        }
        return;
      }
      state.selectedNoteId = noteId;
      state.selectedLabelId = null;
      state.editingNoteId = null;
      bringToFront(noteId);
      element.style.zIndex = String(getRenderableNote(noteId)?.zIndex || activeNote.zIndex);
      state.drag = {
        type: "note",
        id: noteId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        originX: activeNote.x,
        originY: activeNote.y,
        moved: false,
      };
      element.setPointerCapture(event.pointerId);
    });

    element.addEventListener("pointermove", (event) => {
      if (!state.drag || state.drag.type !== "note" || state.drag.id !== noteId) return;
      const deltaX = (event.clientX - state.drag.startX) / state.zoom;
      const deltaY = (event.clientY - state.drag.startY) / state.zoom;
      const threshold = dragIntentThreshold(state.drag.pointerType) / state.zoom;
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
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
      if (!state.drag || state.drag.type !== "note" || state.drag.id !== noteId) return;
      const moved = state.drag.moved;
      const movingNote = state.editingNoteId === noteId ? ensureDraft(noteId) : getNoteById(noteId);
      state.drag = null;
      if (moved) {
        state.lastDraggedNoteId = noteId;
        state.lastDragEndedAt = Date.now();
      }
      if (moved && isPointerOverTrashZone(event)) {
        if (!canDeleteNote(movingNote)) {
          showToast(t("delete_not_allowed"), true);
          render();
          return;
        }
        deleteNote(noteId).catch((error) => showToast(error.message, true));
        return;
      }
      if (moved && movingNote && state.editingNoteId !== noteId) {
        saveNoteDebounced(movingNote);
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
        if (!canEditNote(getRenderableNote(noteId))) {
          state.selectedNoteId = noteId;
          state.selectedLabelId = null;
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
        state.selectedLabelId = null;
        state.editingNoteId = noteId;
        ensureDraft(noteId);
        bringToFront(noteId);
        if (state.editorInlineFontSizePreview?.noteId === noteId) {
          state.editorInlineFontSizePreview = null;
        }
        rememberEditorSelection(editor);
        syncEditorPanel();
      });

      editor.addEventListener("input", (event) => {
        const draft = ensureDraft(noteId);
        if (!draft) return;
        draft.content = sanitizeRichText(event.currentTarget.innerHTML);
        draft.author = state.userName;
        if (state.editorInlineFontSizePreview?.noteId === noteId) {
          state.editorInlineFontSizePreview = null;
        }
        rememberEditorSelection(editor);
        syncEditorPanel();
      });

      editor.addEventListener("keyup", () => {
        if (state.editorInlineFontSizePreview?.noteId === noteId) {
          state.editorInlineFontSizePreview = null;
        }
        rememberEditorSelection(editor);
        syncEditorPanel();
      });

      editor.addEventListener("mouseup", () => {
        if (state.editorInlineFontSizePreview?.noteId === noteId) {
          state.editorInlineFontSizePreview = null;
        }
        rememberEditorSelection(editor);
        syncEditorPanel();
      });

      editor.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          exitNoteEditing(noteId);
          return;
        }
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

    if (inlineCancel) {
      inlineCancel.addEventListener("click", () => {
        cancelNote(noteId);
      });
    }

    if (inlineFormatToggle) {
      inlineFormatToggle.addEventListener("click", () => {
        if (state.editingNoteId !== noteId) return;
        state.mobileEditorToolsOpen = !state.mobileEditorToolsOpen;
        state.pendingEditorFocusNoteId = noteId;
        render();
      });
    }
  });

  app.querySelectorAll(".board-label").forEach((element) => {
    const labelId = Number(element.dataset.labelId);

    element.addEventListener("pointerdown", (event) => {
      if (state.presentationMode) return;
      if (state.editingNoteId) return;
      if (event.target.closest("[data-action='edit-label'], [data-action='delete-label'], [data-action='increase-label-size'], [data-action='decrease-label-size']")) return;
      const activeLabel = getLabelById(labelId);
      if (!activeLabel) return;

      state.selectedLabelId = labelId;
      state.selectedNoteId = null;
      if (!canMoveLabel(activeLabel)) {
        render();
        return;
      }

      bringLabelToFront(labelId);
      element.style.zIndex = String(getLabelById(labelId)?.zIndex || activeLabel.zIndex);
      state.drag = {
        type: "label",
        id: labelId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        originX: activeLabel.x,
        originY: activeLabel.y,
        moved: false,
      };
      element.setPointerCapture(event.pointerId);
    });

    element.addEventListener("pointermove", (event) => {
      if (!state.drag || state.drag.type !== "label" || state.drag.id !== labelId) return;
      const movingLabel = getLabelById(labelId);
      if (!movingLabel) return;
      const metrics = labelMetrics(movingLabel);
      const deltaX = (event.clientX - state.drag.startX) / state.zoom;
      const deltaY = (event.clientY - state.drag.startY) / state.zoom;
      const threshold = dragIntentThreshold(state.drag.pointerType) / state.zoom;
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        state.drag.moved = true;
      }
      const clamped = clampLabelPosition(
        Math.round(state.drag.originX + deltaX),
        Math.round(state.drag.originY + deltaY),
        metrics.width,
        metrics.height
      );
      movingLabel.x = clamped.x;
      movingLabel.y = clamped.y;
      element.style.left = `${clamped.x}px`;
      element.style.top = `${clamped.y}px`;
    });

    element.addEventListener("pointerup", (event) => {
      if (!state.drag || state.drag.type !== "label" || state.drag.id !== labelId) return;
      const moved = state.drag.moved;
      const movingLabel = getLabelById(labelId);
      state.drag = null;
      if (moved && movingLabel) {
        persistLabel(movingLabel).catch((error) => {
          showToast(error.message, true);
          render();
        });
        return;
      }
      render();
    });

    element.addEventListener("dblclick", () => {
      const activeLabel = getLabelById(labelId);
      if (!activeLabel || !canEditLabel(activeLabel)) return;
      state.modal = {
        type: "label-editor",
        labelId,
        text: activeLabel.text,
        error: "",
      };
      render();
    });
  });

  app.querySelectorAll('[data-action="edit-label"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const labelId = Number(button.dataset.id);
      const label = getLabelById(labelId);
      if (!label) return;
      state.modal = {
        type: "label-editor",
        labelId,
        text: label.text,
        error: "",
      };
      render();
    });
  });

  app.querySelectorAll('[data-action="increase-label-size"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await adjustLabelFontSize(Number(button.dataset.id), LABEL_FONT_SIZE_STEP);
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-action="decrease-label-size"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await adjustLabelFontSize(Number(button.dataset.id), -LABEL_FONT_SIZE_STEP);
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-action="delete-label"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await deleteLabel(Number(button.dataset.id));
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-action="toggle-like"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await toggleNoteLike(Number(button.dataset.id));
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-action="kick-user"]').forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await kickMember(button.dataset.clientId, false);
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  app.querySelectorAll('[data-action="kick-user-delete"]').forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await kickMember(button.dataset.clientId, true);
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  bindModalHandlers();
  initTooltips();
}

function renderUsersPanel() {
  if (!isAdmin() || !state.usersPanelOpen) return "";

  return `
    <div class="share-overlay users-overlay">
      <div class="brand-block share-panel users-panel">
        <div class="share-panel-header">
          <strong>${t("active_users")}</strong>
          <button class="link-button" data-action="toggle-users" type="button">${t("close")}</button>
        </div>
        <div class="users-list">
          ${state.members.filter((member) => !memberHasAdminAccess(member)).length === 0 ? `<p class="qr-hint">${t("no_active_users")}</p>` : ""}
          ${state.members.filter((member) => !memberHasAdminAccess(member)).map((member) => `
            <div class="user-row">
              <div>
                <strong>${escapeHtml(member.userName)}</strong>
                <div class="user-meta">${member.noteCount} ${t("notes_label")}</div>
              </div>
              <div class="user-actions">
                <button class="secondary-button" data-action="kick-user" data-client-id="${member.clientId}" type="button">${t("kick_user")}</button>
                <button data-action="kick-user-delete" data-client-id="${member.clientId}" type="button">${t("kick_user_delete_notes")}</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function noteDecorationStyle(note) {
  const seedBase = Math.abs(Number(note?.id) || 0) + ((note?.zIndex || 0) * 17);
  const seed = (offset) => {
    const value = Math.sin((seedBase + 1) * (offset + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  let tilt = (seed(0) * 10) - 5;
  if (Math.abs(tilt) < 1.2) {
    tilt = tilt < 0 ? -1.8 : 1.8;
  }

  const tapePrimaryLeft = 78 + Math.round(seed(1) * 28);
  const tapePrimaryWidth = 50 + Math.round(seed(2) * 14);
  const tapePrimaryRotation = -7 + Math.round(seed(3) * 14);
  const tapePrimaryTop = -12 + Math.round(seed(4) * 6);
  const tapePrimaryOpacity = (0.24 + (seed(5) * 0.14)).toFixed(2);

  return [
    `--tilt:${tilt.toFixed(2)}`,
    `--tape-primary-left:${tapePrimaryLeft}px`,
    `--tape-primary-width:${tapePrimaryWidth}px`,
    `--tape-primary-rotation:${tapePrimaryRotation}deg`,
    `--tape-primary-top:${tapePrimaryTop}px`,
    `--tape-primary-opacity:${tapePrimaryOpacity}`,
  ].join("; ");
}

function renderNoteCard(note) {
  const renderable = getRenderableNote(note.id) || note;
  const isEditing = state.editingNoteId === note.id;
  const isSettling = state.settlingNoteId === note.id;
  const isUnsavedNewNote = isLocalNoteId(note.id);
  const noteCanEdit = canEditNote(renderable);
  const isMobileEditor = isEditing && noteCanEdit && isCompactViewport();
  const noteRotation = (isUnsavedNewNote || isEditing) ? "0deg" : "calc((var(--tilt, 0) * 1deg))";
  const noteScale = isEditing
    ? Number((editingNoteScale() * (isUnsavedNewNote ? 1.02 : 1)).toFixed(4))
    : 1;
  const decorationStyle = noteDecorationStyle(renderable);
  const classes = [
    "sticky-note",
    `color-${renderable.color}`,
    `font-${renderable.fontFamily}`,
    renderable.isBold ? "is-bold" : "",
    renderable.isItalic ? "is-italic" : "",
    renderable.isUnderline ? "is-underline" : "",
    state.selectedNoteId === note.id ? "selected" : "",
    isEditing ? "is-editing" : "",
    isSettling ? "is-settling" : "",
    isUnsavedNewNote ? "is-new-note" : "",
  ].filter(Boolean).join(" ");

  return `
    <article
      class="${classes}"
      data-id="${note.id}"
      style="left:${renderable.x}px; top:${renderable.y}px; z-index:${renderable.zIndex}; --font-size:${renderable.fontSize}px; --note-scale:${noteScale}; --note-rotation:${noteRotation}; ${decorationStyle};"
    >
      <header>
        <span class="note-author">${escapeHtml(renderable.author || state.userName)}</span>
        ${isEditing && noteCanEdit ? `
          <div class="note-inline-actions">
            ${isMobileEditor ? `
              <button
                class="note-format-toggle-button ${state.mobileEditorToolsOpen ? "active" : ""}"
                data-action="toggle-mobile-editor-tools"
                data-id="${note.id}"
                type="button"
                data-tooltip="Aa"
                aria-label="Aa"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19 9.3 5h1.9L16 19h-2.1l-1.1-3.4H7.7L6.6 19Zm3.8-5.2H12L10.2 8.4ZM17 8h2l2 6 2-6h2l-3.4 9.2c-.2.6-.5 1.1-.9 1.5-.4.4-1 .6-1.8.6h-1v-1.7h.7c.4 0 .7-.1.9-.3.2-.2.4-.4.5-.8l.2-.5Z" fill="currentColor"/></svg>
              </button>
            ` : ""}
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
            <button
              class="note-cancel-button"
              data-action="cancel-note-inline"
              data-id="${note.id}"
              type="button"
              data-tooltip="${t("discard_changes")}"
              aria-label="${t("discard_changes")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.41 5 12 10.59 17.59 5 19 6.41 13.41 12 19 17.59 17.59 19 12 13.41 6.41 19 5 17.59 10.59 12 5 6.41z" fill="currentColor"/></svg>
            </button>
          </div>
        ` : ""}
      </header>
      ${isEditing && noteCanEdit ? `
        <div class="note-editor" contenteditable="true" spellcheck="true" data-role="note-editor" data-id="${note.id}">${sanitizeRichText(renderable.content || "")}</div>
      ` : `
        <div class="note-display">${sanitizeRichText(renderable.content || "").trim() || `<span class="note-placeholder">${escapeHtml(t("note_placeholder"))}</span>`}</div>
        ${likesEnabled() ? `
          <footer class="note-footer">
            <button
              class="note-like-button ${renderable.isLikedByCurrentUser ? "active" : ""}"
              data-action="toggle-like"
              data-id="${note.id}"
              type="button"
              data-tooltip="${renderable.isLikedByCurrentUser ? t("unlike_note") : t("like_note")}"
              aria-label="${renderable.isLikedByCurrentUser ? t("unlike_note") : t("like_note")}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.72-4.34-9.2-8.06C.63 9.74 2.24 5 6.46 5c2.13 0 3.36 1.16 4.19 2.3C11.48 6.16 12.71 5 14.84 5 19.06 5 20.67 9.74 18.2 12.94 15.72 16.66 9 21 9 21Z" fill="currentColor"/></svg>
              <span>${Number(renderable.likesCount) || 0}</span>
            </button>
          </footer>
        ` : ""}
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
  captureViewportForRerender();
  const isHomeView = !(state.view === "settings" && state.board) && !(state.board && state.view === "board");
  if (!isHomeView) {
    clearHomeAmbientNotes();
  }
  if (state.view === "settings" && state.board) {
    renderSettingsScreen();
  } else if (state.board && state.view === "board") {
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
  state.fallbackTranslations = state.lang === "en"
    ? state.translations
    : await loadTranslations("en").catch(() => ({}));
  persistLanguage(state.lang);
  applyDocumentLanguage(state.lang);

  ensureClientId();
  loadUserName();
  updateViewportEnvironment();
  render();

  const handleViewportEnvironmentChange = () => {
    updateViewportEnvironment();
    syncEditorPanel();
    updateEditorPanelPosition();
  };

  const code = boardCodeFromUrl();
  if (code) {
    loadAdminToken(code);
    try {
      if (state.adminToken) {
        await openBoard(code);
      } else {
        promptDirectBoardJoin(code);
      }
    } catch (error) {
      showToast(error.message, true);
    }
  }

  window.setInterval(() => {
    if (state.board && !state.drag && !isEditingField() && !hasOpenDrafts()) {
      refreshBoard().catch(() => {});
    }
  }, 6000);

  window.addEventListener("resize", handleViewportEnvironmentChange);
  window.visualViewport?.addEventListener("resize", handleViewportEnvironmentChange);
  window.visualViewport?.addEventListener("scroll", handleViewportEnvironmentChange);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.editingNoteId) {
        event.preventDefault();
        exitNoteEditing();
        return;
      }
      exitPresentationMode();
    }
  });

  document.addEventListener("selectionchange", () => {
    if (!state.editingNoteId || state.view !== "board") return;
    const editor = getSelectedNoteEditor();
    if (!editor || Number(editor.dataset.id) !== state.editingNoteId) return;
    rememberEditorSelection(editor);
    syncEditorPanel();
  });

  initTooltips();
}

bootstrap().catch((error) => {
  app.innerHTML = `<main class="fatal-error">${escapeHtml(error.message)}</main>`;
});
