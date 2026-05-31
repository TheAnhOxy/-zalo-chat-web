import { test, expect } from "@playwright/test";

/**
 * E2E flows require a running backend + seeded auth.
 * Set E2E_ACCESS_TOKEN, E2E_CONVERSATION_ID, E2E_USER_ID in env to run full flows.
 * Without env, smoke tests verify route shell only.
 */

test.describe("Chat 1-v-1", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/chat/test-conversation-id");
    await expect(page).toHaveURL(/login/);
  });

  test("open chat and send text", async ({ page, context }) => {
    test.skip(!process.env.E2E_ACCESS_TOKEN, "requires E2E_ACCESS_TOKEN");
    const token = process.env.E2E_ACCESS_TOKEN!;
    const conversationId = process.env.E2E_CONVERSATION_ID!;

    await context.addInitScript((t) => {
      localStorage.setItem(
        "quickchat_tokens",
        JSON.stringify({ accessToken: t, refreshToken: "e2e-refresh" })
      );
      localStorage.setItem(
        "quickchat_user",
        JSON.stringify({
          _id: process.env.E2E_USER_ID || "e2e-user",
          email: "e2e@test.com",
          fullName: "E2E User",
        })
      );
    }, token);

    await page.goto(`/chat/${conversationId}`);
    await expect(page.getByLabelText(/Nhập tin nhắn/i)).toBeVisible();

    const unique = `e2e-${Date.now()}`;
    await page.getByLabelText(/Nhập tin nhắn/i).fill(unique);
    await page.getByLabelText(/Gửi/i).click();
    await expect(page.getByText(unique)).toBeVisible({ timeout: 10000 });
  });
});
