import { expect, openRoom, send, signIn, state, test } from "./fixtures"

test("mention queue runs agents sequentially in mention order", async ({ page }) => {
  await signIn(page, state().emailA)
  await openRoom(page, state().generalRoomId)

  const prompt = `@e2e-a @e2e-b give one sentence about deterministic turn order. ${Date.now()}`
  await send(page, prompt)

  const agentMessages = page.locator('[data-testid="message"][data-sender-type="agent"]')
  await expect(agentMessages.nth(0)).toHaveAttribute("data-status", "complete", {
    timeout: 150_000,
  })
  await expect(agentMessages.nth(1)).toHaveAttribute("data-status", "complete", {
    timeout: 150_000,
  })
  const handles = await agentMessages.evaluateAll((nodes) =>
    nodes.slice(0, 2).map((node) => node.getAttribute("data-sender-handle")),
  )
  expect(handles).toEqual(["e2e-a", "e2e-b"])
  await expect(page.getByTestId("system-message").filter({ hasText: "turn cap" })).toHaveCount(0)
})

test("a turn cap of one halts before the second mentioned agent", async ({ page }) => {
  await signIn(page, state().emailA)
  await openRoom(page, state().capRoomId)

  await send(page, `@e2e-a @e2e-b compare the two plans. ${Date.now()}`)

  const halt = page.getByTestId("system-message").filter({ hasText: "turn cap of 1" })
  await expect(halt).toBeVisible({ timeout: 150_000 })

  const agentMessages = page.locator('[data-testid="message"][data-sender-type="agent"]')
  await expect(agentMessages).toHaveCount(1, { timeout: 30_000 })
  await expect(agentMessages.first()).toHaveAttribute("data-sender-handle", "e2e-a")
})
