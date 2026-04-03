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

test.describe("board interactions", () => {
  test("opens the QR panel from the title area", async ({ page, request }) => {
    const created = await createBoard(request);

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-action="toggle-qr"]');

    await page.click('[data-action="toggle-qr"]');

    await expect(page.locator(".share-overlay")).toBeVisible();
    await expect(page.locator(".qr-image")).toBeVisible();
  });

  test("supports board panning and keeps the grid on the scrolling board layer", async ({ page, request }) => {
    const created = await createBoard(request);

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");
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

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");
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

  test("keeps a newly added note inside the viewport even after zoom changes", async ({ page, request }) => {
    const created = await createBoard(request);

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");

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

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");
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

  test("preserves the viewport center while zooming", async ({ page, request }) => {
    const created = await createBoard(request);

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");
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

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board-viewport");
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
});
