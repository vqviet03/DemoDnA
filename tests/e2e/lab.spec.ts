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
      await page.getByRole("button", { name: "Apply", exact: true }).click();
      await expect(page.locator(".session-strip .form-error")).toHaveCount(0);
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
  if (await page.getByRole("tab", { name: "Java", exact: true }).isVisible())
    await page.getByRole("tab", { name: "Java", exact: true }).click();
  await expect(page.locator(".token.keyword").first()).toBeVisible();
  await expect(page.locator(".token.class-name").first()).toBeAttached();
  const parameterLine = page
    .locator(".code-line")
    .filter({ hasText: "int at = 5, value = 49" });
  const line = (await parameterLine.getAttribute("data-line"))!;
  await page.getByLabel(`Breakpoint dòng ${line}`, { exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("step-counter")).toHaveText("02");
  await expect(page.locator(".execution")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await expect(page.locator(".executing")).toHaveAttribute("data-line", line);
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
  await page.getByRole("button", { name: "Ma trận kề", exact: true }).click();
  await expect(page.getByTestId("graph-storage")).toContainText("MA TRẬN KỀ");
  await expect(page.locator('.matrix th[title="6: 7"]')).toHaveCount(2);
  await page.getByLabel("Chọn thao tác").selectOption("bfs");
  await expect(page.getByLabel("Node bắt đầu")).toHaveValue("1");
  await expect(page.getByLabel("Node đích")).toHaveValue("7");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await timeline.fill((await timeline.getAttribute("max"))!);
  await expect(page.getByTestId("console")).toContainText("Path: [1, 2, 4, 7]");
  await expect(page.locator(".code-scroll")).toContainText(
    "Map<Integer, List<Integer>>",
  );
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
  if (await page.getByRole("tab", { name: "Java", exact: true }).isVisible())
    await page.getByRole("tab", { name: "Java", exact: true }).click();
  const visible = await page.locator(".executing").evaluate((el) => {
    const viewport = el.closest(".code-scroll")!;
    const a = el.getBoundingClientRect(),
      b = viewport.getBoundingClientRect();
    return a.top >= b.top && a.bottom <= b.bottom;
  });
  expect(visible).toBe(true);
  expect(missing).toEqual([]);
});

async function finish(page: Page) {
  const timeline = page.getByLabel("Timeline", { exact: true });
  await timeline.fill((await timeline.getAttribute("max"))!);
}
test("three operations share data, switch Java at boundaries and retain the dataset across tabs", async ({
  page,
}) => {
  await openLab(page);
  await page.getByLabel("Chọn thao tác").selectOption("remove");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await page.getByLabel("Chọn thao tác").selectOption("insert");
  await page.getByLabel("Index", { exact: true }).fill("0");
  await page.getByLabel("Value", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await page.getByLabel("Chọn thao tác").selectOption("get");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await expect(
    page.getByRole("button", { name: "Thêm vào chuỗi" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".sequence-history button")).toHaveCount(4);
  await finish(page);
  await expect(page.getByTestId("console")).toContainText(
    "[123, 11, 18, 25, 31, 42, 55",
  );
  await expect(page.getByTestId("console")).toContainText("123");
  await page.locator(".sequence-history button").nth(1).click();
  await expect(page.locator(".code-scroll")).toContainText("int removed");
  await page.locator(".sequence-history button").nth(2).click();
  await expect(page.locator(".code-scroll")).toContainText("value = 123");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Queue/ })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /ArrayList/ })
    .click();
  await expect(page.locator(".sequence-history button")).toHaveCount(4);
  await finish(page);
  await expect(page.getByTestId("console")).toContainText("[123, 11, 18");
  await expect(page.getByTestId("step-explanation")).not.toBeEmpty();
});
test("custom tree builds progressively then searches that same tree", async ({
  page,
}) => {
  await openLab(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Tree/ })
    .click();
  await page.getByLabel("Dữ liệu đầu vào").fill("10, 5, 15, 12");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  const count = Number(
    await page.getByLabel("Timeline", { exact: true }).inputValue(),
  );
  await expect(page.locator("[data-node]")).toHaveCount(0);
  await page.getByLabel("Timeline", { exact: true }).fill(String(count + 2));
  await expect(page.locator("[data-node]")).toHaveCount(1);
  await finish(page);
  await expect(page.locator("[data-node]")).toHaveCount(4);
  await page.getByLabel("Chọn thao tác").selectOption("search");
  await page.getByLabel("Value", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await finish(page);
  await expect(page.getByTestId("console")).toContainText("Lesson 12");
  await expect(page.locator('[data-node^="t12"]')).toHaveCount(1);
});
test("custom graph loads a matrix then runs DFS and BFS on the same directed edges", async ({
  page,
}) => {
  await openLab(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Graph/ })
    .click();
  await page
    .getByLabel("Dữ liệu đầu vào")
    .fill("A>B, A>C, B>D, C>D, D>A, Isolated");
  await page.getByLabel("Cách lưu Graph").selectOption("matrix");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await page.getByLabel("Chọn thao tác").selectOption("dfs");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await page.getByLabel("Chọn thao tác").selectOption("bfs");
  await page.getByLabel("Node đích").selectOption("D");
  await page.getByRole("button", { name: "Thêm vào chuỗi" }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".session-strip .form-error")).toHaveCount(0);
  await expect(page.getByTestId("graph-storage")).toContainText("MA TRẬN KỀ");
  await finish(page);
  await expect(page.getByTestId("console")).toContainText("Path: [A, B, D]");
  await expect(page.locator("[data-edge]")).toHaveCount(5);
  await page.getByRole("button", { name: "Danh sách kề", exact: true }).click();
  await expect(page.getByTestId("graph-storage")).toContainText("DANH SÁCH KỀ");
});
test("workspace and playback fit the viewport without page scrolling or overlapping panels", async ({
  page,
}) => {
  await openLab(page);
  for (const name of [
    "ArrayList",
    "LinkedList",
    "Stack",
    "Queue",
    "Tree",
    "Graph",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    await finish(page);
    const bounds = await page.evaluate(() => {
      const playback = document
        .querySelector(".playback")!
        .getBoundingClientRect();
      const controls = [
        ...document.querySelectorAll(".playback button,.playback select"),
      ]
        .map((el) => el.getBoundingClientRect())
        .map((r) => ({ left: r.left, right: r.right, bottom: r.bottom }));
      const panels = [...document.querySelectorAll(".workspace-grid>*")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width && r.height);
      return {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        playbackBottom: playback.bottom,
        controls,
        panels: panels.map((r) => ({
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
        })),
      };
    });
    expect(bounds.width).toBe(bounds.viewportWidth);
    expect(bounds.height).toBe(bounds.viewportHeight);
    expect(bounds.playbackBottom).toBeLessThanOrEqual(bounds.viewportHeight);
    bounds.controls.forEach((c) => {
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.right).toBeLessThanOrEqual(bounds.viewportWidth);
      expect(c.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
    });
    bounds.panels.forEach((p) =>
      expect(p.bottom).toBeLessThanOrEqual(bounds.playbackBottom),
    );
    for (let i = 0; i < bounds.panels.length; i++)
      for (let j = i + 1; j < bounds.panels.length; j++) {
        const a = bounds.panels[i],
          b = bounds.panels[j];
        expect(
          a.right <= b.left + 1 ||
            b.right <= a.left + 1 ||
            a.bottom <= b.top + 1 ||
            b.bottom <= a.top + 1,
        ).toBe(true);
      }
  }
  if (await page.getByRole("tab", { name: "Java", exact: true }).isVisible()) {
    for (const tab of ["Java", "Biến", "Console", "Giải thích"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      expect(await page.evaluate(() => document.body.scrollHeight)).toBe(
        await page.evaluate(() => innerHeight),
      );
    }
  }
});
