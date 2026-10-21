import { describe, it, expect } from "vitest";
import {
  paperActivity,
  paperContributors,
  projectedPaperColumn,
} from "../src/problems/paper-activity";
import { generateProblemRun } from "../src/problems/replay";
import { parseProblemInput } from "../src/problems/input";
import { SAMPLES } from "../src/problems/samples";
const cases = parseProblemInput(SAMPLES.origami.input, "origami");
describe("paper activity follows Java array reads and data provenance", () => {
  it("a left-value read lights only the actual source cell, even under the front sheet", () => {
    const run = generateProblemRun(cases[0], "origami", "fold");
    for (const step of run.steps.filter((s) => s.marker === "leftValue")) {
      const a = paperActivity(run, step)!;
      expect(a.kind).toBe("read");
      expect(a.cells).toHaveLength(1);
      const p = a.cells[0];
      expect(a.value).toBe(run.test.cells[p.r][p.c]);
      expect([p.r, p.c]).toEqual(step.current);
    }
  });
  it("one read of current reveals every contributing original cell, without counting extra Java reads", () => {
    for (const test of cases) {
      const run = generateProblemRun(test, "origami", "fold");
      for (const step of run.steps.filter((s) => s.marker === "rightValue")) {
        const a = paperActivity(run, step)!;
        expect(a.kind).toBe("stack");
        const actual = a.cells.reduce(
          (sum, p) => sum + test.cells[p.r][p.c],
          0,
        );
        expect(actual).toBe(step.scopes.foldLeft.right.value);
        expect(a.value).toBe(actual);
        const anchor = test.parts - 1 - step.folded,
          width = test.cols / test.parts;
        expect(
          new Set(a.cells.map((p) => projectedPaperColumn(p.c, width, anchor))),
        ).toEqual(new Set([anchor * width + step.target![1]]));
        expect(a.cells.every((p) => p.block > anchor)).toBe(true);
      }
    }
  });
  it("the second sample fold reads 2 + 4 from inside the two hidden layers", () => {
    const run = generateProblemRun(cases[0], "origami", "fold");
    const step = run.steps.find(
      (s) => s.marker === "rightValue" && s.folded === 2,
    )!;
    const a = paperActivity(run, step)!;
    expect(a.cells.map((p) => [p.r, p.c])).toEqual([
      [0, 3],
      [0, 4],
    ]);
    expect(a.value).toBe(6);
    expect(step.current).toEqual([0, 0]);
  });
  it("writing next uses the computed sum and source provenance; it never labels input as a write", () => {
    const run = generateProblemRun(cases[1], "origami", "fold");
    for (const step of run.steps.filter((s) => s.marker === "foldAdd")) {
      const a = paperActivity(run, step)!;
      expect(a.kind).toBe("write");
      expect(a.label).toContain("next[");
      expect(a.value).toBe(step.results[step.target![0]][step.target![1]]);
      expect(a.value).toBe(
        a.cells.reduce((sum, p) => sum + run.test.cells[p.r][p.c], 0),
      );
      expect(a.cells[0].role).toBe("context");
    }
  });
  it("all three methods expose origins of a result read with correct values and columns", () => {
    for (const method of ["fold", "mapping", "layers"] as const) {
      const run = generateProblemRun(cases[0], "origami", method);
      for (const step of run.steps.filter((s) => s.marker === "best")) {
        const a = paperActivity(run, step)!;
        expect(a.kind).toBe("stack");
        expect(a.cells).toHaveLength(run.test.parts);
        expect(a.value).toBe(
          a.cells.reduce((sum, p) => sum + run.test.cells[p.r][p.c], 0),
        );
        expect(
          a.cells.every(
            (p) => projectedPaperColumn(p.c, 2, 0) === step.target![1],
          ),
        ).toBe(true);
      }
    }
  });
  it("declarations and pointer calculations do not pretend to read or sum values", () => {
    const run = generateProblemRun(cases[0], "origami", "fold");
    expect(
      paperActivity(
        run,
        run.steps.find((s) => s.marker === "mirrored")!,
      )!.kind,
    ).toBe("position");
    expect(
      paperActivity(
        run,
        run.steps.find((s) => s.foldFrom !== null)!,
      ),
    ).toBe(null);
    expect(paperActivity(run, run.steps.at(-1)!)).toBe(null);
  });
  it("coordinates account for partial folds, odd/even strips, and no fold", () => {
    expect(
      Array.from({ length: 6 }, (_, c) => projectedPaperColumn(c, 2, 2)),
    ).toEqual([0, 1, 2, 3, 4, 5]);
    expect(
      Array.from({ length: 6 }, (_, c) => projectedPaperColumn(c, 2, 1)),
    ).toEqual([0, 1, 2, 3, 3, 2]);
    expect(
      Array.from({ length: 6 }, (_, c) => projectedPaperColumn(c, 2, 0)),
    ).toEqual([0, 1, 1, 0, 0, 1]);
    expect(
      paperContributors({ rows: 1, cols: 1, parts: 1, cells: [[5]] }, 0, 0, 0),
    ).toEqual([{ r: 0, c: 0, block: 0, role: "stack" }]);
  });
});
