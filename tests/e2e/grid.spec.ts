import { test, expect, type Page } from "@playwright/test";
import { generateGridRun } from "../../src/grid/replay";
async function open(page: Page) {
  await page.goto("./grid/");
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
}
async function panel(page: Page, name: string) {
  const tab = page.getByRole("tab", { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
async function input(page: Page, text: string, expected = "") {
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await page.getByLabel("Grid input", { exact: true }).fill(text);
  await page.getByLabel("Grid expected", { exact: true }).fill(expected);
  await page
    .getByRole("button", { name: "Áp dụng & tạo replay", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
}
const small = "2\n2 3\n0 2 0\n2 0 0\n1 2\n0 2";
test("multi-case judge input, actual is printed at println and manual expected cannot replace it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await input(page, small, "999\n1");
  await panel(page, "Output");
  await expect(page.getByTestId("grid-actual-0")).toHaveText(
    "— đang chờ print",
  );
  await page
    .getByRole("button", { name: "Chạy hết Grid", exact: true })
    .click();
  await expect(page.getByTestId("grid-actual-0")).toHaveText("2");
  await expect(page.getByTestId("grid-actual-1")).toHaveText("1");
  await expect(page.locator(".gl-output-table")).toContainText("MISMATCH");
  await expect(page.locator(".gl-output-table")).toContainText("MATCH");
  await expect(page.locator(".gl-session")).toHaveAttribute(
    "data-playback-status",
    "completed",
  );
  await expect(page.locator(".gl-stat-section")).toContainText("8 ô");
  expect(errors).toEqual([]);
});
test("statement replay keeps current cell, code, scopes and memory synchronized through Previous and Next", async ({
  page,
}) => {
  await open(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await input(page, small);
  const run = generateGridRun(small, "collect", "row");
  const index = run.steps.findIndex((s) => s.marker === "value");
  const step = run.steps[index];
  await page.getByLabel("Grid timeline", { exact: true }).fill(String(index));
  await expect(page.locator(".gl-session")).toHaveAttribute(
    "data-step-marker",
    "value",
  );
  await expect(
    page.locator('.gl-board-canvas [data-cell="0,0"]'),
  ).toHaveAttribute("data-cell-status", "current");
  await panel(page, "Code");
  await expect(page.locator(".code-line.executing")).toHaveAttribute(
    "data-line",
    String(step.activeLines[0]),
  );
  await expect(page.locator(".code-line.executing")).toContainText(
    "int value = grid[r][c]",
  );
  await expect(page.locator(".editor-breadcrumb")).toContainText("solve(...)");
  await panel(page, "Biến");
  await expect(page.getByTestId("grid-variables")).toContainText(
    "LOCAL · solve",
  );
  await page.getByLabel("Previous Grid step", { exact: true }).click();
  await expect(
    page.getByLabel("Next Grid step", { exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Next Grid step", { exact: true }).click();
  await expect(page.getByLabel("Grid timeline", { exact: true })).toHaveValue(
    String(index),
  );
  await panel(page, "Bộ nhớ");
  await expect(
    page.getByRole("table", { name: "grid memory", exact: true }),
  ).toContainText("2");
  await page.getByLabel("Chạy hết Grid", { exact: true }).click();
  await panel(page, "Biến");
  await expect(page.getByTestId("grid-variables")).not.toContainText(
    "LOCAL · solve",
  );
});
test("invalid input is atomic, map tools change the shared input and test dimensions", async ({
  page,
}) => {
  await open(page);
  await input(page, "1\n2 2\n0 0\n0 0");
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await page.getByLabel("Grid input", { exact: true }).fill("1\n2 2\n0");
  await page
    .getByRole("button", { name: "Áp dụng & tạo replay", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Thiếu",
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Chỉnh bản đồ", exact: true }).click();
  await page.getByRole("button", { name: "Vật phẩm · 2", exact: true }).click();
  await page.getByRole("dialog").locator('[data-cell="0,1"]').click();
  await page.getByLabel("Số cột", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Áp dụng bản đồ", exact: true })
    .click();
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  await page.getByLabel("Chạy hết Grid", { exact: true }).click();
  await panel(page, "Output");
  await expect(page.getByTestId("grid-actual-0")).toHaveText("1");
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await expect(page.getByLabel("Grid input", { exact: true })).toHaveValue(
    "1\n2 3\n0 2 0\n0 0 0",
  );
});
test("all traversal modes and grid problems produce Java-equivalent results", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  for (const [problem, algorithms] of [
    ["collect", ["row", "column", "snake", "linear"]],
    ["find", ["row", "column", "snake", "linear"]],
    ["reach", ["bfs", "dfs"]],
    ["shortest", ["bfs"]],
    ["islands", ["bfs", "dfs"]],
  ] as const) {
    await page
      .getByLabel("Bài toán Grid", { exact: true })
      .selectOption(problem);
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    for (const algorithm of algorithms) {
      await page
        .getByLabel("Cách duyệt Grid", { exact: true })
        .selectOption(algorithm);
      await expect(page.locator(".grid-lab")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await page.getByLabel("Chạy hết Grid", { exact: true }).click();
      await panel(page, "Output");
      await expect(page.locator(".gl-output-table .match")).toHaveCount(2);
    }
  }
  expect(errors).toEqual([]);
});
test("BFS queue and DFS stack show real waiting nodes, neighbors, and scope changes", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Bài toán Grid", { exact: true }).selectOption("reach");
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
  const text = "1\n3 3\n0 0 2 2\n0 0 0\n0 1 0\n0 0 0";
  await input(page, text);
  for (const algorithm of ["bfs", "dfs"] as const) {
    await page
      .getByLabel("Cách duyệt Grid", { exact: true })
      .selectOption(algorithm);
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const run = generateGridRun(text, "reach", algorithm);
    const at = run.steps.findIndex(
      (s) => s.marker === "push" && s.memory.frontier.length >= 2,
    );
    expect(at).toBeGreaterThan(0);
    await page.getByLabel("Grid timeline", { exact: true }).fill(String(at));
    await panel(page, "Bộ nhớ");
    await expect(page.getByTestId("grid-frontier").locator("b")).toHaveCount(
      run.steps[at].memory.frontier.length,
    );
    await expect(page.locator(".gl-frontier-caption")).toContainText(
      algorithm === "bfs" ? "QUEUE" : "STACK",
    );
    await expect(
      page.locator(".gl-board-canvas [data-cell-status=queued]"),
    ).not.toHaveCount(0);
    await panel(page, "Bước");
    await expect(page.locator(".gl-neighbor-edge")).toHaveCount(1);
    expect(
      await page
        .locator(".gl-neighbor-edge")
        .evaluate(
          (el) =>
            getComputedStyle(el).stroke !== "none" &&
            el.getAttribute("y1") !== el.getAttribute("y2"),
        ),
    ).toBe(true);
    await page.getByLabel("Chạy hết Grid", { exact: true }).click();
    await panel(page, "Output");
    await expect(page.getByTestId("grid-actual-0")).toHaveText("YES");
  }
});
test("playback pauses on popup, breakpoint and completion, theme and viewport remain usable", async ({
  page,
}) => {
  await open(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await input(page, "1\n1 2\n0 2");
  await page.getByLabel("Tốc độ Grid", { exact: true }).selectOption("8");
  await panel(page, "Code");
  await page.getByLabel("Next Grid step", { exact: true }).click();
  await expect(
    page.getByLabel("Next Grid step", { exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Restart Grid", exact: true }).click();
  const line = generateGridRun("1\n1 2\n0 2", "collect", "row").steps[1]
    .activeLines[0];
  await page
    .getByRole("button", { name: `Breakpoint dòng ${line}`, exact: true })
    .click();
  await page.getByLabel("Play Grid", { exact: true }).click();
  await expect(page.locator(".gl-session")).toHaveAttribute(
    "data-step-marker",
    "tokensInitial",
  );
  await expect(page.locator(".gl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await page
    .getByRole("button", { name: `Breakpoint dòng ${line}`, exact: true })
    .click();
  await page.getByLabel("Play Grid", { exact: true }).click();
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await expect(page.locator(".gl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Chạy hết Grid", { exact: true }).click();
  const count = await page.getByTestId("grid-step-count").textContent();
  await page.waitForTimeout(180);
  await expect(page.getByTestId("grid-step-count")).toHaveText(count!);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("desktop code splitters resize with mouse and keyboard; mobile code remains visible in its tab", async ({
  page,
}, testInfo) => {
  await open(page);
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1366, height: 768 });
    const code = page.locator(".gl-code-slot"),
      before = await code.boundingBox();
    const split = page.getByRole("separator", {
      name: "Điều chỉnh chiều rộng code",
      exact: true,
    });
    const box = (await split.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 160, box.y + box.height / 2);
    await page.mouse.up();
    expect((await code.boundingBox())!.width).toBeGreaterThan(
      before!.width + 100,
    );
    const horizontal = page.getByRole("separator", {
      name: "Điều chỉnh chiều cao code",
      exact: true,
    });
    const initialHeight = Number(
      await horizontal.getAttribute("aria-valuenow"),
    );
    await horizontal.focus();
    await page.keyboard.press("ArrowDown");
    expect(Number(await horizontal.getAttribute("aria-valuenow"))).toBe(
      initialHeight + 3,
    );
    expect((await code.boundingBox())!.height).toBeGreaterThan(before!.height);
    await split.focus();
    await page.keyboard.press("ArrowRight");
  } else {
    await panel(page, "Code");
    await expect(page.locator(".code-panel")).toBeVisible();
    expect(
      (await page.locator(".code-scroll").boundingBox())!.height,
    ).toBeGreaterThan(100);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("standalone Grid route avoids loading the old page bundle and links back without breaking it", async ({
  page,
  request,
}) => {
  const html = await (await request.get("./")).text();
  const oldPage = html.match(/src="([^"]*\/app\/page-[^"]+\.js)"/)?.[1];
  expect(oldPage).toBeTruthy();
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(new URL(r.url()).pathname);
  });
  await open(page);
  expect(scripts).not.toContain(oldPage);
  await page
    .getByRole("link", { name: "Về Structure Lab", exact: true })
    .click();
  await expect(page.locator(".lab-app")).toHaveAttribute("data-ready", "true");
  await page.getByRole("link", { name: "Grid Lab ↗", exact: true }).click();
  await expect(page.locator(".grid-lab")).toHaveAttribute("data-ready", "true");
});
