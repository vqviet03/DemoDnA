import { test, expect, type Page } from "@playwright/test";
import { generateProblemRun } from "../../src/problems/replay";
import { parseProblemInput } from "../../src/problems/input";
import { SAMPLES } from "../../src/problems/samples";
import { PROBLEMS, type ProblemId } from "../../src/problems/types";
async function open(page: Page) {
  await page.goto("./problems/");
  await expect(page.locator(".problem-lab")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function ready(page: Page) {
  await expect(page.locator(".problem-lab")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function panel(page: Page, name: string) {
  const tab = page.getByRole("button", { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
const origami = generateProblemRun(
  parseProblemInput(SAMPLES.origami.input, "origami")[0],
  "origami",
  "fold",
);
const foldIndex = origami.steps.findIndex((s) => s.foldFrom !== null);
for (const p of ["coloring", "origami"] as ProblemId[])
  test(`${p}: all three Java methods match every original PDF testcase`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page
      .getByRole("button", {
        name: p === "coloring" ? "01 · Tô màu ô" : "02 · Origami",
        exact: true,
      })
      .click();
    await ready(page);
    for (const method of PROBLEMS[p].methods) {
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
        p === "coloring" ? 5 : 2,
      );
      await expect(dialog.locator(".pl-fail")).toHaveCount(0);
      const rows = dialog.locator("tbody tr");
      for (const [i, line] of SAMPLES[p].expected.split("\n").entries())
        await expect(rows.nth(i)).toContainText(line);
      await dialog
        .getByRole("button", { name: "Về debugger", exact: true })
        .click();
    }
    expect(errors).toEqual([]);
  });
test("actual changes only at println, input errors are atomic, manual expected stays independent", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId("problem-output")).toHaveText("Chưa println");
  await page
    .getByRole("button", { name: "Input / Expected", exact: true })
    .click();
  await page.getByLabel("Input bài PDF", { exact: true }).fill("1\n6 4");
  await page
    .getByRole("button", { name: "Áp dụng input", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "chia hết",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Input bài PDF", { exact: true }).fill("1\n1 1\n8");
  await page.getByLabel("Expected bài PDF", { exact: true }).fill("#1 999");
  await page
    .getByRole("button", { name: "Áp dụng input", exact: true })
    .click();
  await ready(page);
  await page.getByRole("button", { name: "Kết quả ↗", exact: true }).click();
  await expect(page.getByTestId("problem-output")).toHaveText("#1 8");
  await page.getByRole("button", { name: /^Kết quả ·/ }).click();
  await expect(page.locator(".pl-results")).toContainText("MISMATCH");
  await expect(page.locator(".pl-results")).toContainText("#1 999");
  await expect(page.locator(".pl-results")).toContainText("#1 8");
});
test("paper genuinely rotates around crease and Previous unfolds without corrupting snapshots", async ({
  page,
  isMobile,
}) => {
  await open(page);
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(foldIndex - 1));
  await page.getByLabel("Next bài PDF", { exact: true }).click();
  const stack = page.getByTestId("fold-stack");
  await expect(stack).toHaveAttribute("data-moving", "true");
  const before = await stack.evaluate((el) => el.style.transform);
  await page.waitForTimeout(400);
  const middle = await stack.evaluate((el) => el.style.transform);
  expect(middle).toContain("rotateY(");
  expect(middle).not.toBe(before);
  expect(middle).not.toContain("rotateY(180deg)");
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-anchor",
    "1",
  );
  const snapshot = await page.getByTestId("problem-step-title").textContent();
  await page.getByLabel("Previous bài PDF", { exact: true }).click();
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-moving",
    "true",
  );
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-anchor",
    "2",
  );
  await page.getByLabel("Next bài PDF", { exact: true }).click();
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await expect(page.getByTestId("problem-step-title")).toHaveText(snapshot!);
  const secondFold = origami.steps.findIndex(
    (s) => s.folded === 2 && s.foldFrom !== null,
  );
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(secondFold - 1));
  await page.getByLabel("Next bài PDF", { exact: true }).click();
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-fold-direction",
    "under",
  );
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(foldIndex));
  await panel(page, "Java");
  await expect(page.locator(".code-line.executing")).toHaveAttribute(
    "data-line",
    String(origami.steps[foldIndex].activeLines[0]),
  );
  if (!isMobile) {
    await expect(page.locator(".pl-watch-container")).toBeInViewport();
    expect(
      (await page.locator(".pl-watch-container").boundingBox())!.height,
    ).toBeGreaterThan(60);
  }
});
test("seek and Pause cancel a fold; reduced motion settles and autoplay stops at completion", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(foldIndex - 1));
  await page.getByLabel("Play bài PDF", { exact: true }).click();
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-moving",
    "true",
  );
  await page.getByLabel("Pause bài PDF", { exact: true }).click();
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await expect(page.getByTestId("fold-stack")).toHaveAttribute(
    "data-moving",
    "false",
  );
  await page.getByLabel("Timeline bài PDF", { exact: true }).fill("0");
  await page.waitForTimeout(1700);
  await expect(page.getByTestId("problem-step-count")).toHaveText(
    `1 / ${origami.steps.length}`,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(origami.steps.length - 2));
  await page.getByLabel("Play bài PDF", { exact: true }).click();
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "completed",
  );
  await expect(page.getByLabel("Play bài PDF", { exact: true })).toBeDisabled();
  await expect(page.getByTestId("problem-output")).toHaveText("#1 16");
});
test("cell signs, recursive scopes and values synchronize with Java and survive Previous / Next", async ({
  page,
}) => {
  await open(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "01 · Tô màu ô", exact: true })
    .click();
  await ready(page);
  await page
    .getByLabel("Cách giải bài PDF", { exact: true })
    .selectOption("dfs");
  await ready(page);
  const run = generateProblemRun(
    parseProblemInput(SAMPLES.coloring.input, "coloring")[0],
    "coloring",
    "dfs",
  );
  const index = run.steps.findIndex((s) => !!s.scopes.choose2);
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(index));
  await expect(page.locator(".pl-call-stack")).toContainText("choose(2,");
  const title = await page.getByTestId("problem-step-title").textContent();
  await page.getByLabel("Previous bài PDF", { exact: true }).click();
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await page.getByLabel("Next bài PDF", { exact: true }).click();
  await expect(page.getByTestId("problem-step-title")).toHaveText(title!);
  await panel(page, "Variables");
  await expect(page.getByTestId("grid-variables")).toContainText("choose2");
  await panel(page, "Java");
  await expect(page.locator(".code-line.executing")).toHaveAttribute(
    "data-line",
    String(run.steps[index].activeLines[0]),
  );
});
test("projection, source resizing and mobile tabs preserve current execution and viewport fit", async ({
  page,
  isMobile,
}) => {
  await open(page);
  if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByLabel("Timeline bài PDF", { exact: true }).fill("120");
  const count = await page.getByTestId("problem-step-count").textContent();
  await page.locator(".gl-display-popover summary").click();
  await page
    .getByRole("button", { name: "Trình chiếu · 140%", exact: true })
    .click();
  await page.locator(".gl-display-popover summary").click();
  await panel(page, "Java");
  const font = await page
    .locator(".code-scroll pre")
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(font).toBeGreaterThanOrEqual(20);
  if (!isMobile) {
    await page
      .getByRole("separator", {
        name: "Đổi chiều rộng source code",
        exact: true,
      })
      .focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("separator", {
        name: "Đổi chiều rộng source code",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "48");
    await page
      .getByRole("separator", {
        name: "Đổi chiều cao source code",
        exact: true,
      })
      .focus();
    await page.keyboard.press("ArrowUp");
    await expect(
      page.getByRole("separator", {
        name: "Đổi chiều cao source code",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "71");
  }
  await expect(page.getByTestId("problem-step-count")).toHaveText(count!);
  const overflow = await page.evaluate(() => ({
    w: innerWidth,
    h: innerHeight,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
  }));
  expect(overflow.sw).toBeLessThanOrEqual(overflow.w + 1);
  expect(overflow.sh).toBeLessThanOrEqual(overflow.h + 1);
  await panel(page, "Variables");
  await expect(page.getByTestId("grid-variables")).toBeVisible();
});
test("download is complete compilable source and page links to original PDF", async ({
  page,
}) => {
  await open(page);
  await panel(page, "Java");
  const download = page.waitForEvent("download");
  await page.getByLabel("Download Java code", { exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Main.java");
  await page
    .getByRole("button", { name: "Đề & cách giải", exact: true })
    .click();
  const link = page.getByRole("link", { name: "Mở đề PDF gốc ↗", exact: true });
  await expect(link).toHaveAttribute("href", "/problems/de_bai_text.pdf");
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.ok()).toBe(true);
});

test("original paper and transparent folded layers reveal the same hidden aggregate read", async ({
  page,
}) => {
  await open(page);
  const index = origami.steps.findIndex(
    (s) => s.marker === "rightValue" && s.folded === 2,
  );
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(index));
  await expect(
    page.getByRole("region", { name: "Giấy ban đầu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Giấy đang gấp", exact: true }),
  ).toBeVisible();
  const original = page.getByTestId("original-paper-cursor");
  await expect(original).toHaveCount(2);
  await expect(original.nth(0)).toHaveAttribute("data-source", "0,3");
  await expect(original.nth(1)).toHaveAttribute("data-source", "0,4");
  await expect(page.getByTestId("paper-reading-value")).toHaveText("= 6");
  await expect(page.getByTestId("paper-source-pointer")).toHaveText("[0, 1]");
  const folded = page.getByTestId("folded-paper-cursor");
  await expect(folded).toHaveAttribute("data-hidden-count", "2");
  await expect(folded).toHaveAttribute("data-projected-column", "0");
  await expect(page.locator(".pl-paper-reading-title")).toContainText(
    "Đọc current[0][1]",
  );
  const faces = page.locator('.pl-fold-stack [data-strip="0"] .pl-paper-face');
  const front = await faces
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    back = await faces
      .nth(1)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(front).toBe(back);
  expect(front).toMatch(/\/ 0\./);
  const opacity = await page
    .locator('.pl-fold-stack [data-strip="0"] .pl-paper-occluder .pl-paper-ink')
    .first()
    .evaluate((e) => getComputedStyle(e).opacity);
  expect(Number(opacity)).toBeLessThan(0.1);
  await page.getByRole("button", { name: "Next bài PDF", exact: true }).click();
  await expect(page.getByTestId("paper-reading-value")).toHaveText("= 11");
  await expect(page.locator(".pl-paper-reading-title")).toContainText(
    "left + right → next[0][0]",
  );
  await expect(page.getByTestId("original-paper-cursor")).toHaveCount(3);
});
test("source traversal moves across the original paper and Previous restores the hidden read exactly", async ({
  page,
}) => {
  await open(page);
  const copied = origami.steps.findIndex(
    (s) => s.marker === "copy" && s.current?.[0] === 0 && s.current?.[1] === 4,
  );
  await page
    .getByLabel("Timeline bài PDF", { exact: true })
    .fill(String(copied));
  const cursor = page.getByTestId("original-paper-cursor").first();
  // Capture in the browser's own frames so transport/worker latency cannot skip the animation.
  await page.getByLabel("Tốc độ bài PDF", { exact: true }).selectOption("0.5");
  const frames = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const cursor = document.querySelector<HTMLElement>(
          '[data-testid="original-paper-cursor"]',
        )!;
        const session = document.querySelector<HTMLElement>(".pl-session")!;
        const button = document.querySelector<HTMLButtonElement>(
          '[aria-label="Next bài PDF"]',
        )!;
        const samples = [cursor.style.transform],
          started = performance.now();
        button.click();
        function capture() {
          samples.push(cursor.style.transform);
          if (
            (samples.length > 2 &&
              session.dataset.playbackStatus === "paused") ||
            performance.now() - started > 3000
          )
            resolve(samples);
          else requestAnimationFrame(capture);
        }
        requestAnimationFrame(capture);
      }),
  );
  expect(new Set(frames).size).toBeGreaterThan(2);
  expect(frames[0]).not.toBe(frames.at(-1));
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await expect(cursor).toHaveAttribute("data-source", "0,5");
  const read = origami.steps.findIndex(
    (s) => s.marker === "rightValue" && s.folded === 2,
  );
  await page.getByLabel("Timeline bài PDF", { exact: true }).fill(String(read));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Next bài PDF", exact: true }).click();
  await expect(page.locator(".pl-session")).toHaveAttribute(
    "data-playback-status",
    "paused",
  );
  await page
    .getByRole("button", { name: "Previous bài PDF", exact: true })
    .click();
  await expect(page.getByTestId("paper-reading-value")).toHaveText("= 6");
  await expect(page.getByTestId("original-paper-cursor")).toHaveCount(2);
  await expect(page.getByTestId("folded-paper-cursor")).toHaveAttribute(
    "data-hidden-count",
    "2",
  );
});
test("mapping and layer methods show folded destinations and matching source coordinates", async ({
  page,
}) => {
  await open(page);
  for (const method of ["mapping", "layers"] as const) {
    await page
      .getByLabel("Cách giải bài PDF", { exact: true })
      .selectOption(method);
    await ready(page);
    const run = generateProblemRun(
      parseProblemInput(SAMPLES.origami.input, "origami")[0],
      "origami",
      method,
    );
    const index = run.steps.findIndex(
      (s) =>
        ["accumulate", "layerAdd"].includes(s.marker) &&
        s.current?.[0] === 0 &&
        s.current?.[1] === 3,
    );
    await page
      .getByLabel("Timeline bài PDF", { exact: true })
      .fill(String(index));
    await expect(page.getByTestId("fold-stack")).toHaveAttribute(
      "data-folded",
      "2",
    );
    await expect(page.getByTestId("original-paper-cursor")).toHaveAttribute(
      "data-source",
      "0,3",
    );
    await expect(page.getByTestId("folded-paper-cursor")).toHaveAttribute(
      "data-projected-column",
      "0",
    );
    await expect(page.getByTestId("folded-paper-cursor")).toHaveAttribute(
      "data-hidden-count",
      "1",
    );
    await expect(page.getByTestId("paper-reading-value")).toHaveText("= 2");
  }
});
test("both paper views stay visible in projector mode and reduced motion avoids a moving cursor", async ({
  page,
  isMobile,
}) => {
  await open(page);
  if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator(".gl-display-popover summary").click();
  await page
    .getByRole("button", { name: "Trình chiếu · 140%", exact: true })
    .click();
  await page.locator(".gl-display-popover summary").click();
  const read = origami.steps.findIndex(
    (s) => s.marker === "rightValue" && s.folded === 2,
  );
  await page.getByLabel("Timeline bài PDF", { exact: true }).fill(String(read));
  for (const name of ["Giấy ban đầu", "Giấy đang gấp"]) {
    const region = page.getByRole("region", { name, exact: true });
    await expect(region).toBeInViewport();
    expect((await region.boundingBox())!.height).toBeGreaterThan(80);
  }
  const fit = await page.locator(".pl-original-viewport").evaluate((el) => {
    const viewport = el.getBoundingClientRect(),
      paper = el.querySelector(".pl-original-world")!.getBoundingClientRect();
    return {
      top: paper.top - viewport.top,
      bottom: paper.bottom - viewport.bottom,
    };
  });
  expect(fit.top).toBeGreaterThanOrEqual(0);
  expect(fit.bottom).toBeLessThanOrEqual(1);
  const bounds = await page.evaluate(() => ({
    w: innerWidth,
    h: innerHeight,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
  }));
  expect(bounds.sw).toBeLessThanOrEqual(bounds.w + 1);
  expect(bounds.sh).toBeLessThanOrEqual(bounds.h + 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Restart bài PDF", exact: true })
    .click();
  await expect(page.getByTestId("original-paper-cursor")).toHaveCount(0);
  await expect(page.getByTestId("folded-paper-cursor")).toHaveCount(0);
});
