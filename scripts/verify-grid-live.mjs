import { chromium, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.GRID_LIVE_URL ?? "https://dnademo.eeslern.com";
const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
const browser = await chromium.launch({
  headless: true,
  ...(proxy && !new URL(base).hostname.match(/^(localhost|127\.0\.0\.1)$/)
    ? { proxy: { server: proxy } }
    : {}),
});
const results = [];
await mkdir("verification", { recursive: true });
try {
  for (const [device, width, height] of [
    ["desktop", 1366, 768],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const response = await page.goto(`${base}/grid/`);
    expect(response.status()).toBe(200);
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const panel = async (name) => {
      const tab = page.getByRole("tab", { name, exact: true });
      if (await tab.isVisible()) await tab.click();
    };
    const apply = async (text, expected = "") => {
      await page
        .getByRole("button", { name: "Input / Expected", exact: true })
        .click();
      await page.getByLabel("Grid input", { exact: true }).fill(text);
      await page.getByLabel("Grid expected", { exact: true }).fill(expected);
      await page
        .getByRole("button", { name: "Áp dụng & tạo replay", exact: true })
        .click();
      await expect(page.locator(".grid-lab")).toHaveAttribute(
        "data-ready",
        "true",
      );
    };
    await apply("2\n2 3\n0 2 0\n2 0 0\n1 2\n0 2", "999\n1");
    await panel("Output");
    await expect(page.getByTestId("grid-actual-0")).toHaveText(
      "— đang chờ print",
    );
    await page
      .getByRole("button", { name: "Chạy hết Grid", exact: true })
      .click();
    await expect(page.getByTestId("grid-actual-0")).toHaveText("2");
    await expect(page.getByTestId("grid-actual-1")).toHaveText("1");
    await expect(page.locator(".gl-output-table .match")).toHaveCount(1);
    await expect(page.locator(".gl-output-table .mismatch")).toHaveCount(1);
    await page
      .getByLabel("Bài toán Grid", { exact: true })
      .selectOption("shortest");
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await apply("1\n3 4\n0 0 2 3\n0 0 1 0\n1 0 0 0\n0 0 1 0");
    await page
      .getByRole("button", { name: "Chạy hết Grid", exact: true })
      .click();
    await panel("Output");
    await expect(page.getByTestId("grid-actual-0")).toHaveText("5");
    await expect(page.locator(".gl-output-table .match")).toHaveCount(1);
    await expect(
      page.locator(".gl-board-canvas [data-cell-status=path]"),
    ).toHaveCount(6);
    await page
      .getByRole("button", { name: "Vào thuật toán", exact: true })
      .click();
    for (let i = 0; i < 4; i++)
      await page.getByRole("button", { name: "Ô kế", exact: true }).click();
    await panel("Bộ nhớ");
    await expect(page.getByTestId("grid-frontier")).toContainText("FRONT");
    await expect(page.locator(".editor-breadcrumb")).toContainText(
      "solve(...)",
    );
    if (device === "desktop") {
      const split = page.getByRole("separator", {
        name: "Điều chỉnh chiều rộng code",
        exact: true,
      });
      const before = (await page.locator(".gl-code-slot").boundingBox()).width;
      await split.focus();
      await page.keyboard.press("ArrowLeft");
      expect(
        (await page.locator(".gl-code-slot").boundingBox()).width,
      ).toBeGreaterThan(before);
    } else {
      await panel("Code");
      await expect(page.locator(".code-panel")).toBeVisible();
    }
    const stepBefore = await page
      .getByLabel("Grid timeline", { exact: true })
      .inputValue();
    await page
      .getByRole("button", { name: "Trình chiếu Grid", exact: true })
      .click();
    await expect(page.getByLabel("Mức phóng chữ", { exact: true })).toHaveText(
      "140%",
    );
    await expect(page.getByLabel("Grid timeline", { exact: true })).toHaveValue(
      stepBefore,
    );
    await panel("Code");
    expect(
      await page
        .locator(".code-scroll pre")
        .evaluate((el) => getComputedStyle(el).fontSize),
    ).toBe("21px");
    await expect(
      page.getByRole("button", { name: "Ngắt dòng code", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        page.locator(".code-line.executing").evaluate((el) => {
          const a = el.getBoundingClientRect(),
            b = el.closest(".code-scroll").getBoundingClientRect();
          return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
        }),
      )
      .toBe(true);
    if (device === "desktop") {
      expect(
        (await page.locator(".gl-results-slot").boundingBox()).height,
      ).toBeLessThan(45);
      await page
        .getByRole("button", { name: "Output / Thống kê ↗", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Output / Thống kê", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Đóng popup", exact: true })
        .click();
    }
    const scroll = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    }));
    expect(scroll.width).toBeLessThanOrEqual(width);
    expect(scroll.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `verification/grid-${device}.png` });
    await page.reload();
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page
      .getByRole("link", { name: "Về Structure Lab", exact: true })
      .click();
    await expect(page.locator(".lab-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.getByRole("link", { name: "Grid Lab ↗", exact: true }).click();
    await expect(page.locator(".grid-lab")).toHaveAttribute(
      "data-ready",
      "true",
    );
    expect(errors).toEqual([]);
    results.push({
      device,
      status: response.status(),
      viewport: [width, height],
      noPageOverflow: true,
      manualExpectedMismatch: true,
      actualPrintedByReplay: true,
      shortestOutput: "5",
      frontier: true,
      resizeOrCodeTab: true,
      projectionFontPx: 21,
      projectionScale: 140,
      codeWrap: true,
      displayPreservesStep: true,
      compactReports: true,
      directReload: true,
      originalPageNavigation: true,
      runtimeErrors: errors,
    });
    await context.close();
  }
  const report = {
    url: `${base}/grid/`,
    verifiedAt: new Date().toISOString(),
    checks: results,
  };
  await writeFile(
    "grid-live-verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
