import { test, expect, type Page } from "@playwright/test";
import { generateGridRun } from "../../src/grid/replay";
const input = "1\n3 3\n0 2 0\n0 0 0\n2 0 0";
async function open(page: Page) {
  await page.goto("./grid/");
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
}
async function enter(page: Page, text: string) {
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await page.getByLabel("Grid input", { exact: true }).fill(text);
  await page
    .getByRole("button", { name: "Áp dụng & tạo replay", exact: true })
    .click();
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
}
async function panel(page: Page, name: string) {
  const tab = page.getByRole("tab", { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
async function font(page: Page) {
  return page
    .locator(".code-scroll pre")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
}
async function activeCodeVisible(page: Page) {
  await expect
    .poll(
      () =>
        page.locator(".code-line.executing").evaluate((el) => {
          const a = el.getBoundingClientRect(),
            b = el.closest(".code-scroll")!.getBoundingClientRect();
          return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
        }),
      { timeout: 1500 },
    )
    .toBe(true);
}

test("font controls and projector mode preserve the current debug step, visible source and dataset", async ({
  page,
}, info) => {
  await open(page);
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1366, height: 768 });
  await enter(page, input);
  const run = generateGridRun(input, "collect", "row"),
    index = run.steps.findIndex((s) => s.marker === "value");
  await page.getByLabel("Grid timeline", { exact: true }).fill(String(index));
  await panel(page, "Code");
  const initial = await font(page),
    variables = await page.getByTestId("grid-variables").textContent();
  await page.getByRole("button", { name: "Tăng cỡ chữ", exact: true }).click();
  expect(await font(page)).toBeGreaterThan(initial);
  await expect(page.getByLabel("Grid timeline", { exact: true })).toHaveValue(
    String(index),
  );
  await expect(page.getByTestId("grid-variables")).toHaveText(variables!);
  await activeCodeVisible(page);
  const globalScale = await page
    .getByLabel("Mức phóng chữ", { exact: true })
    .textContent();
  const bigger = await font(page);
  await page
    .getByRole("button", { name: "Tăng chữ code", exact: true })
    .click();
  expect(await font(page)).toBeGreaterThan(bigger);
  await expect(page.getByLabel("Mức phóng chữ", { exact: true })).toHaveText(
    globalScale!,
  );
  await activeCodeVisible(page);
  await page
    .getByRole("button", { name: "Trình chiếu Grid", exact: true })
    .click();
  await expect(page.getByLabel("Mức phóng chữ", { exact: true })).toHaveText(
    "140%",
  );
  expect(await font(page)).toBe(21);
  await expect(
    page.getByRole("button", { name: "Ngắt dòng code", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page
      .locator(".code-scroll")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await expect(page.getByLabel("Grid timeline", { exact: true })).toHaveValue(
    String(index),
  );
  await activeCodeVisible(page);
  await noOverflow(page);
  if (info.project.name === "desktop") {
    expect(
      (await page.locator(".gl-results-slot").boundingBox())!.height,
    ).toBeLessThan(45);
    expect(
      (await page.locator(".gl-memory-slot").boundingBox())!.height,
    ).toBeGreaterThan(210);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Trình chiếu Grid", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Grid timeline", { exact: true })).toHaveValue(
    String(index),
  );
});
test("display preferences resize memory and grid, persist through reload and keep viewport compact", async ({
  page,
}, info) => {
  await open(page);
  await page.locator(".gl-display-popover>summary").click();
  await page.getByLabel("Cỡ chữ nội dung", { exact: true }).fill("125");
  await page.getByLabel("Chiều cao vùng bộ nhớ", { exact: true }).fill("40");
  await page.getByLabel("Mức phóng grid", { exact: true }).fill("150");
  await expect(page.locator(".gl-board-canvas")).toHaveClass(/gl-grid-zoomed/);
  expect(
    await page
      .locator(".gl-grid-surface")
      .evaluate((el) => el.clientWidth > el.parentElement!.clientWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Grid vừa khung", exact: true })
    .click();
  await expect(page.locator(".gl-board-canvas")).not.toHaveClass(
    /gl-grid-zoomed/,
  );
  await noOverflow(page);
  if (info.project.name === "desktop") {
    const before = (await page.locator(".gl-memory-slot").boundingBox())!
      .height;
    await page
      .getByRole("button", { name: "Mở rộng vùng bộ nhớ", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await page.locator(".gl-memory-slot").boundingBox())!.height,
      )
      .toBeGreaterThan(before);
  }
  await page.reload();
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  await expect(page.getByLabel("Mức phóng chữ", { exact: true })).toHaveText(
    "125%",
  );
  await panel(page, "Code");
  expect(await font(page)).toBe(19);
  await page
    .getByLabel("Cách duyệt Grid", { exact: true })
    .selectOption("snake");
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  await expect(page.getByLabel("Mức phóng chữ", { exact: true })).toHaveText(
    "125%",
  );
  expect(await font(page)).toBe(19);
  await noOverflow(page);
});
test("visited writes, current-node logic and result phases stay visible as outputs are collapsed", async ({
  page,
}, info) => {
  await open(page);
  await page.getByLabel("Bài toán Grid", { exact: true }).selectOption("reach");
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  const text = "1\n3 3\n0 0 2 2\n0 0 0\n0 1 0\n0 0 0";
  await enter(page, text);
  const run = generateGridRun(text, "reach", "bfs");
  const mark = run.steps.findIndex((s) => s.marker === "markSeen");
  await page.getByLabel("Grid timeline", { exact: true }).fill(String(mark));
  await panel(page, "Bộ nhớ");
  await expect(
    page.getByRole("table", { name: "seen memory", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "seen memory", exact: true })
      .locator("td.written"),
  ).toContainText("T");
  await panel(page, "Bước");
  await expect(
    page.locator(
      info.project.name === "desktop"
        ? ".gl-stage-inspector .gl-node-progress"
        : ".gl-mobile-explanation .gl-node-progress",
    ),
  ).toContainText("điểm dừng");
  const returned = run.steps.findIndex(
    (s) => s.marker === "solveCall" && s.scopes.main.result,
  );
  await page
    .getByLabel("Grid timeline", { exact: true })
    .fill(String(returned));
  await expect(page.getByTestId("grid-live-result")).toHaveAttribute(
    "data-result-phase",
    "returned",
  );
  await expect(page.getByTestId("grid-live-result")).toContainText("YES");
  await expect(page.getByTestId("grid-actual-0")).toHaveText(
    "— đang chờ print",
  );
  if (info.project.name === "desktop") {
    await page.getByRole("button", { name: "Play Grid", exact: true }).click();
    await page
      .getByRole("button", { name: "Output / Thống kê ↗", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Output / Thống kê", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".gl-session")).toHaveAttribute(
      "data-playback-status",
      "paused",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "↗ tới output", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else {
    await panel(page, "Output");
    await page
      .getByRole("button", { name: "↗ tới output", exact: true })
      .click();
  }
  await expect(page.getByTestId("grid-live-result")).toHaveAttribute(
    "data-result-phase",
    "printed",
  );
  await expect(page.getByTestId("grid-actual-0")).toHaveText("YES");
  await expect(page.getByTestId("grid-live-result")).toContainText("MATCH");
  await noOverflow(page);
});
