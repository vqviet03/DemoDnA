import { describe, it, expect } from "vitest";
import { generateGridRun } from "@/grid/replay";
import {
  gridExample,
  serializeGridInput,
  parseGridInput,
  referenceAnswer,
  scanOrder,
  parseExpected,
} from "@/grid/input";
import { PROBLEMS, type GridProblem, type GridAlgorithm } from "@/grid/types";
for (const problem of Object.keys(PROBLEMS) as GridProblem[])
  for (const algorithm of PROBLEMS[problem].algorithms) {
    it(`${problem}/${algorithm}: computes real outputs, immutable replay, legal memory accesses and matching oracle`, () => {
      const cases = gridExample(problem),
        input = serializeGridInput(cases, problem),
        run = generateGridRun(input, problem, algorithm),
        last = run.steps.at(-1)!;
      expect(last.outputs).toEqual(
        cases.map((test) => referenceAnswer(test, problem, algorithm)),
      );
      expect(last.reports).toHaveLength(cases.length);
      expect(last.inputCursor.consumed).toBe(input.match(/\S+/g)!.length);
      for (const step of run.steps) {
        expect(Object.isFrozen(step.memory)).toBe(true);
        expect(step.activeLines[0]).toBeGreaterThan(0);
        expect(step.activeLines[0]).toBeLessThanOrEqual(
          run.code.text.split("\n").length,
        );
        expect(new Set(step.memory.frontier).size).toBe(
          step.memory.frontier.length,
        );
        if (step.current) {
          const test = cases[step.caseIndex];
          expect(step.current.r).toBeGreaterThanOrEqual(0);
          expect(step.current.c).toBeGreaterThanOrEqual(0);
          expect(step.current.r).toBeLessThan(test.rows);
          expect(step.current.c).toBeLessThan(test.cols);
        }
        if (step.marker === "terrain") {
          const test = cases[step.caseIndex];
          expect(step.neighbor?.r).toBeGreaterThanOrEqual(0);
          expect(step.neighbor?.r).toBeLessThan(test.rows);
          expect(step.neighbor?.c).toBeGreaterThanOrEqual(0);
          expect(step.neighbor?.c).toBeLessThan(test.cols);
        }
      }
      expect(run.steps.find((s) => s.marker === "print")!.outputs).toHaveLength(
        1,
      );
      expect(
        run.steps.find((s) => s.marker === "solveCall" && s.scopes.main.result)!
          .scopes.solve,
      ).toBeUndefined();
    });
  }
describe("Grid judge input", () => {
  it("round-trips multiple cases with optional coordinate headers", () => {
    for (const problem of Object.keys(PROBLEMS) as GridProblem[]) {
      const cases = gridExample(problem);
      expect(
        parseGridInput(serializeGridInput(cases, problem), problem),
      ).toEqual(cases);
    }
  });
  it.each([
    "0",
    "2\n1 1\n0",
    "1\n1 1\n3",
    "1\n1 1\n0 9",
    "1\n13 2\n0",
    "1\n1 1\nx",
  ])("rejects malformed input %s", (input) =>
    expect(() => parseGridInput(input, "collect")).toThrow(),
  );
  it("rejects blocked endpoints and invalid coordinates", () => {
    expect(() => parseGridInput("1\n1 1\n0 0 0 0\n1", "reach")).toThrow(
      /tường/,
    );
    expect(() => parseGridInput("1\n1 1\n0 0 1 0\n0", "reach")).toThrow(
      /tọa độ/,
    );
  });
  it("supports CRLF, blank lines and tokenization across lines exactly like the Java buffer", () => {
    const input = "1\r\n\r\n2\r\n2\r\n2 0\r\n0 2\r\n";
    expect(
      generateGridRun(input, "collect", "row").steps.at(-1)!.outputs,
    ).toEqual(["2"]);
  });
  it("validates expected output lines without substituting them for actual", () => {
    expect(parseExpected("", 2)).toBeNull();
    expect(() => parseExpected("1", 2)).toThrow();
    const run = generateGridRun("1\n1 1\n2", "collect", "row", ["999"]);
    expect(run.expected).toEqual(["999"]);
    expect(run.steps.at(-1)!.outputs).toEqual(["1"]);
  });
});
describe("Traversal and search correctness", () => {
  it("uses distinct row, column and snake orders", () => {
    expect(scanOrder(2, 3, "row")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(scanOrder(2, 3, "column")).toEqual([0, 3, 1, 4, 2, 5]);
    expect(scanOrder(2, 3, "snake")).toEqual([0, 1, 2, 5, 4, 3]);
  });
  it.each(["row", "column", "snake", "linear"] as GridAlgorithm[])(
    "handles missing treasures and stops correctly (%s)",
    (algorithm) => {
      const run = generateGridRun("2\n1 1\n0\n1 1\n2", "find", algorithm);
      expect(run.steps.at(-1)!.outputs).toEqual(["-1 -1", "0 0"]);
    },
  );
  it.each(["bfs", "dfs"] as GridAlgorithm[])(
    "handles S=G, unreachable cells and loops (%s)",
    (algorithm) => {
      const run = generateGridRun(
        "2\n1 1\n0 0 0 0\n0\n3 3\n0 0 2 2\n0 0 0\n1 1 1\n0 0 0",
        "reach",
        algorithm,
      );
      expect(run.steps.at(-1)!.outputs).toEqual(["YES", "NO"]);
      expect(
        run.steps.filter((s) => s.marker === "markSeen").length,
      ).toBeLessThan(10);
    },
  );
  it("BFS shortest distance equals path length minus one and each path edge is adjacent", () => {
    const run = generateGridRun(
      "1\n3 4\n0 0 2 3\n0 0 1 0\n1 0 0 0\n0 0 1 0",
      "shortest",
      "bfs",
    );
    const step = run.steps.find((s) => s.marker === "pathReturn")!,
      path = step.memory.path;
    expect(Number(run.steps.at(-1)!.outputs[0])).toBe(path.length - 1);
    for (let i = 1; i < path.length; i++)
      expect(
        Math.abs(Math.floor(path[i] / 4) - Math.floor(path[i - 1] / 4)) +
          Math.abs((path[i] % 4) - (path[i - 1] % 4)),
      ).toBe(1);
  });
  it("marks neighbors seen before enqueue and expands each cell at most once", () => {
    const run = generateGridRun(
      "1\n3 3\n0 0 2 2\n0 0 0\n0 0 0\n0 0 0",
      "reach",
      "bfs",
    );
    const seen = new Set<number>();
    for (const s of run.steps.filter((s) => s.marker === "pop")) {
      const id = Number(s.scopes.solve.id.value);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(9);
  });
  it("counts components rather than land cells, including diagonal separation", () => {
    for (const algorithm of ["bfs", "dfs"] as const)
      expect(
        generateGridRun(
          "2\n2 2\n1 0\n0 1\n2 2\n1 1\n1 1",
          "islands",
          algorithm,
        ).steps.at(-1)!.outputs,
      ).toEqual(["2", "1"]);
  });
  it("uses extra flat array memory only for flatten traversal", () => {
    const input = "1\n2 2\n2 0\n0 2",
      row = generateGridRun(input, "collect", "row"),
      flat = generateGridRun(input, "collect", "linear");
    expect(flat.steps.at(-1)!.reports[0].counts.cellReads).toBe(8);
    expect(row.steps.at(-1)!.reports[0].counts.cellReads).toBe(4);
    expect(
      flat.steps.at(-1)!.reports[0].counts.peakBytes -
        row.steps.at(-1)!.reports[0].counts.peakBytes,
    ).toBe(16);
  });
  it("replays deterministic snapshots without looking at elapsed generation time", () => {
    const input = "1\n2 2\n0 2\n2 0";
    expect(generateGridRun(input, "find", "column").steps).toEqual(
      generateGridRun(input, "find", "column").steps,
    );
  });
});
it("randomized small grids agree with an independent oracle for all supported traversals", () => {
  let seed = 20261020;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let sample = 0; sample < 12; sample++) {
    const rows = 1 + Math.floor(random() * 4),
      cols = 1 + Math.floor(random() * 5);
    for (const problem of Object.keys(PROBLEMS) as GridProblem[]) {
      const cells = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          Math.floor(random() * (problem === "islands" ? 2 : 3)),
        ),
      );
      if (PROBLEMS[problem].hasPoints) {
        cells[0][0] = 0;
        cells[rows - 1][cols - 1] = 0;
      }
      const test = {
        rows,
        cols,
        cells,
        start: { r: 0, c: 0 },
        goal: { r: rows - 1, c: cols - 1 },
      };
      for (const algorithm of PROBLEMS[problem].algorithms) {
        const run = generateGridRun(
          serializeGridInput([test], problem),
          problem,
          algorithm,
        );
        expect(run.steps.at(-1)!.outputs).toEqual([
          referenceAnswer(test, problem, algorithm),
        ]);
      }
    }
  }
});
it("static initialization precedes main and closed input scopes do not leak", () => {
  const run = generateGridRun("1\n1 2\n0 2", "collect", "row");
  expect(run.steps[0].callStack).toEqual(["<clinit>()"]);
  expect(run.steps[0].scopes.main).toBeUndefined();
  for (const step of run.steps) {
    if (step.marker === "tokenCheck")
      expect(step.scopes.nextInt.line).toBeUndefined();
    if (step.marker === "inputRNext") expect(step.scopes.main.c).toBeDefined();
  }
});
it("reader identity remains stable and token buffer changes only at new StringTokenizer", () => {
  const run = generateGridRun("1\n1 2\n0 2", "collect", "row");
  const reads = run.steps.filter((s) => s.marker === "readLine");
  expect(new Set(reads.map((s) => s.scopes.static.reader.value))).toEqual(
    new Set(["reader@input"]),
  );
  for (let i = 0; i < run.steps.length; i++)
    if (run.steps[i].marker === "readLine" && i > 0)
      expect(run.steps[i].scopes.static.tokens.value).toBe(
        run.steps[i - 1].scopes.static.tokens.value,
      );
  expect(
    run.steps.find((s) => s.marker === "nextToken")!.scopes.watch[
      "tokens.countTokens()"
    ].value,
  ).toBe(0);
});
it("matches Java BufferedReader CR-only line endings and StringTokenizer delimiters", () => {
  expect(
    generateGridRun("1\r1 2\r0\t2", "collect", "row").steps.at(-1)!.outputs,
  ).toEqual(["1"]);
  expect(() => parseGridInput("1\n1\u00a02\n0 2", "collect")).toThrow(
    /số nguyên/,
  );
});
