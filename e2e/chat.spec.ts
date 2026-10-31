import { expect, openRoom, send, signIn, state, test } from "./fixtures"

test("two users see each other's messages in one room", async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await signIn(pageA, state().emailA)
  await openRoom(pageA, state().generalRoomId)
  await signIn(pageB, state().emailB)
  await openRoom(pageB, state().generalRoomId)

  const fromA = `hello from A ${Date.now()}`
  await send(pageA, fromA)
  await expect(pageA.getByTestId("message").filter({ hasText: fromA })).toBeVisible()
  await expect(pageB.getByTestId("message").filter({ hasText: fromA })).toBeVisible({
    timeout: 30_000,
  })

  const fromB = `hello from B ${Date.now()}`
  await send(pageB, fromB)
  await expect(pageA.getByTestId("message").filter({ hasText: fromB })).toBeVisible({
    timeout: 30_000,
  })

  await contextA.close()
  await contextB.close()
})
