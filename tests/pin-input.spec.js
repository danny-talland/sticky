const { test, expect } = require("@playwright/test");

async function createBoard(request, supervisedMode) {
  const clientId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post("./api.php?action=create_board", {
    data: {
      title: `PW ${supervisedMode ? "Supervised" : "Open"} Board`,
      supervisedMode,
      teacherName: "Playwright",
      clientId,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe("existing board access", () => {
  test("shows the admin login icon only for supervised boards and allows PIN login", async ({ page, request }) => {
    const created = await createBoard(request, true);
    const code = created.board.code;

    const pinResponse = await request.post("./api.php?action=set_teacher_pin", {
      data: {
        code,
        pin: "9876",
        teacherToken: created.teacherToken,
      },
    });
    expect(pinResponse.ok()).toBeTruthy();

    await page.goto("./", { waitUntil: "domcontentloaded" });
    await page.locator('[data-form="join-board"] input[name="code"]').fill(code);

    const adminButton = page.locator('[data-form="join-board"] [data-action="open-teacher-login"]');
    await expect(adminButton).toBeVisible();

    await adminButton.click();

    const pinInputs = page.locator('[data-pin-digit="teacher-login-modal"]');
    await expect(pinInputs).toHaveCount(4);

    await pinInputs.nth(0).fill("9");
    await expect(pinInputs.nth(1)).toBeFocused();

    await pinInputs.nth(0).click();
    await pinInputs.nth(0).pressSequentially("9876");
    await expect(pinInputs.nth(0)).toHaveValue("9");
    await expect(pinInputs.nth(1)).toHaveValue("8");
    await expect(pinInputs.nth(2)).toHaveValue("7");
    await expect(pinInputs.nth(3)).toHaveValue("6");

    await pinInputs.nth(0).evaluate((input) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text", "9876");
      input.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true }));
    });

    await expect(pinInputs.nth(0)).toHaveValue("9");
    await expect(pinInputs.nth(1)).toHaveValue("8");
    await expect(pinInputs.nth(2)).toHaveValue("7");
    await expect(pinInputs.nth(3)).toHaveValue("6");

    await page.locator('[data-action="submit-teacher-login"]').click();
    await expect(page.locator('[data-action="open-settings"]')).toBeVisible();
  });

  test("does not show the admin login icon for normal boards", async ({ page, request }) => {
    const created = await createBoard(request, false);

    await page.goto("./", { waitUntil: "domcontentloaded" });
    await page.locator('[data-form="join-board"] input[name="code"]').fill(created.board.code);

    await expect(page.locator('[data-form="join-board"] [data-action="open-teacher-login"]')).toBeHidden();
  });
});
