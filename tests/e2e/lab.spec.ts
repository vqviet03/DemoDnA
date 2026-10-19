import { test, expect, type Page } from "@playwright/test";
async function openLab(page: Page) {
  await page.goto("./");
  await expect(page.locator(".lab-app")).toHaveAttribute("data-ready", "true");
}
test("six lessons and every operation render without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await openLab(page);
  for (const name of [
    "ArrayList",
    "LinkedList",
    "Stack",
    "Queue",
    "Tree / BST",
    "Graph",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: new RegExp(name.replace("/", "\\/")) })
      .click();
    const operations = await page
      .getByLabel("Chọn thao tác")
      .locator("option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    for (const operation of operations) {
      await page.getByLabel("Chọn thao tác").selectOption(operation);
      const timeline = page.getByLabel("Timeline", { exact: true });
      const max = await timeline.getAttribute("max");
      await timeline.fill(max!);
      await expect(page.locator(".execution")).toHaveAttribute(
        "data-status",
        "completed",
      );
      await expect(page.locator(".executing")).toHaveCount(1);
      await expect(page.getByTestId("console")).not.toBeEmpty();
    }
  }
  expect(errors).toEqual([]);
});
test("Next, Previous, timeline and restart keep debugger and code synchronized", async ({
  page,
}) => {
  await openLab(page);
  const next = page.getByRole("button", { name: "Next Step", exact: true });
  const previous = page.getByRole("button", {
    name: "Previous Step",
    exact: true,
  });
  await next.click();
  await expect(page.getByTestId("step-counter")).toHaveText("02");
  await expect(next).toBeEnabled();
  const vars = await page.getByTestId("variables").textContent();
  const title = await page.getByTestId("step-title").innerText();
  const line = await page.locator(".executing").getAttribute("data-line");
  await previous.click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByTestId("variables")).toHaveText(vars!);
  await expect(page.getByTestId("step-title")).toHaveText(title);
  await expect(page.locator(".executing")).toHaveAttribute("data-line", line!);
  await page.getByLabel("Timeline", { exact: true }).fill("6");
  await expect(page.getByTestId("step-counter")).toHaveText("07");
  await expect(page.getByTestId("variables")).toContainText("86");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByTestId("step-counter")).toHaveText("01");
});
test("play, pause, speeds, completion and tab switching clean up timers", async ({
  page,
}) => {
  await openLab(page);
  await page.getByLabel("Playback speed").selectOption("2");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("step-counter")).not.toHaveText("01");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const counter = await page.getByTestId("step-counter").innerText();
  await page.waitForTimeout(900);
  await expect(page.getByTestId("step-counter")).toHaveText(counter);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Queue/ })
    .click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Stack/ })
    .click();
  await page.waitForTimeout(900);
  await expect(page.getByTestId("step-counter")).toHaveText("01");
  const timeline = page.getByLabel("Timeline", { exact: true });
  const max = Number(await timeline.getAttribute("max"));
  await timeline.fill(String(max - 1));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".execution")).toHaveAttribute(
    "data-status",
    "completed",
  );
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeDisabled();
});
test("breakpoints pause at active Java line and syntax uses real Java tokens", async ({
  page,
}) => {
  await openLab(page);
  await expect(page.locator(".token.keyword").first()).toBeVisible();
  await expect(page.locator(".token.class-name").first()).toBeAttached();
  // Step 2 executes line 7 (parameters) in the generated DynamicArray demo.
  await page.getByLabel("Breakpoint dòng 7", { exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("step-counter")).toHaveText("02");
  await expect(page.locator(".execution")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await expect(page.locator(".executing")).toHaveAttribute("data-line", "7");
});
test("theme, presentation, theory dialog and keyboard work", async ({
  page,
}) => {
  await openLab(page);
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByRole("navigation")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("button", { name: /Lý thuyết/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("h1").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("step-counter")).toHaveText("02");
  await expect(page.locator(".execution")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await page.keyboard.press("r");
  await expect(page.getByTestId("step-counter")).toHaveText("01");
});
test("array parameters are applied and graph adjacency stays available", async ({
  page,
}) => {
  await openLab(page);
  await page.getByLabel("Index", { exact: true }).fill("0");
  await page.getByLabel("Value", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  const timeline = page.getByLabel("Timeline", { exact: true });
  await timeline.fill((await timeline.getAttribute("max"))!);
  await expect(page.getByTestId("console")).toContainText("[123, 11, 18");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Graph/ })
    .click();
  await page.locator("summary").click();
  await expect(page.locator(".adjacency")).toContainText("Final Project");
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
});
test("stable array identity visibly moves between slots", async ({ page }) => {
  await openLab(page);
  await page.getByLabel("Timeline", { exact: true }).fill("3");
  const node = page.locator('[data-node="a-9"]');
  const before = await node.evaluate(
    (el) => new DOMMatrix(getComputedStyle(el).transform).e,
  );
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.getByTestId("step-counter")).toHaveText("05");
  await expect
    .poll(() =>
      node.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e),
    )
    .toBeGreaterThan(before + 20);
  await expect(
    page.getByRole("button", { name: "Next Step", exact: true }),
  ).toBeEnabled();
  await expect(page.locator('[data-node="a-9"]')).toHaveCount(1);
});
test("fonts, active code visibility and reduced-motion remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url());
  });
  await openLab(page);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('13px "JetBrains Mono"') &&
        document.fonts.check('13px "Inter"'),
    ),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Tree/ })
    .click();
  await page.getByLabel("Timeline", { exact: true }).fill("8");
  const visible = await page.locator(".executing").evaluate((el) => {
    const viewport = el.closest(".code-scroll")!;
    const a = el.getBoundingClientRect(),
      b = viewport.getBoundingClientRect();
    return a.top >= b.top && a.bottom <= b.bottom;
  });
  expect(visible).toBe(true);
  expect(missing).toEqual([]);
});
