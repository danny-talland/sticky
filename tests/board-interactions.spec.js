const { test, expect } = require("@playwright/test");

async function createBoard(request) {
  const clientId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post("./api.php?action=create_board", {
    data: {
      title: "PW Board Interactions",
      supervisedMode: false,
      teacherName: "Playwright",
      clientId,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return { ...data, clientId };
}

async function createSeedNote(request, { code, clientId, x, y, content, zIndex }) {
  const response = await request.post("./api.php?action=create_note", {
    data: {
      code,
      clientId,
      author: "Playwright",
      content,
      color: "yellow",
      fontFamily: "comic",
      fontSize: 22,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      x,
      y,
      zIndex,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openSharedBoard(page, code, userName = "Playwright") {
  await page.goto(`./?board=${code}`, { waitUntil: "domcontentloaded" });
  const nameInput = page.locator('[data-role="direct-board-user-name"]');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(userName);
    await page.locator('[data-action="submit-direct-board"]').click();
  }
  await page.waitForSelector(".board-viewport");
}

async function selectEditorText(page, text) {
  await page.evaluate((text) => {
    const editor = document.querySelector(".sticky-note.is-editing .note-editor");
    if (!editor) throw new Error("Missing active note editor");

    const content = editor.textContent || "";
    const start = content.indexOf(text);
    if (start < 0) throw new Error(`Text not found: ${text}`);
    const end = start + text.length;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let cursor = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nextCursor = cursor + node.textContent.length;

      if (!startNode && start >= cursor && start <= nextCursor) {
        startNode = node;
        startOffset = start - cursor;
      }

      if (!endNode && end >= cursor && end <= nextCursor) {
        endNode = node;
        endOffset = end - cursor;
        break;
      }

      cursor = nextCursor;
    }

    if (!startNode || !endNode) {
      throw new Error(`Could not resolve selection for: ${text}`);
    }

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    document.dispatchEvent(new Event("selectionchange"));
  }, text);
}

test.describe("board interactions", () => {
  test("opens the QR panel from the title area", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForSelector('[data-action="toggle-qr"]');

    await page.click('[data-action="toggle-qr"]');

    await expect(page.locator(".share-overlay")).toBeVisible();
    await expect(page.locator(".qr-image")).toBeVisible();
  });

  test("supports board panning and keeps the grid on the scrolling board layer", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const surface = getComputedStyle(document.querySelector(".board-surface")).backgroundImage;
      const canvas = getComputedStyle(document.querySelector(".board-canvas-content")).backgroundImage;
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        surface,
        canvas,
      };
    });

    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(760, 560, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    expect(after.left).not.toBe(before.left);
    expect(after.top).not.toBe(before.top);
    expect(before.surface).not.toContain("linear-gradient(90deg");
    expect(before.canvas).toContain("linear-gradient(90deg");
  });

  test("preserves the viewport position after the automatic board refresh", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.mouse.move(420, 420);
    await page.mouse.down();
    await page.mouse.move(760, 560, { steps: 16 });
    await page.mouse.up();

    const beforeRefresh = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    await page.waitForTimeout(6500);

    const afterRefresh = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    expect(Math.abs(afterRefresh.left - beforeRefresh.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterRefresh.top - beforeRefresh.top)).toBeLessThanOrEqual(2);
  });

  test("does not rebuild the board viewport during an idle auto refresh", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.__stickyViewportRef = document.querySelector(".board-viewport");
    });

    await page.waitForTimeout(6500);

    const result = await page.evaluate(() => ({
      sameViewport: window.__stickyViewportRef === document.querySelector(".board-viewport"),
    }));

    expect(result.sameViewport).toBeTruthy();
  });

  test("animates presentation mode towards refreshed board changes", async ({ page, request }) => {
    const created = await createBoard(request);
    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 120,
      y: 120,
      content: "Presentation north",
      zIndex: 1,
    });
    const noteB = await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 720,
      y: 420,
      content: "Presentation south",
      zIndex: 2,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.click('[data-action="presentation-mode"]');
    await page.waitForTimeout(700);

    const moveResponse = await request.post("./api.php?action=update_note", {
      data: {
        id: noteB.note.id,
        clientId: created.clientId,
        author: "Playwright",
        content: "Presentation south moved",
        color: "yellow",
        fontFamily: "comic",
        fontSize: 22,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        x: 4200,
        y: 2200,
        zIndex: 2,
      },
    });
    expect(moveResponse.ok()).toBeTruthy();

    const beforeMetrics = await page.evaluate(() => {
      const viewportContent = document.querySelector(".board-viewport-content");
      const canvas = document.querySelector(".board-canvas");
      const content = document.querySelector(".board-canvas-content");
      return {
        viewportContentWidth: viewportContent?.getBoundingClientRect().width ?? 0,
        canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
        zoom: content
          ? (content.getBoundingClientRect().width / parseFloat(content.style.width))
          : 0,
      };
    });

    await page.waitForFunction(() => {
      const movedNote = Array.from(document.querySelectorAll(".sticky-note"))
        .find((element) => element.textContent.includes("Presentation south moved"));
      return Boolean(movedNote) && (
        document.querySelector(".board-viewport")?.classList.contains("is-focus-animating")
        || document.querySelector(".sticky-note.is-layout-animating, .sticky-note.is-layout-entering")
      );
    }, null, { timeout: 8000 });

    await page.waitForTimeout(180);

    const midAnimation = await page.evaluate(() => {
      const viewportContent = document.querySelector(".board-viewport-content");
      const canvas = document.querySelector(".board-canvas");
      const content = document.querySelector(".board-canvas-content");
      return {
        viewportContentWidth: viewportContent?.getBoundingClientRect().width ?? 0,
        targetViewportContentWidth: parseFloat(viewportContent?.style.width || "0"),
        viewportContentTransitionDuration: viewportContent ? window.getComputedStyle(viewportContent).transitionDuration : "",
        canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
        targetCanvasWidth: parseFloat(canvas?.style.width || "0"),
        zoom: content
          ? (content.getBoundingClientRect().width / parseFloat(content.style.width))
          : 0,
      };
    });

    const result = await page.evaluate(() => {
      const movedNote = Array.from(document.querySelectorAll(".sticky-note"))
        .find((element) => element.textContent.includes("Presentation south moved"));
      const animatedNotes = Array.from(document.querySelectorAll(".sticky-note.is-layout-animating, .sticky-note.is-layout-entering"))
        .map((element) => element.textContent.trim());
      const canvas = document.querySelector(".board-canvas");
      const content = document.querySelector(".board-canvas-content");
      const viewportContent = document.querySelector(".board-viewport-content");
      return {
        hasPresentationMode: document.querySelector(".board-layout")?.classList.contains("presentation-mode"),
        animatedNotes,
        movedLeft: movedNote ? parseFloat(movedNote.style.left || "0") : null,
        movedTop: movedNote ? parseFloat(movedNote.style.top || "0") : null,
        viewportContentWidth: viewportContent?.getBoundingClientRect().width ?? 0,
        canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
        canvasTransitionDuration: canvas ? window.getComputedStyle(canvas).transitionDuration : "",
        contentTransitionDuration: content ? window.getComputedStyle(content).transitionDuration : "",
        zoom: content ? (content.getBoundingClientRect().width / parseFloat(content.style.width)) : 0,
      };
    });

    expect(result.hasPresentationMode).toBeTruthy();
    expect(result.animatedNotes).toHaveLength(1);
    expect(result.animatedNotes[0]).toContain("Presentation south moved");
    expect(result.movedLeft).toBe(2160);
    expect(result.movedTop).toBe(960);
    expect(Math.abs(result.zoom - beforeMetrics.zoom)).toBeGreaterThan(0.2);
    expect(midAnimation.viewportContentTransitionDuration).toContain("2s");
    expect(midAnimation.viewportContentWidth).not.toBeCloseTo(midAnimation.targetViewportContentWidth, 0);
    expect(midAnimation.viewportContentWidth).not.toBeCloseTo(beforeMetrics.viewportContentWidth, 0);
    expect(midAnimation.canvasWidth).not.toBeCloseTo(midAnimation.targetCanvasWidth, 0);
    expect(midAnimation.canvasWidth).not.toBeCloseTo(beforeMetrics.canvasWidth, 0);
    expect(result.viewportContentWidth).toBeGreaterThan(0);
    expect(result.canvasTransitionDuration).toContain("2s");
    expect(result.contentTransitionDuration).toContain("2s");
  });

  test("keeps a newly added note inside the viewport even after zoom changes", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);

    for (let index = 0; index < 5; index += 1) {
      await page.click('[data-action="zoom-in"]');
    }

    await page.click('[data-action="add-note"]');
    await page.waitForSelector(".sticky-note.is-new-note.is-editing");
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport").getBoundingClientRect();
      const note = document.querySelector(".sticky-note.is-new-note.is-editing").getBoundingClientRect();
      return {
        visible: note.left >= viewport.left && note.right <= viewport.right && note.top >= viewport.top && note.bottom <= viewport.bottom,
      };
    });

    expect(result.visible).toBeTruthy();
  });

  test("does not shift the viewport when adding a new note at default zoom", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    await page.click('[data-action="add-note"]');
    await page.waitForSelector(".sticky-note.is-new-note.is-editing");
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });

  test("keeps the board zoom unchanged while centering an edited sticky at standard size", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Needs centering",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.click('[data-action="zoom-in"]');
    await page.click('[data-action="zoom-in"]');
    await page.click('[data-action="zoom-in"]');
    await page.waitForTimeout(400);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      return {
        zoom,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      viewport.scrollTo({ left: 0, top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(120);

    await page.locator(".sticky-note", { hasText: "Needs centering" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await expect(page.locator(".board-viewport")).toHaveClass(/is-focus-animating/);
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport").getBoundingClientRect();
      const content = document.querySelector(".board-canvas-content");
      const note = document.querySelector(".sticky-note.is-editing").getBoundingClientRect();
      const viewportCenterX = viewport.left + (viewport.width / 2);
      const viewportCenterY = viewport.top + (viewport.height / 2);
      const noteCenterX = note.left + (note.width / 2);
      const noteCenterY = note.top + (note.height / 2);
      return {
        zoom: content.getBoundingClientRect().width / parseFloat(content.style.width),
        offsetX: Math.abs(noteCenterX - viewportCenterX),
        offsetY: Math.abs(noteCenterY - viewportCenterY),
        noteWidth: note.width,
      };
    });

    expect(Math.abs(result.zoom - before.zoom)).toBeLessThanOrEqual(0.01);
    expect(result.offsetX).toBeLessThanOrEqual(3);
    expect(result.offsetY).toBeLessThanOrEqual(3);
    expect(result.noteWidth).toBeGreaterThanOrEqual(236);
    expect(result.noteWidth).toBeLessThanOrEqual(246);
  });

  test("starts sticky edit animation from the current viewport instead of jumping first", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 1500,
      y: 720,
      content: "Smooth start",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const note = document.querySelector(".sticky-note");
      const noteRect = note.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        noteCenterX: noteRect.left + (noteRect.width / 2),
        noteCenterY: noteRect.top + (noteRect.height / 2),
        viewportLeft: viewportRect.left,
        viewportTop: viewportRect.top,
        viewportRight: viewportRect.right,
        viewportBottom: viewportRect.bottom,
      };
    });

    expect(before.left).toBeGreaterThan(200);
    expect(before.noteCenterX).toBeGreaterThan(before.viewportLeft);
    expect(before.noteCenterX).toBeLessThan(before.viewportRight);
    expect(before.noteCenterY).toBeGreaterThan(before.viewportTop);
    expect(before.noteCenterY).toBeLessThan(before.viewportBottom);

    await page.locator(".sticky-note", { hasText: "Smooth start" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await page.waitForTimeout(20);

    const immediate = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    expect(Math.abs(immediate.left - before.left)).toBeLessThanOrEqual(120);
    expect(Math.abs(immediate.top - before.top)).toBeLessThanOrEqual(120);
  });

  test("positions edit controls on their final side before the fade starts", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 3000,
      y: 920,
      content: "Panel side",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.locator(".sticky-note", { hasText: "Panel side" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await page.waitForTimeout(20);

    await expect(page.locator(".note-editor-panel")).toHaveClass(/is-primed/);

    const placementAtStart = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const panel = document.querySelector(".note-editor-panel .panel-section");
      return {
        panelLeft: parseFloat(panel.style.left),
        viewportWidth: viewport.clientWidth,
      };
    });

    expect(placementAtStart.panelLeft).toBeGreaterThan(placementAtStart.viewportWidth / 2);

    await page.waitForTimeout(140);

    const placementMidAnimation = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const panel = document.querySelector(".note-editor-panel .panel-section");
      return {
        panelLeft: parseFloat(panel.style.left),
        viewportWidth: viewport.clientWidth,
      };
    });

    expect(placementMidAnimation.panelLeft).toBeGreaterThan(placementMidAnimation.viewportWidth / 2);

    await page.waitForTimeout(220);
    await expect(page.locator(".note-editor-panel")).not.toHaveClass(/is-primed/);
  });

  test("leaves sticky edit mode on Escape without saving draft changes", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Original text",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.click('[data-action="zoom-in"]');
    await page.click('[data-action="zoom-in"]');
    await page.waitForTimeout(300);

    await page.locator(".sticky-note", { hasText: "Original text" }).click();
    await page.waitForSelector(".sticky-note.is-editing");

    const editor = page.locator(".sticky-note.is-editing .note-editor");
    await editor.click();
    await page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+A`);
    await page.keyboard.type("Draft change");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);

    await expect(page.locator(".sticky-note.is-editing")).toHaveCount(0);
    await expect(page.locator(".sticky-note.selected")).toHaveClass(/is-settling/);
    await expect(page.locator(".sticky-note .note-display")).toContainText("Original text");
    await page.waitForTimeout(220);
    await expect(page.locator(".sticky-note.selected")).not.toHaveClass(/is-settling/);
  });

  test("shows a discard button while editing and ignores unsaved changes", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Keep me",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.locator(".sticky-note", { hasText: "Keep me" }).click();
    await page.waitForSelector(".sticky-note.is-editing");

    const cancelButton = page.locator(".sticky-note.is-editing [data-action='cancel-note-inline']");
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toHaveAttribute("data-tooltip", /.+/);

    const editor = page.locator(".sticky-note.is-editing .note-editor");
    await editor.click();
    await page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+A`);
    await page.keyboard.type("Discard me");
    await cancelButton.click();

    await expect(page.locator(".sticky-note.is-editing")).toHaveCount(0);
    await expect(page.locator(".sticky-note .note-display")).toContainText("Keep me");
  });

  test("keeps the author label stable when edit action icons appear", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Stable author",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const before = await page.locator(".sticky-note .note-author").evaluate((element) => {
      const noteRect = element.closest(".sticky-note").getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - noteRect.left,
        top: rect.top - noteRect.top,
      };
    });

    await page.locator(".sticky-note", { hasText: "Stable author" }).click();
    await page.waitForSelector(".sticky-note.is-editing");

    const after = await page.locator(".sticky-note.is-editing .note-author").evaluate((element) => {
      const noteRect = element.closest(".sticky-note").getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - noteRect.left,
        top: rect.top - noteRect.top,
      };
    });

    expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
  });

  test("applies bold italic and underline to selected note text", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Bold Italic Underline",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.locator(".sticky-note", { hasText: "Bold Italic Underline" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await page.waitForTimeout(380);

    await selectEditorText(page, "Bold");
    await page.click('.note-editor-panel [data-action="toggle-bold"]');
    await expect(page.locator('.note-editor-panel [data-action="toggle-bold"]')).toHaveClass(/active/);

    await selectEditorText(page, "Italic");
    await page.click('.note-editor-panel [data-action="toggle-italic"]');
    await expect(page.locator('.note-editor-panel [data-action="toggle-italic"]')).toHaveClass(/active/);

    await selectEditorText(page, "Underline");
    await page.click('.note-editor-panel [data-action="toggle-underline"]');
    await expect(page.locator('.note-editor-panel [data-action="toggle-underline"]')).toHaveClass(/active/);

    await page.click(".sticky-note.is-editing [data-action='save-note-inline']");
    await expect(page.locator(".sticky-note.is-editing")).toHaveCount(0);

    const html = await page.locator(".sticky-note .note-display").evaluate((element) => element.innerHTML);
    expect(html).toMatch(/<(b|strong)[^>]*>Bold<\/(b|strong)>/i);
    expect(html).toMatch(/<(i|em)[^>]*>Italic<\/(i|em)>/i);
    expect(html).toMatch(/<u[^>]*>Underline<\/u>/i);
  });

  test("supports multiple font sizes inside one note", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Base Accent",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.locator(".sticky-note", { hasText: "Base Accent" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await page.waitForTimeout(380);

    await selectEditorText(page, "Accent");
    await page.click('.note-editor-panel [data-action="set-font-size"][data-value="34"]');
    await expect(page.locator('.note-editor-panel [data-action="set-font-size"][data-value="34"]')).toHaveClass(/active/);

    await page.click(".sticky-note.is-editing [data-action='save-note-inline']");
    await expect(page.locator(".sticky-note.is-editing")).toHaveCount(0);

    const result = await page.evaluate(() => {
      const display = document.querySelector(".sticky-note .note-display");
      const accent = [...display.querySelectorAll("span")].find((element) => element.textContent.includes("Accent"));
      return {
        baseSize: Number.parseFloat(window.getComputedStyle(display).fontSize),
        accentSize: accent ? Number.parseFloat(window.getComputedStyle(accent).fontSize) : null,
        html: display.innerHTML,
      };
    });

    expect(result.baseSize).toBeGreaterThanOrEqual(21);
    expect(result.baseSize).toBeLessThanOrEqual(23);
    expect(result.accentSize).toBe(34);
    expect(result.html).toContain('font-size: 34px;');
  });

  test("locks board controls and shows the edit backdrop while editing a sticky", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Edit lock",
      zIndex: 1,
    });
    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 1320,
      y: 520,
      content: "Other note",
      zIndex: 2,
    });

    await openSharedBoard(page, created.board.code);
    await page.locator(".sticky-note", { hasText: "Edit lock" }).click();
    await page.waitForSelector(".sticky-note.is-editing");

    await expect(page.locator(".board-layout")).toHaveClass(/is-editing-note/);
    await expect(page.locator('[data-action="add-note"]')).toBeDisabled();
    await expect(page.locator('[data-action="zoom-in"]')).toBeDisabled();

    const overlayOpacity = await page.evaluate(() => {
      const surface = document.querySelector(".board-surface");
      return getComputedStyle(surface, "::after").opacity;
    });

    expect(Number(overlayOpacity)).toBeGreaterThan(0.1);

    const otherStickyOpacity = await page.locator('.sticky-note', { hasText: 'Other note' }).evaluate((element) => (
      window.getComputedStyle(element).opacity
    ));
    expect(Number(otherStickyOpacity)).toBeLessThan(0.75);
  });

  test("does not allow board panning while a sticky is being edited", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Locked board pan",
      zIndex: 1,
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.locator(".sticky-note", { hasText: "Locked board pan" }).click();
    await page.waitForSelector(".sticky-note.is-editing");
    await page.waitForTimeout(400);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const rect = viewport.getBoundingClientRect();
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        dragX: rect.left + 24,
        dragY: rect.top + 24,
      };
    });

    await page.mouse.move(before.dragX, before.dragY);
    await page.mouse.down();
    await page.mouse.move(before.dragX + 220, before.dragY + 160, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(120);

    const after = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    });

    expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });

  test("keeps a locally dragged sticky stable while remote refreshes apply other changes", async ({ page, request }) => {
    const created = await createBoard(request);
    const remoteClientId = `pw-remote-${Date.now()}`;
    const localNote = await createSeedNote(request, {
      code: created.board.code,
      clientId: created.clientId,
      x: 860,
      y: 520,
      content: "Local drag target",
      zIndex: 1,
    });
    const remoteNote = await createSeedNote(request, {
      code: created.board.code,
      clientId: remoteClientId,
      x: 1320,
      y: 520,
      content: "Remote update note",
      zIndex: 2,
    });

    await page.route("**/api.php?action=update_note", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      await route.continue();
    });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const before = await page.locator(".sticky-note", { hasText: "Local drag target" }).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: parseFloat(element.style.left || "0"),
        y: parseFloat(element.style.top || "0"),
        dragX: rect.left + 24,
        dragY: rect.top + 24,
      };
    });

    await page.mouse.move(before.dragX, before.dragY);
    await page.mouse.down();
    await page.mouse.move(before.dragX + 220, before.dragY + 160, { steps: 12 });
    await page.mouse.up();

    const afterLocalDrag = await page.evaluate(() => {
      const local = Array.from(document.querySelectorAll(".sticky-note"))
        .find((element) => element.textContent.includes("Local drag target"));
      return {
        localX: local ? parseFloat(local.style.left || "0") : null,
        localY: local ? parseFloat(local.style.top || "0") : null,
      };
    });

    expect(afterLocalDrag.localX).toBeGreaterThanOrEqual(before.x + 180);
    expect(afterLocalDrag.localY).toBeGreaterThanOrEqual(before.y + 120);

    const remoteMoveResponse = await request.post("./api.php?action=update_note", {
      data: {
        id: remoteNote.note.id,
        clientId: remoteClientId,
        author: "Remote",
        content: "Remote update note moved",
        color: "yellow",
        fontFamily: "comic",
        fontSize: 22,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        x: 1680,
        y: 760,
        zIndex: 2,
      },
    });
    expect(remoteMoveResponse.ok()).toBeTruthy();

    await page.waitForTimeout(6500);

    const afterRefresh = await page.evaluate(() => {
      const local = Array.from(document.querySelectorAll(".sticky-note"))
        .find((element) => element.textContent.includes("Local drag target"));
      const remote = Array.from(document.querySelectorAll(".sticky-note"))
        .find((element) => element.textContent.includes("Remote update note moved"));
      return {
        localX: local ? parseFloat(local.style.left || "0") : null,
        localY: local ? parseFloat(local.style.top || "0") : null,
        remoteX: remote ? parseFloat(remote.style.left || "0") : null,
        remoteY: remote ? parseFloat(remote.style.top || "0") : null,
      };
    });

    expect(afterRefresh.localX).toBeGreaterThanOrEqual(before.x + 180);
    expect(afterRefresh.localY).toBeGreaterThanOrEqual(before.y + 120);
    expect(afterRefresh.remoteX).toBe(1680);
    expect(afterRefresh.remoteY).toBe(760);
  });

  test("preserves the viewport center while zooming", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    const beforeZoomIn = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      return {
        logicalCenterX: (viewport.scrollLeft + (viewport.clientWidth / 2)) / zoom,
        logicalCenterY: (viewport.scrollTop + (viewport.clientHeight / 2)) / zoom,
      };
    });

    await page.click('[data-action="zoom-in"]');
    await page.waitForTimeout(500);

    const afterZoomIn = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      return {
        logicalCenterX: (viewport.scrollLeft + (viewport.clientWidth / 2)) / zoom,
        logicalCenterY: (viewport.scrollTop + (viewport.clientHeight / 2)) / zoom,
      };
    });

    expect(Math.abs(afterZoomIn.logicalCenterX - beforeZoomIn.logicalCenterX)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterZoomIn.logicalCenterY - beforeZoomIn.logicalCenterY)).toBeLessThanOrEqual(2);

    const beforeZoomOut = afterZoomIn;

    await page.click('[data-action="zoom-out"]');
    await page.waitForTimeout(500);

    const afterZoomOut = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      return {
        logicalCenterX: (viewport.scrollLeft + (viewport.clientWidth / 2)) / zoom,
        logicalCenterY: (viewport.scrollTop + (viewport.clientHeight / 2)) / zoom,
      };
    });

    expect(Math.abs(afterZoomOut.logicalCenterX - beforeZoomOut.logicalCenterX)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterZoomOut.logicalCenterY - beforeZoomOut.logicalCenterY)).toBeLessThanOrEqual(2);
  });

  test("keeps fit-view stable while a new note is edited and returns the note to board scale after save", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 120, y: 120, content: "North west", zIndex: 1 });
    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 4200, y: 1800, content: "South east", zIndex: 2 });
    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 2400, y: 960, content: "Center", zIndex: 3 });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.click('[data-action="fit-notes"]');
    await page.waitForTimeout(700);

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      const referenceNote = document.querySelector(".sticky-note");
      return {
        zoom,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        referenceWidth: referenceNote.getBoundingClientRect().width,
      };
    });

    expect(before.zoom).toBeLessThan(1);

    await page.click('[data-action="add-note"]');
    await page.waitForSelector(".sticky-note.is-new-note.is-editing");
    await page.waitForTimeout(500);

    const duringEdit = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      const newNote = document.querySelector(".sticky-note.is-new-note.is-editing");
      return {
        zoom,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        newNoteWidth: newNote.getBoundingClientRect().width,
      };
    });

    expect(Math.abs(duringEdit.zoom - before.zoom)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(duringEdit.left - before.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(duringEdit.top - before.top)).toBeLessThanOrEqual(2);
    expect(duringEdit.newNoteWidth).toBeGreaterThan(before.referenceWidth + 60);

    const editor = page.locator(".sticky-note.is-new-note.is-editing .note-editor");
    await editor.click();
    await editor.type("Nieuwe note");
    await page.click('[data-action="save-note-inline"]');
    await page.waitForSelector(".sticky-note.is-new-note", { state: "detached" });
    await page.waitForTimeout(500);

    const afterSave = await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      const content = document.querySelector(".board-canvas-content");
      const zoom = content.getBoundingClientRect().width / parseFloat(content.style.width);
      const selected = document.querySelector(".sticky-note.selected");
      return {
        zoom,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        selectedWidth: selected.getBoundingClientRect().width,
      };
    });

    expect(Math.abs(afterSave.zoom - before.zoom)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(afterSave.left - before.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterSave.top - before.top)).toBeLessThanOrEqual(2);
    expect(afterSave.selectedWidth).toBeLessThan(duringEdit.newNoteWidth - 40);
  });

  test("renders a new editing sticky above existing stickies with higher z-index values", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 1820, y: 940, content: "Older front 1", zIndex: 120 });
    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 1840, y: 960, content: "Older front 2", zIndex: 121 });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const viewport = document.querySelector(".board-viewport");
      viewport.scrollTo({ left: 1500, top: 700, behavior: "instant" });
    });
    await page.waitForTimeout(120);

    await page.click('[data-action="add-note"]');
    await page.waitForSelector(".sticky-note.is-new-note.is-editing");
    await page.waitForTimeout(350);

    const result = await page.evaluate(() => {
      const newNote = document.querySelector(".sticky-note.is-new-note.is-editing");
      const rect = newNote.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      const topElement = document.elementFromPoint(centerX, centerY);
      return {
        newNoteZIndex: window.getComputedStyle(newNote).zIndex,
        topElementNoteId: topElement?.closest(".sticky-note")?.dataset.id || null,
        newNoteId: newNote.dataset.id,
      };
    });

    expect(Number(result.newNoteZIndex)).toBeGreaterThan(121);
    expect(result.topElementNoteId).toBe(result.newNoteId);
  });

  test("centers the board on any axis where it fully fits in the viewport", async ({ page, request }) => {
    const created = await createBoard(request);

    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 120, y: 120, content: "North west", zIndex: 1 });
    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 4200, y: 1800, content: "South east", zIndex: 2 });
    await createSeedNote(request, { code: created.board.code, clientId: created.clientId, x: 2400, y: 960, content: "Center", zIndex: 3 });

    await openSharedBoard(page, created.board.code);
    await page.waitForTimeout(300);

    await page.click('[data-action="fit-notes"]');
    await page.waitForTimeout(700);

    const result = await page.evaluate(() => {
      const viewportRect = document.querySelector(".board-viewport").getBoundingClientRect();
      const canvasRect = document.querySelector(".board-canvas").getBoundingClientRect();
      return {
        viewportWidth: viewportRect.width,
        viewportHeight: viewportRect.height,
        canvasWidth: canvasRect.width,
        canvasHeight: canvasRect.height,
        leftGap: canvasRect.left - viewportRect.left,
        rightGap: viewportRect.right - canvasRect.right,
        topGap: canvasRect.top - viewportRect.top,
        bottomGap: viewportRect.bottom - canvasRect.bottom,
      };
    });

    if (result.canvasWidth < result.viewportWidth - 4) {
      expect(Math.abs(result.leftGap - result.rightGap)).toBeLessThanOrEqual(2);
    }

    if (result.canvasHeight < result.viewportHeight - 4) {
      expect(Math.abs(result.topGap - result.bottomGap)).toBeLessThanOrEqual(2);
    }
  });
});
