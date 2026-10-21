import { describe, it, expect } from "vitest";
import {
  parseProblemInput,
  expectedLines,
  referenceAnswer,
} from "../src/problems/input";
import { SAMPLES } from "../src/problems/samples";
import { generateProblemRun, solveProblem } from "../src/problems/replay";
import {
  METHODS,
  PROBLEMS,
  type ProblemCase,
  type ProblemId,
} from "../src/problems/types";
import {
  foldPose,
  foldMotion,
  layerOrder,
  mappedColumn,
} from "../src/problems/paper";
describe("PDF original samples", () => {
  for (const p of ["coloring", "origami"] as ProblemId[])
    for (const m of PROBLEMS[p].methods)
      it(`${p}/${m}: every provided input matches PDF`, () => {
        const cases = parseProblemInput(SAMPLES[p].input, p);
        expect(
          cases
            .map((t, i) => `#${i + 1} ${solveProblem(t, p, m).answer}`)
            .join("\n"),
        ).toBe(SAMPLES[p].expected);
        for (const test of cases)
          expect(solveProblem(test, p, m).answer).toBe(
            referenceAnswer(test, p),
          );
      });
  it("matches the complete folded matrix printed in the statement", () => {
    const t = parseProblemInput(SAMPLES.origami.input, "origami")[0];
    for (const m of PROBLEMS.origami.methods)
      expect(solveProblem(t, "origami", m).result).toEqual([
        [11, 12],
        [10, 14],
        [8, 8],
        [14, 14],
        [7, 15],
        [16, 13],
      ]);
  });
});
describe("independent random oracle and constraints", () => {
  for (const p of ["coloring", "origami"] as ProblemId[])
    it(`${p}: seeded data, negative/zero values, edge sizes and divisors`, () => {
      let seed = 1849;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed;
      };
      for (let i = 0; i < 20; i++) {
        const n = p === "coloring" ? 5 + (random() % 4) : 1 + (random() % 12);
        const divisors = Array.from({ length: n }, (_, j) => j + 1).filter(
          (x) => n % x === 0,
        );
        const parts =
            p === "coloring" ? 1 : divisors[random() % divisors.length],
          cols = p === "coloring" ? 5 + (random() % 4) : n;
        const t: ProblemCase = {
          rows: n,
          cols,
          parts,
          cells: Array.from({ length: n }, () =>
            Array.from({ length: cols }, () =>
              p === "coloring" ? (random() % 41) - 20 : (random() % 100) + 1,
            ),
          ),
        };
        const expected = referenceAnswer(t, p);
        const results = PROBLEMS[p].methods.map((m) => solveProblem(t, p, m));
        for (const r of results) {
          expect(r.answer).toBe(expected);
          expect(r.result).toEqual(results[0].result);
          expect(r.marks).toEqual(results[0].marks);
        }
      }
    });
  it("all zero cells qualify, leading negative and all neighbors must be used", () => {
    const zero: ProblemCase = {
      rows: 5,
      cols: 5,
      parts: 1,
      cells: Array.from({ length: 5 }, () => Array<number>(5).fill(0)),
    };
    for (const m of PROBLEMS.coloring.methods)
      expect(solveProblem(zero, "coloring", m).answer).toBe(25);
    const t = parseProblemInput(SAMPLES.coloring.input, "coloring")[0];
    for (const m of PROBLEMS.coloring.methods)
      expect(solveProblem(t, "coloring", m).marks[4][3]).toBe(2);
  });
  it("maximum legal grids and maximum overlapping sum", () => {
    for (const [p, n, cols, parts, v, answer] of [
      ["origami", 100, 100, 100, 100, 10000],
      ["coloring", 50, 50, 1, 0, 2500],
    ] as const) {
      const t = {
        rows: n,
        cols,
        parts,
        cells: Array.from({ length: n }, () => Array<number>(cols).fill(v)),
      };
      for (const m of PROBLEMS[p].methods)
        expect(solveProblem(t, p, m).answer).toBe(answer);
    }
  });
});
describe("immutable synchronized replay", () => {
  for (const p of ["coloring", "origami"] as ProblemId[])
    for (const m of PROBLEMS[p].methods)
      it(`${m}: marker, watch, console and final state agree`, () => {
        const t = parseProblemInput(SAMPLES[p].input, p)[0],
          run = generateProblemRun(t, p, m),
          last = run.steps.at(-1)!;
        expect(last.output).toBe(SAMPLES[p].expected.split("\n")[0]);
        expect(last.results).toEqual(run.result);
        expect(last.answer).toBe(run.answer);
        expect(run.steps.slice(0, -1).every((s) => s.output === null)).toBe(
          true,
        );
        expect(Object.keys(last.scopes)).toEqual(["main", "static"]);
        expect(Object.isFrozen(last.results[0])).toBe(true);
        for (const s of run.steps) {
          expect(s.activeLines).toEqual([run.code.markers[s.marker]]);
          expect(s.activeLines[0]).toBeGreaterThan(0);
        }
        const midpoint = Math.floor(run.steps.length / 2),
          snapshot = JSON.stringify(run.steps[midpoint]);
        expect(JSON.stringify(run.steps[midpoint - 1])).not.toBe(snapshot);
        expect(JSON.stringify(run.steps[midpoint])).toBe(snapshot);
        expect(generateProblemRun(t, p, m).steps).toEqual(run.steps);
      });
  it("fold call animates before summation; live matrix is never prefilled", () => {
    const t = parseProblemInput(SAMPLES.origami.input, "origami")[0],
      run = generateProblemRun(t, "origami", "fold");
    const folds = run.steps.filter((s) => s.foldFrom !== null);
    expect(folds.map((s) => s.folded)).toEqual([1, 2]);
    for (const f of folds) {
      const idx = run.steps.indexOf(f);
      expect(run.steps[idx + 1].marker).toBe("nextNew");
      expect(run.steps[idx + 1].results.flat().every((x) => x === 0)).toBe(
        true,
      );
    }
  });
  it("DFS stack has actual isolated recursive scopes and unwinds to main", () => {
    const t = parseProblemInput(SAMPLES.coloring.input, "coloring")[0],
      run = generateProblemRun(t, "coloring", "dfs");
    const deep = run.steps.find((s) => s.scopes.choose4)!;
    expect(deep.callStack[0]).toMatch(/^choose\(4,/);
    expect(deep.scopes.choose0.depth.value).toBe(0);
    expect(deep.scopes.choose4.depth.value).toBe(4);
    expect(run.steps.at(-1)!.callStack).toEqual(["main(String[] args)"]);
  });
  it("large matrices use bounded overview and selected-cell detail without losing answers", () => {
    const t: ProblemCase = {
      rows: 50,
      cols: 50,
      parts: 1,
      cells: Array.from({ length: 50 }, () => Array<number>(50).fill(0)),
    };
    const run = generateProblemRun(t, "coloring", "mask", { focus: [25, 25] });
    expect(run.detailed).toBe(false);
    expect(run.steps.length).toBeLessThan(10000);
    expect(run.answer).toBe(2500);
    expect(
      run.steps.some(
        (s) =>
          s.marker === "plus" && s.current?.[0] === 25 && s.current[1] === 25,
      ),
    ).toBe(true);
    expect(run.operations).toBeGreaterThan(run.steps.length);
  });
});
describe("paper geometry", () => {
  it("preserves every stable layer ID, alternates orientation, and final source mapping", () => {
    for (let m = 1; m <= 12; m++)
      for (let folds = 0; folds < m; folds++) {
        const { anchor, order } = foldPose(m, folds);
        expect(order).toHaveLength(folds + 1);
        expect([...order].sort((a, b) => a - b)).toEqual(
          Array.from({ length: folds + 1 }, (_, i) => anchor + i),
        );
        expect(order).toContain(anchor);
        if (folds)
          expect(order).toEqual(
            folds % 2
              ? [anchor, ...[...layerOrder(m, anchor + 1)].reverse()]
              : [...[...layerOrder(m, anchor + 1)].reverse(), anchor],
          );
      }
    expect(Array.from({ length: 6 }, (_, c) => mappedColumn(c, 2))).toEqual([
      0, 1, 1, 0, 0, 1,
    ]);
  });
});
describe("accordion fold geometry continuity", () => {
  it("alternates over/under and preserves the exact depth of every layer at commit", () => {
    for (let m = 2; m <= 12; m++)
      for (let f = 0; f < m - 1; f++) {
        const thickness = 3,
          old = foldPose(m, f),
          next = foldPose(m, f + 1),
          motion = foldMotion(m, f, thickness);
        expect(motion.angle).toBe(f % 2 === 0 ? -180 : 180);
        for (const [rank, strip] of old.order.entries()) {
          const animatedZ = motion.zEnd - (rank - old.anchorRank) * thickness;
          const committedZ =
            (next.order.indexOf(strip) - next.anchorRank) * thickness;
          expect(animatedZ).toBe(committedZ);
        }
        expect(
          (next.order.indexOf(next.anchor) - next.anchorRank) * thickness,
        ).toBe(0);
      }
  });
});
describe("judge input validation is atomic", () => {
  it("rejects truncation, overflow, trailing tokens, wrong constraints, invalid folds", () => {
    for (const text of [
      "0",
      "1\n6 4",
      "1\n101 1",
      "1\n2 1\n1 2 3",
      "1\n1 1\n101",
      "1\n1 1\n1\n5",
      "1\n1 1\n1e2",
    ])
      expect(() => parseProblemInput(text, "origami")).toThrow();
    expect(() => parseProblemInput("1\n4 5", "coloring")).toThrow();
  });
  it("expected validates per-case IDs, not arbitrary answer substitution", () => {
    expect(expectedLines("", 2)).toEqual([]);
    expect(expectedLines("#1 16\n#2 31", 2)).toEqual(["#1 16", "#2 31"]);
    expect(() => expectedLines("#1 16", 2)).toThrow();
    expect(() => expectedLines("#2 16\n#1 31", 2)).toThrow();
  });
  it("all six methods provide complexity and educational content", () => {
    expect(Object.values(METHODS)).toHaveLength(6);
    for (const m of Object.values(METHODS)) {
      expect(m.idea.length).toBeGreaterThan(40);
      expect(m.time).toMatch(/^O\(/);
    }
  });
});
