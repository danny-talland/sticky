const { test, expect } = require("@playwright/test");

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function createBoard(request, managementMode = false) {
  const clientId = `pw-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post("./api.php?action=create_board", {
    data: {
      title: "PW Mobile Board",
      managementMode,
      adminName: "Playwright",
      clientId,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return { ...data, clientId };
}

async function openSharedBoard(page, code, userName = "Playwright Mobile") {
  await page.goto(`./?board=${code}`, { waitUntil: "domcontentloaded" });
  const nameInput = page.locator('[data-role="direct-board-user-name"]');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(userName);
    await page.locator('[data-action="submit-direct-board"]').click();
  }
  await page.waitForSelector(".board-viewport");
}

async function openAdminBoard(page, board, adminToken, userName = "Playwright Mobile") {
  await page.addInitScript(({ code, token, storedUserName }) => {
    window.localStorage.setItem(`sticky.adminToken.${code}`, token);
    window.localStorage.setItem("sticky.userName", storedUserName);
  }, { code: board.code, token: adminToken, storedUserName: userName });
  await page.goto(`./?board=${board.code}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".board-viewport");
}

test.describe("mobile layout", () => {
  test("keeps the home screen within the mobile viewport", async ({ page }) => {
    await page.goto("./", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".hero-card")).toBeVisible();
    await expect(page.locator('[data-form="join-board"]')).toBeVisible();
    await expect(page.locator('[data-action="open-create-board-modal"]')).toBeVisible();

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      heroRight: document.querySelector(".hero-card")?.getBoundingClientRect().right ?? 0,
      pickerLeft: document.querySelector(".home-language-picker")?.getBoundingClientRect().left ?? 0,
      pickerRight: document.querySelector(".home-language-picker")?.getBoundingClientRect().right ?? 0,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.heroRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.pickerLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.pickerRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
  });

  test("keeps the board toolbar and editor sheet usable on mobile", async ({ page, request }) => {
    const created = await createBoard(request);

    await openSharedBoard(page, created.board.code);
    await expect(page.locator(".floating-tools")).toBeVisible();
    await expect(page.locator(".presentation-mode-button")).toBeHidden();

    await page.click('[data-action="add-note"]');
    await expect(page.locator('[data-action="toggle-mobile-editor-tools"]')).toBeVisible();
    await expect(page.locator(".note-editor-panel")).toHaveClass(/is-collapsed-mobile/);

    await page.click('[data-action="toggle-mobile-editor-tools"]');
    await expect(page.locator(".note-editor-panel .panel-section")).toBeVisible();

    const metrics = await page.evaluate(() => {
      const toolbar = document.querySelector(".floating-tools")?.getBoundingClientRect();
      const editor = document.querySelector(".note-editor-panel .panel-section")?.getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        toolbarLeft: toolbar?.left ?? 0,
        toolbarRight: toolbar?.right ?? 0,
        toolbarBottom: toolbar?.bottom ?? 0,
        toolbarCenterOffset: toolbar
          ? Math.abs(((toolbar.left + toolbar.right) / 2) - (window.innerWidth / 2))
          : 0,
        editorLeft: editor?.left ?? 0,
        editorRight: editor?.right ?? 0,
        editorBottom: editor?.bottom ?? 0,
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.toolbarLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.toolbarRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.toolbarBottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.toolbarCenterOffset).toBeLessThanOrEqual(12);
    expect(metrics.editorLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.editorRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.editorBottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
  });

  test("stacks the management settings cleanly on mobile", async ({ page, request }) => {
    const created = await createBoard(request, true);

    await openAdminBoard(page, created.board, created.adminToken);
    await page.click('[data-action="open-settings"]');

    await expect(page.locator('[data-form="management-settings"]')).toBeVisible();
    await expect(page.locator('.settings-hero-actions button[type="submit"]')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const card = document.querySelector(".settings-card")?.getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        cardLeft: card?.left ?? 0,
        cardRight: card?.right ?? 0,
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.cardLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.cardRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
  });
});
