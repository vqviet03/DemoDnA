import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { generateProblemRun } from "../src/problems/replay";
import { parseProblemInput } from "../src/problems/input";
import { SAMPLES } from "../src/problems/samples";
async function main() {
  const base = process.env.VERIFY_URL ?? "https://dnademo.eeslern.com";
  const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  const browser = await chromium.launch({
    headless: true,
    ...(proxy ? { proxy: { server: proxy } } : {}),
  });
  const report: {
    url: string;
    verifiedAt: string;
    checks: string[];
    errors: string[];
  } = {
    url: `${base}/problems/`,
    verifiedAt: new Date().toISOString(),
    checks: [],
    errors: [],
  };
  mkdirSync("verification", { recursive: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    const response = await page.goto(`${base}/problems/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".problem-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    report.checks.push(
      "Public /problems/ loads anonymously, fonts and scripts hydrate",
    );
    const run = generateProblemRun(
      parseProblemInput(SAMPLES.origami.input, "origami")[0],
      "origami",
      "fold",
    );
    const index = run.steps.findIndex((s) => s.foldFrom !== null);
    await page
      .getByLabel("Timeline bài PDF", { exact: true })
      .fill(String(index - 1));
    await page.getByLabel("Next bài PDF", { exact: true }).click();
    await page.waitForTimeout(400);
    const transform = await page
      .getByTestId("fold-stack")
      .evaluate((e) => e.style.transform);
    expect(transform).toMatch(/rotateY\(-/);
    await page.screenshot({ path: "verification/problems-folding.png" });
    await expect(page.locator(".pl-session")).toHaveAttribute(
      "data-playback-status",
      "paused",
    );
    report.checks.push(
      "Origami rotates continuously around a crease with real double-sided layers",
    );
    const hiddenRead = run.steps.findIndex(
      (s) => s.marker === "rightValue" && s.folded === 2,
    );
    await page
      .getByLabel("Timeline bài PDF", { exact: true })
      .fill(String(hiddenRead));
    await expect(page.getByTestId("original-paper-cursor")).toHaveCount(2);
    await expect(page.getByTestId("folded-paper-cursor")).toHaveAttribute(
      "data-hidden-count",
      "2",
    );
    await expect(page.getByTestId("paper-reading-value")).toHaveText("= 6");
    const alpha = await page
      .locator(".pl-fold-stack .pl-paper-face")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(alpha).toMatch(/\/ 0\./);
    await page.screenshot({ path: "verification/problems-xray-desktop.png" });
    report.checks.push(
      "Original paper and translucent folded layers track the same two hidden contributors (2 + 4 = 6)",
    );
    await page.getByRole("button", { name: "Kết quả ↗", exact: true }).click();
    await expect(page.getByTestId("problem-output")).toHaveText("#1 16");
    await page.screenshot({ path: "verification/problems-desktop.png" });
    await page
      .getByRole("button", { name: "01 · Tô màu ô", exact: true })
      .click();
    await expect(page.locator(".problem-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    for (const method of ["mask", "dfs", "subset"]) {
      await page
        .getByLabel("Cách giải bài PDF", { exact: true })
        .selectOption(method);
      await expect(page.locator(".problem-lab")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await page.getByRole("button", { name: /^Kết quả ·/ }).click();
      await page
        .getByRole("button", { name: "Chạy cả bộ test", exact: true })
        .click();
      await expect(page.locator(".pl-pass")).toHaveCount(5);
      await page
        .getByRole("button", { name: "Về debugger", exact: true })
        .click();
    }
    report.checks.push(
      "All three coloring methods match the five original PDF testcases on production",
    );
    await page.getByLabel("Timeline bài PDF", { exact: true }).fill("200");
    await page.screenshot({ path: "verification/problems-coloring.png" });
    const pdf = await page.request.get(`${base}/problems/de_bai_text.pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    report.checks.push("Original PDF served at /problems/de_bai_text.pdf");
    await page.close();
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    mobile.on("pageerror", (e) => report.errors.push(e.message));
    await mobile.goto(`${base}/problems/`);
    await expect(mobile.locator(".problem-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await mobile
      .getByLabel("Timeline bài PDF", { exact: true })
      .fill(String(hiddenRead));
    await expect(mobile.getByTestId("original-paper-cursor")).toHaveCount(2);
    await expect(mobile.getByTestId("folded-paper-cursor")).toHaveAttribute(
      "data-hidden-count",
      "2",
    );
    await mobile.screenshot({ path: "verification/problems-xray-mobile.png" });
    report.checks.push(
      "Both paper views and hidden-layer tracking remain visible on mobile",
    );
    await mobile
      .getByRole("button", { name: "Kết quả ↗", exact: true })
      .click();
    await expect(mobile.getByTestId("problem-output")).toHaveText("#1 16");
    await mobile.screenshot({ path: "verification/problems-mobile.png" });
    await mobile.getByRole("button", { name: "Java", exact: true }).click();
    await expect(mobile.locator(".code-line.executing")).toBeVisible();
    await mobile
      .getByRole("button", { name: "Variables", exact: true })
      .click();
    await expect(mobile.getByTestId("grid-variables")).toBeVisible();
    const overflow = await mobile.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.height + 1);
    report.checks.push(
      "Mobile visualization, code, variables, result and playback fit the viewport",
    );
    expect(report.errors).toEqual([]);
    writeFileSync(
      "verification/problems-live.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
