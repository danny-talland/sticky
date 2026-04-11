const { test, expect } = require("@playwright/test");

async function createBoard(request, managementMode) {
  const clientId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post("./api.php?action=create_board", {
    data: {
      title: `PW ${managementMode ? "Managed" : "Open"} Board`,
      managementMode,
      adminName: "Playwright",
      clientId,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function fillJoinCode(page, code) {
  const digits = code.toUpperCase().split("");
  const inputs = page.locator('[data-code-digit="home-join-code"]');
  await expect(inputs).toHaveCount(6);
  for (let index = 0; index < digits.length; index += 1) {
    await inputs.nth(index).fill(digits[index]);
  }
}

test.describe("existing board access", () => {
  test("opens the new-board modal from the home screen", async ({ page }) => {
    await page.goto("./", { waitUntil: "domcontentloaded" });

    await page.click('[data-action="open-create-board-modal"]');

    await expect(page.locator('[data-form="new-board-modal"]')).toBeVisible();
    await expect(page.locator('[data-form="new-board-modal"] input[name="title"]')).toHaveValue("New board");
  });

  test("lets the user switch the home language and keeps that choice", async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem("sticky.lang")) {
        window.localStorage.setItem("sticky.lang", "en");
      }
    });

    await page.goto("./", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".hero-copy h1")).toHaveText("Share ideas together on one board.");
    await expect(page.locator('[data-role="language-picker"] .home-language-code')).toHaveText("EN");

    await page.locator('[data-action="change-language"]').selectOption("nl");

    await expect(page.locator(".hero-copy h1")).toHaveText("Deel ideeën samen op één bord.");
    await expect(page.locator('[data-role="language-picker"] .home-language-code')).toHaveText("NL");

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator(".hero-copy h1")).toHaveText("Deel ideeën samen op één bord.");
    await expect(page.locator('[data-role="language-picker"] .home-language-code')).toHaveText("NL");
  });

  test("shows ambient sticky notes outside the home hero", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("./", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(() => document.querySelectorAll(".home-floating-note.is-visible").length >= 4, null, { timeout: 8000 });
    await page.screenshot({ path: testInfo.outputPath("home-ambient-notes.png"), fullPage: true });

    const heroBox = await page.locator(".hero-card").boundingBox();
    const noteBoxes = await page.locator(".home-floating-note").evaluateAll((elements) => elements.map((element) => {
      const noteRect = element.getBoundingClientRect();
      const displayRect = element.querySelector(".note-display")?.getBoundingClientRect();
      return {
        x: noteRect.x,
        y: noteRect.y,
        width: noteRect.width,
        height: noteRect.height,
        bottom: noteRect.bottom,
        right: noteRect.right,
        displayBottom: displayRect?.bottom ?? 0,
        displayRight: displayRect?.right ?? 0,
        left: Math.round(parseFloat(element.style.left || "0")),
        top: Math.round(parseFloat(element.style.top || "0")),
      };
    }));

    expect(heroBox).toBeTruthy();
    expect(noteBoxes.length).toBeGreaterThanOrEqual(4);

    let hasTopNote = false;
    let hasBottomNote = false;
    let hasLeftNote = false;
    let hasRightNote = false;
    noteBoxes.forEach((noteBox) => {
      const overlapsHero = !(
        noteBox.x + noteBox.width <= heroBox.x
        || noteBox.x >= heroBox.x + heroBox.width
        || noteBox.y + noteBox.height <= heroBox.y
        || noteBox.y >= heroBox.y + heroBox.height
      );

      expect(overlapsHero).toBe(false);
      expect(noteBox.displayBottom).toBeLessThanOrEqual(noteBox.bottom + 0.5);
      expect(noteBox.displayRight).toBeLessThanOrEqual(noteBox.right + 0.5);

      if (noteBox.bottom <= heroBox.y) hasTopNote = true;
      if (noteBox.y >= heroBox.y + heroBox.height) hasBottomNote = true;
      if (noteBox.right <= heroBox.x) hasLeftNote = true;
      if (noteBox.x >= heroBox.x + heroBox.width) hasRightNote = true;
    });

    expect(hasTopNote).toBe(true);
    expect(hasBottomNote).toBe(true);
    expect(hasLeftNote).toBe(true);
    expect(hasRightNote).toBe(true);

    const firstPositions = noteBoxes
      .map(({ left, top }) => `${left}:${top}`)
      .sort();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll(".home-floating-note.is-visible").length >= 4, null, { timeout: 8000 });

    const secondPositionMetrics = await page.locator(".home-floating-note").evaluateAll((elements) => elements.map((element) => ({
      left: Math.round(parseFloat(element.style.left || "0")),
      top: Math.round(parseFloat(element.style.top || "0")),
    })));
    const secondPositions = secondPositionMetrics
      .map(({ left, top }) => `${left}:${top}`)
      .sort();

    expect(secondPositions).not.toEqual(firstPositions);
  });

  test("creates a new board from the home modal and closes the modal", async ({ page }) => {
    await page.goto("./", { waitUntil: "domcontentloaded" });

    await page.click('[data-action="open-create-board-modal"]');
    await page.locator('[data-form="new-board-modal"] input[name="title"]').fill("Playwright Home Board");
    await page.locator('[data-form="new-board-modal"] input[name="userName"]').fill("Playwright User");
    await page.locator('[data-form="new-board-modal"] button[type="submit"]').click();

    await expect(page.locator(".board-viewport")).toBeVisible();
    await expect(page.locator('[data-form="new-board-modal"]')).toHaveCount(0);
  });

  test("creates management boards with the expected default limits and ownership rules", async ({ request }) => {
    const created = await createBoard(request, true);

    expect(created.board.settings.allowOnlyOwnMove).toBe(true);
    expect(created.board.settings.allowOnlyOwnDelete).toBe(true);
    expect(created.board.settings.allowOnlyOwnEdit).toBe(true);
    expect(created.board.settings.likesEnabled).toBe(true);
    expect(created.board.settings.maxNotesPerUser).toBe(10);
    expect(created.board.settings.maxBoardColumns).toBe(10);
    expect(created.board.settings.maxBoardRows).toBe(5);
    expect(created.board.settings.lineColumns).toBe(0);
    expect(created.board.settings.lineRows).toBe(0);
  });

  test("asks for a user name when opening a shared board link and reuses the stored suggestion", async ({ page, request }) => {
    const created = await createBoard(request, false);

    await page.addInitScript(() => {
      window.localStorage.setItem("sticky.userName", "Stored Name");
    });

    await page.goto(`./?board=${created.board.code}`, { waitUntil: "domcontentloaded" });

    const nameInput = page.locator('[data-role="direct-board-user-name"]');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue("Stored Name");

    await nameInput.fill("Alice");
    await page.locator('[data-action="submit-direct-board"]').click();

    await expect(page.locator(".board-viewport")).toBeVisible();

    const storedName = await page.evaluate(() => window.localStorage.getItem("sticky.userName"));
    expect(storedName).toBe("Alice");
  });

  test("shows the admin login icon only for management boards and allows PIN login", async ({ page, request }) => {
    const created = await createBoard(request, true);
    const code = created.board.code;

    const pinResponse = await request.post("./api.php?action=set_admin_pin", {
      data: {
        code,
        pin: "9876",
        adminToken: created.adminToken,
      },
    });
    expect(pinResponse.ok()).toBeTruthy();

    await page.goto("./", { waitUntil: "domcontentloaded" });
    await fillJoinCode(page, code);

    const adminButton = page.locator('[data-form="join-board"] [data-action="open-admin-login"]');
    await expect(adminButton).toBeVisible();

    await adminButton.click();

    const pinInputs = page.locator('[data-pin-digit="admin-login-modal"]');
    await expect(pinInputs).toHaveCount(4);

    await pinInputs.nth(0).fill("9");
    await expect(pinInputs.nth(1)).toBeFocused();
    await expect(pinInputs.nth(0)).toHaveValue("*");

    await pinInputs.nth(0).click();
    await pinInputs.nth(0).pressSequentially("9876");
    await expect(pinInputs.nth(0)).toHaveValue("*");
    await expect(pinInputs.nth(1)).toHaveValue("*");
    await expect(pinInputs.nth(2)).toHaveValue("*");
    await expect(pinInputs.nth(3)).toHaveValue("*");

    await pinInputs.nth(0).evaluate((input) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text", "9876");
      input.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true }));
    });

    await expect(pinInputs.nth(0)).toHaveValue("*");
    await expect(pinInputs.nth(1)).toHaveValue("*");
    await expect(pinInputs.nth(2)).toHaveValue("*");
    await expect(pinInputs.nth(3)).toHaveValue("*");

    await page.locator('[data-action="submit-admin-login"]').click();
    await expect(page.locator('[data-action="open-settings"]')).toBeVisible();
  });

  test("allows a regular user on a management board to promote to admin from the board toolbar", async ({ page, request }) => {
    const created = await createBoard(request, true);
    const code = created.board.code;

    const pinResponse = await request.post("./api.php?action=set_admin_pin", {
      data: {
        code,
        pin: "9876",
        adminToken: created.adminToken,
      },
    });
    expect(pinResponse.ok()).toBeTruthy();

    await page.goto("./", { waitUntil: "domcontentloaded" });
    await fillJoinCode(page, code);
    await page.locator('[data-form="join-board"] input[name="userName"]').fill("Regular User");
    await page.locator('[data-form="join-board"] button[type="submit"]').click();

    await expect(page.locator(".board-viewport")).toBeVisible();
    await expect(page.locator('[data-action="open-board-admin-login"]')).toBeVisible();

    await page.locator('[data-action="open-board-admin-login"]').click();
    const pinInputs = page.locator('[data-pin-digit="admin-login-modal"]');
    await expect(pinInputs).toHaveCount(4);

    await pinInputs.nth(0).pressSequentially("9876");
    await expect(pinInputs.nth(0)).toHaveValue("*");
    await expect(pinInputs.nth(1)).toHaveValue("*");
    await expect(pinInputs.nth(2)).toHaveValue("*");
    await expect(pinInputs.nth(3)).toHaveValue("*");

    await page.locator('[data-action="submit-admin-login"]').click();
    await expect(page.locator('[data-action="open-settings"]')).toBeVisible();
    await expect(page.locator('[data-action="open-board-admin-login"]')).toHaveCount(0);
  });

  test("does not show the admin login icon for normal boards", async ({ page, request }) => {
    const created = await createBoard(request, false);

    await page.goto("./", { waitUntil: "domcontentloaded" });
    await fillJoinCode(page, created.board.code);

    await expect(page.locator('[data-form="join-board"] [data-action="open-admin-login"]')).toBeHidden();
  });

  test("exports board notes as txt and csv", async ({ request }) => {
    const created = await createBoard(request, false);

    const noteResponse = await request.post("./api.php?action=create_note", {
      data: {
        code: created.board.code,
        clientId: "pw-export-user",
        author: "Exporter",
        content: "<b>Hello export</b>",
        color: "yellow",
        fontFamily: "comic",
        fontSize: 22,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        x: 120,
        y: 120,
        zIndex: 1,
      },
    });
    expect(noteResponse.ok()).toBeTruthy();

    const txtResponse = await request.get(`./api.php?action=export_board&code=${created.board.code}&format=txt`);
    expect(txtResponse.ok()).toBeTruthy();
    expect(txtResponse.headers()["content-type"]).toContain("text/plain");
    const txtBody = await txtResponse.text();
    expect(txtBody).toContain("Exporter");
    expect(txtBody).toContain("Hello export");

    const csvResponse = await request.get(`./api.php?action=export_board&code=${created.board.code}&format=csv`);
    expect(csvResponse.ok()).toBeTruthy();
    expect(csvResponse.headers()["content-type"]).toContain("text/csv");
    const csvBody = await csvResponse.text();
    expect(csvBody).toContain("author,content,likes,color,x,y,updatedAt");
    expect(csvBody).toContain("Exporter");
  });
});
