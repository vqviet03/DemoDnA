import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { TREE_PROBLEMS } from "../src/problems/tree/types";
import { TREE_SAMPLES, parseTreeInput } from "../src/problems/tree/input";
import { generateTreeRun } from "../src/problems/tree/replay";

async function main() {
  const base = process.env.VERIFY_URL ?? "https://dnademo.eeslern.com";
  const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  const browser = await chromium.launch({
    headless: true,
    ...(proxy && !base.includes("localhost")
      ? { proxy: { server: proxy } }
      : {}),
  });
  const report = {
    url: `${base}/problems/`,
    verifiedAt: new Date().toISOString(),
    checks: [] as string[],
    errors: [] as string[],
  };
  mkdirSync("verification", { recursive: true });
  try {
    for (const [device, viewport] of [
      ["desktop", { width: 1440, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      const page = await browser.newPage({
        viewport,
        isMobile: device === "mobile",
        hasTouch: device === "mobile",
      });
      page.on("pageerror", (e) => report.errors.push(e.message));
      for (const problem of ["leaves", "depth"] as const) {
        const response = await page.goto(
          `${base}/problems/#${problem === "leaves" ? "bai-9" : "bai-10"}`,
        );
        if (response) expect(response.status()).toBe(200);
        await expect(
          page.getByRole("button", {
            name: TREE_PROBLEMS[problem].tab,
            exact: true,
          }),
        ).toHaveAttribute("aria-pressed", "true");
        const ready = async () =>
          expect(page.locator(".tree-problem-lab")).toHaveAttribute(
            "data-ready",
            "true",
          );
        await ready();
        for (const method of TREE_PROBLEMS[problem].methods) {
          await page
            .getByLabel("Cách giải bài PDF", { exact: true })
            .selectOption(method);
          await ready();
          await page
            .getByRole("button", { name: "Kết quả ↗", exact: true })
            .click();
          await expect(page.getByTestId("tree-output")).toHaveText(
            TREE_SAMPLES[problem].expected.split("\n")[0],
          );
          await page.getByRole("button", { name: /^Kết quả ·/ }).click();
          const dialog = page.getByRole("dialog");
          await dialog
            .getByRole("button", { name: "Chạy cả bộ test", exact: true })
            .click();
          await expect(dialog.locator(".pl-pass")).toHaveCount(
            problem === "leaves" ? 3 : 2,
          );
          await expect(dialog.locator(".pl-fail")).toHaveCount(0);
          await dialog
            .getByRole("button", { name: "Về debugger", exact: true })
            .click();
          report.checks.push(
            `${device}: ${problem}/${method} matches every PDF testcase, full output includes colon`,
          );
        }
        const method = problem === "leaves" ? "degree" : "depth-bfs";
        await page
          .getByLabel("Cách giải bài PDF", { exact: true })
          .selectOption(method);
        await ready();
        const run = generateTreeRun(
          parseTreeInput(TREE_SAMPLES[problem].input, problem)[0],
          problem,
          method,
        );
        const at = run.steps.findIndex((s) =>
          problem === "leaves"
            ? s.marker === "leafInc"
            : s.marker === "push" && s.scene.frontier.join(",") === "2,3",
        );
        await page
          .getByLabel("Timeline bài cây", { exact: true })
          .fill(String(at));
        await expect(page.locator(".tl-session")).toHaveAttribute(
          "data-step-marker",
          run.steps[at].marker,
        );
        if (problem === "depth") {
          await expect(
            page.locator("[data-frontier-node]").first(),
          ).toContainText("FRONT");
          await expect(page.locator('[data-tree-node="3"]')).toContainText(
            "d = 1",
          );
        }
        await page.screenshot({
          path: `verification/tree-${problem}-${device}.png`,
        });
        if (device === "mobile")
          await page.getByRole("button", { name: "Java", exact: true }).click();
        await expect(page.locator(".code-line.executing")).toBeInViewport();
        await page.screenshot({
          path: `verification/tree-${problem}-java-${device}.png`,
        });
        const sizes = await page.evaluate(() => ({
          w: innerWidth,
          h: innerHeight,
          sw: document.documentElement.scrollWidth,
          sh: document.documentElement.scrollHeight,
        }));
        expect(sizes.sw).toBeLessThanOrEqual(sizes.w + 1);
        expect(sizes.sh).toBeLessThanOrEqual(sizes.h + 1);
        report.checks.push(
          `${device}: ${problem} tree, memory, current line and playback fit the viewport`,
        );
      }
      await page.close();
    }
    const context = await browser.newContext();
    const pdf = await context.request.get(`${base}/problems/bai-9-10.pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    report.checks.push("Original Bài 9–10 PDF available anonymously");
    expect(report.errors).toEqual([]);
    writeFileSync(
      "verification/tree-problems-live.json",
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
