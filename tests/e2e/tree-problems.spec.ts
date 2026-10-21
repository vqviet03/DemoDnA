import { test, expect, type Page } from "@playwright/test";
import { TREE_PROBLEMS, type TreeProblem } from "../../src/problems/tree/types";
import { TREE_SAMPLES, parseTreeInput } from "../../src/problems/tree/input";
import { generateTreeRun } from "../../src/problems/tree/replay";

async function ready(page: Page) {
  await expect(page.locator(".tree-problem-lab")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function open(page: Page, p: TreeProblem = "leaves") {
  await page.goto(`./problems/#${p === "leaves" ? "bai-9" : "bai-10"}`);
  await ready(page);
}
async function seek(page: Page, index: number) {
  await page
    .getByLabel("Timeline bài cây", { exact: true })
    .fill(String(index));
}
async function panel(page: Page, name: string) {
  const tab = page.getByRole("button", { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
const leaves = generateTreeRun(
  parseTreeInput(TREE_SAMPLES.leaves.input, "leaves")[0],
  "leaves",
  "degree",
);
const bfs = generateTreeRun(
  parseTreeInput(TREE_SAMPLES.depth.input, "depth")[0],
  "depth",
  "depth-bfs",
);

for (const p of ["leaves", "depth"] as const)
  test(`${p}: all four Java methods match every PDF testcase`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, p);
    for (const method of TREE_PROBLEMS[p].methods) {
      await page
        .getByLabel("Cách giải bài PDF", { exact: true })
        .selectOption(method);
      await ready(page);
      await page.getByRole("button", { name: /^Kết quả ·/ }).click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", { name: "Chạy cả bộ test", exact: true })
        .click();
      await expect(dialog.locator(".pl-pass")).toHaveCount(
        p === "leaves" ? 3 : 2,
      );
      await expect(dialog.locator(".pl-fail")).toHaveCount(0);
      for (const [i, line] of TREE_SAMPLES[p].expected.split("\n").entries())
        await expect(dialog.locator("tbody tr").nth(i)).toContainText(line);
      await dialog
        .getByRole("button", { name: "Về debugger", exact: true })
        .click();
    }
    expect(errors).toEqual([]);
  });
test("builds edges and updates degree, Java line and Watch from the same snapshot", async ({
  page,
}) => {
  await open(page);
  const index = leaves.steps.findIndex((s) => s.marker === "degreeInc");
  await seek(page, index);
  await expect(page.locator('[data-tree-edge="1-2"]')).toHaveAttribute(
    "data-edge-active",
    "true",
  );
  await expect(
    page
      .getByRole("table", { name: "Bộ nhớ degree", exact: true })
      .locator("tbody tr")
      .first(),
  ).toContainText("1");
  const title = await page.getByTestId("tree-step-title").textContent();
  await page.getByLabel("Previous bài cây", { exact: true }).click();
  await expect(page.getByLabel("Next bài cây", { exact: true })).toBeEnabled();
  await page.getByLabel("Next bài cây", { exact: true }).click();
  await expect(page.getByTestId("tree-step-title")).toHaveText(title!);
  await panel(page, "Java");
  await expect(page.locator(".code-line.executing")).toContainText(
    "degree[u]++",
  );
  await expect(page.locator(".code-line.executing .token.keyword")).toHaveCount(
    0,
  );
  await panel(page, "Variables");
  await expect(page.locator(".gl-watch")).toContainText("degree");
  await expect(page.locator(".gl-watch")).toContainText("edge");
});
test("BFS shows FIFO, computes depth, then separately answers and prints queries", async ({
  page,
}) => {
  await open(page, "depth");
  await page
    .getByLabel("Cách giải bài PDF", { exact: true })
    .selectOption("depth-bfs");
  await ready(page);
  const index = bfs.steps.findIndex(
    (s) => s.marker === "push" && s.scene.frontier.join(",") === "2,3",
  );
  await seek(page, index);
  await expect(page.locator("[data-frontier-node]")).toHaveCount(2);
  await expect(page.locator("[data-frontier-node]").first()).toContainText("2");
  await expect(page.locator("[data-frontier-node]").first()).toContainText(
    "FRONT",
  );
  await expect(page.locator('[data-tree-node="3"]')).toContainText("d = 1");
  await expect(page.locator('[data-tree-query="0"]')).toHaveText("—");
  await expect(page.getByTestId("tree-output")).toHaveText("Chưa println");
  await seek(
    page,
    bfs.steps.findIndex((s) => s.marker === "answerWrite"),
  );
  await expect(page.locator('[data-tree-query="0"]')).toHaveText("0 ✓");
  await expect(page.locator('[data-tree-query="1"]')).toHaveText("—");
  await page.getByRole("button", { name: "Kết quả ↗", exact: true }).click();
  await expect(page.getByTestId("tree-output")).toHaveText("#1: 0 2 1");
  await expect(page.getByLabel("Play bài cây", { exact: true })).toBeDisabled();
});
test("current cursor moves between nodes and a Java breakpoint pauses autoplay", async ({
  page,
}) => {
  await open(page, "depth");
  await page
    .getByLabel("Cách giải bài PDF", { exact: true })
    .selectOption("depth-bfs");
  await ready(page);
  const at = bfs.steps.findIndex(
    (s) => s.marker === "pop" && s.scene.current === 2,
  );
  await seek(page, at - 1);
  const cursor = page.locator(".tl-current-ring");
  const from = Number(await cursor.getAttribute("cy"));
  await page.getByLabel("Next bài cây", { exact: true }).click();
  await page.waitForTimeout(100);
  const during = Number(await cursor.getAttribute("cy"));
  expect(during).toBeGreaterThan(from);
  expect(during).toBeLessThan(122);
  await expect(page.getByLabel("Next bài cây", { exact: true })).toBeEnabled();
  await expect(cursor).toHaveAttribute("cy", "122");
  await panel(page, "Java");
  const line = bfs.steps[at + 1].activeLines[0];
  await page
    .getByRole("button", { name: `Breakpoint dòng ${line}`, exact: true })
    .click();
  await page.getByLabel("Play bài cây", { exact: true }).click();
  await expect(page.locator(".tl-session")).toHaveAttribute(
    "data-step-marker",
    bfs.steps[at + 1].marker,
  );
  await expect(page.getByLabel("Play bài cây", { exact: true })).toBeVisible();
  const stopped = await page.getByTestId("tree-step-count").textContent();
  await page.waitForTimeout(850);
  await expect(page.getByTestId("tree-step-count")).toHaveText(stopped!);
});
test("query and node focus can jump repeatedly to the same target", async ({
  page,
}) => {
  await open(page, "depth");
  await page.getByRole("button", { name: "Xem query", exact: true }).click();
  await ready(page);
  await expect(page.locator(".tl-session")).toHaveAttribute(
    "data-step-marker",
    "queryX",
  );
  await page.getByLabel("Restart bài cây", { exact: true }).click();
  await page.getByRole("button", { name: "Xem query", exact: true }).click();
  await ready(page);
  await expect(page.locator(".tl-session")).toHaveAttribute(
    "data-step-marker",
    "queryX",
  );
  await page.getByLabel("ID nút cần phân tích", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Xem node", exact: true }).click();
  await ready(page);
  await expect(page.locator('[data-tree-node="4"]')).toBeVisible();
  await expect(page.locator(".tl-session")).not.toHaveAttribute(
    "data-step-marker",
    "tests",
  );
});
test("invalid input is atomic and incorrect expected stays independent", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await page
    .getByLabel("Input bài cây", { exact: true })
    .fill("1\n3\n1 2\n1 2");
  await page
    .getByRole("button", { name: "Áp dụng input", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "nhiều cha",
  );
  await page.getByLabel("Input bài cây", { exact: true }).fill("1\n1");
  await page.getByLabel("Expected bài cây", { exact: true }).fill("#1: 9");
  await page
    .getByRole("button", { name: "Áp dụng input", exact: true })
    .click();
  await ready(page);
  await page.getByRole("button", { name: "Kết quả ↗", exact: true }).click();
  await expect(page.getByTestId("tree-leaf-count")).toHaveText("1");
  await expect(page.getByTestId("tree-output")).toHaveText("#1: 1");
  await page.getByRole("button", { name: /^Kết quả ·/ }).click();
  await expect(
    page.getByRole("table", { name: "Expected Actual bài cây" }),
  ).toContainText("MISMATCH");
  await expect(
    page.getByRole("table", { name: "Expected Actual bài cây" }),
  ).toContainText("#1: 9");
});
test("large deep input stays bounded and can inspect the selected node", async ({
  page,
}) => {
  await open(page, "depth");
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  const input = [
    "1",
    "10000 2",
    ...Array.from({ length: 9999 }, (_, i) => `${i + 1} ${i + 2}`).reverse(),
    "10000",
    "1",
  ].join("\n");
  await page
    .getByLabel("Đọc file input bài cây", { exact: true })
    .setInputFiles({
      name: "chain-10000.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(input),
    });
  await expect(page.getByLabel("Input bài cây", { exact: true })).toHaveValue(
    input,
  );
  await page.getByLabel("Expected bài cây", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Áp dụng input", exact: true })
    .click();
  await ready(page);
  await expect(page.locator("[data-tree-node]")).not.toHaveCount(0);
  expect(await page.locator("[data-tree-node]").count()).toBeLessThanOrEqual(
    48,
  );
  await page.getByLabel("ID nút cần phân tích", { exact: true }).fill("9999");
  await page.getByRole("button", { name: "Xem node", exact: true }).click();
  await ready(page);
  await expect(page.locator('[data-tree-node="9999"]')).toBeVisible();
  await page.getByRole("button", { name: "Kết quả ↗", exact: true }).click();
  await expect(page.getByTestId("tree-output")).toHaveText("#1: 9999 0");
});
test("projection and source resize preserve the current step and fit one viewport", async ({
  page,
  isMobile,
}) => {
  await open(page);
  await seek(
    page,
    leaves.steps.findIndex((s) => s.marker === "degreeInc"),
  );
  const count = await page.getByTestId("tree-step-count").textContent();
  await page.locator(".gl-display-popover summary").click();
  await page
    .getByRole("button", { name: "Trình chiếu · 140%", exact: true })
    .click();
  await page.locator(".gl-display-popover summary").click();
  await expect(page.getByTestId("tree-step-count")).toHaveText(count!);
  await panel(page, "Java");
  await page.getByLabel("Tăng chữ Java", { exact: true }).click();
  await expect(page.getByTestId("tree-step-count")).toHaveText(count!);
  if (!isMobile) {
    const width = page.getByRole("separator", {
      name: "Đổi chiều rộng source code",
    });
    await width.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(width).toHaveAttribute("aria-valuenow", "48");
    const height = page.getByRole("separator", {
      name: "Đổi chiều cao source code",
    });
    await height.focus();
    await page.keyboard.press("ArrowDown");
    await expect(height).toHaveAttribute("aria-valuenow", "75");
  }
  const dimensions = await page.evaluate(() => ({
    w: innerWidth,
    h: innerHeight,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
  }));
  expect(dimensions.sw).toBeLessThanOrEqual(dimensions.w + 1);
  expect(dimensions.sh).toBeLessThanOrEqual(dimensions.h + 1);
  await expect(page.locator(".code-line.executing")).toBeInViewport();
  await panel(page, "Mô phỏng");
  await expect(page.locator(".tl-tree-viewport")).toBeVisible();
});
test("playback pauses for dialogs, restarts, and cancels on problem change", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Play bài cây", { exact: true }).click();
  await expect(page.getByLabel("Pause bài cây", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  const count = await page.getByTestId("tree-step-count").textContent();
  await page.waitForTimeout(750);
  await expect(page.getByTestId("tree-step-count")).toHaveText(count!);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng popup", exact: true })
    .click();
  await page.getByLabel("Restart bài cây", { exact: true }).click();
  await expect(page.getByTestId("tree-step-count")).toHaveText(
    `1 / ${leaves.steps.length}`,
  );
  await page.getByRole("button", { name: "02 · Origami", exact: true }).click();
  await expect(page.locator(".problem-lab")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.getByTestId("problem-output")).toHaveText("Chưa println");
  await page.waitForTimeout(750);
  await expect(page.getByTestId("problem-output")).toHaveText("Chưa println");
});
test("downloads standalone Main.java and links the original source PDF", async ({
  page,
}) => {
  await open(page, "depth");
  await panel(page, "Java");
  const downloading = page.waitForEvent("download");
  await page.getByLabel("Download Java code", { exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Main.java");
  await page.getByLabel("Đề & cách giải", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "không phải BST/TreeMap",
  );
  const href = await page
    .getByRole("link", { name: "Mở PDF Bài 9–10 ↗", exact: true })
    .getAttribute("href");
  const response = await page.request.get(href!.split("#")[0]);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});
