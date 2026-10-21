import { describe, expect, it } from "vitest";
import {
  TREE_METHODS,
  TREE_PROBLEMS,
  type TreeCase,
  type TreeProblem,
} from "@/problems/tree/types";
import {
  TREE_SAMPLES,
  parseTreeInput,
  serializeTreeCases,
  treeExpected,
  treeOutput,
  treeReference,
} from "@/problems/tree/input";
import { solveTree } from "@/problems/tree/execute";
import { generateTreeRun } from "@/problems/tree/replay";
import { layoutTree, treeTopology } from "@/problems/tree/layout";

const problems = ["leaves", "depth"] as const;
const sample = (p: TreeProblem) => parseTreeInput(TREE_SAMPLES[p].input, p);
function chain(n: number): TreeCase {
  return {
    n,
    edges: Array.from(
      { length: n - 1 },
      (_, i) => [i + 1, i + 2] as const,
    ).reverse(),
    queries: [n, 1, n, n - 1],
  };
}
function shuffledTrees(): TreeCase[] {
  let seed = 492731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const shuffle = <T>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  return Array.from({ length: 50 }, () => {
    const n = 2 + Math.floor(random() * 40),
      ids = [1, ...shuffle(Array.from({ length: n - 1 }, (_, i) => i + 2))];
    return {
      n,
      edges: shuffle(
        ids
          .slice(1)
          .map((id, i) => [ids[Math.floor(random() * (i + 1))], id] as const),
      ),
      queries: shuffle([...ids, 1, n, n]),
    };
  });
}
for (const p of problems)
  for (const method of TREE_PROBLEMS[p].methods) {
    describe(`${p}/${method}`, () => {
      it("matches every original PDF testcase, including the required colon", () => {
        const actual = sample(p)
          .map((t, i) => treeOutput(i, solveTree(t, p, method).values))
          .join("\n");
        expect(actual).toBe(TREE_SAMPLES[p].expected);
      });
      it("handles shuffled edge order and labels against an independent oracle", () => {
        for (const t of shuffledTrees())
          expect(solveTree(t, p, method).values).toEqual(treeReference(t, p));
      });
      it("handles a single root and a 10,000-node deep tree without recursion", () => {
        const root: TreeCase = {
          n: 1,
          edges: [],
          queries: p === "depth" ? [1, 1] : [],
        };
        expect(solveTree(root, p, method).values).toEqual(
          p === "depth" ? [0, 0] : [1],
        );
        expect(solveTree(chain(10000), p, method).values).toEqual(
          p === "depth" ? [9999, 0, 9999, 9998] : [1],
        );
      });
      it("replays immutable snapshots with real Java lines and final exact output", () => {
        const t = sample(p)[0],
          r = generateTreeRun(t, p, method),
          last = r.steps.at(-1)!;
        expect(last.scene.output).toBe(treeOutput(0, treeReference(t, p)));
        expect(Object.isFrozen(last.scene.nodes)).toBe(true);
        expect(Object.isFrozen(r.steps[0].scopes.main)).toBe(true);
        const before = JSON.stringify(r.steps);
        for (let i = 1; i < r.steps.length; i++) {
          const s = r.steps[i];
          expect(s.activeLines).toEqual([r.code.markers[s.marker]]);
          expect(r.code.text.split("\n")[s.activeLines[0] - 1].trim()).not.toBe(
            "",
          );
          expect(s.scene.work.visits).toBeGreaterThanOrEqual(
            r.steps[i - 1].scene.work.visits,
          );
          expect(s.scene.work.writes).toBeGreaterThanOrEqual(
            r.steps[i - 1].scene.work.writes,
          );
          if (s.scene.activeEdge)
            expect(t.edges).toContainEqual(s.scene.activeEdge);
        }
        // Previous/Next select these same snapshots, without mutating algorithm memory.
        const next = r.steps[20],
          previous = r.steps[19];
        expect(previous.id).not.toBe(next.id);
        expect(JSON.stringify(r.steps[20])).toBe(JSON.stringify(next));
        expect(JSON.stringify(r.steps)).toBe(before);
      });
    });
  }
describe("tree input and judging", () => {
  for (const p of problems)
    it(`${p}: round trips the exact multi-case grammar`, () => {
      const tests = sample(p);
      expect(parseTreeInput(serializeTreeCases(tests, p), p)).toEqual(tests);
      expect(treeExpected(TREE_SAMPLES[p].expected, tests, p)).toEqual(
        TREE_SAMPLES[p].expected.split("\n"),
      );
      expect(treeExpected("", tests, p)).toEqual([]);
    });
  it.each([
    ["0", "leaves"],
    ["11\n1", "leaves"],
    ["1\n10001", "leaves"],
    ["1\n3\n1 2", "leaves"],
    ["1\n3\n1 2\n1 2", "leaves"],
    ["1\n2\n2 1", "leaves"],
    ["1\n3\n2 3\n3 2", "leaves"],
    ["1\n2\n1 1", "leaves"],
    ["1\n2\n1 3", "leaves"],
    ["1\n1\n99", "leaves"],
    ["1\n1 0", "depth"],
    ["1\n1 1\n2", "depth"],
  ] as const)("rejects invalid input %s", (input, p) =>
    expect(() => parseTreeInput(input, p)).toThrow(),
  );
  it("checks format without silently replacing an incorrect expected value", () => {
    const t = sample("depth");
    expect(() => treeExpected("#1 0 2 1\n#2 3 1", t, "depth")).toThrow();
    expect(() => treeExpected("#1: 0 2\n#2: 3 1", t, "depth")).toThrow();
    expect(treeExpected("#1: 9 9 9\n#2: 9 9", t, "depth")[0]).toBe("#1: 9 9 9");
  });
  it("does not count a root with one child as a leaf", () => {
    for (const m of TREE_PROBLEMS.leaves.methods)
      expect(
        solveTree({ n: 2, edges: [[1, 2]], queries: [] }, "leaves", m).values,
      ).toEqual([1]);
  });
  it("rejects methods belonging to the other problem", () =>
    expect(() =>
      solveTree(sample("leaves")[0], "leaves", "memo-depth"),
    ).toThrow());
});
describe("Java memory and execution semantics", () => {
  it("updates only the parent out-degree after the actual increment line", () => {
    const r = generateTreeRun(sample("leaves")[0], "leaves", "degree");
    const steps = r.steps.filter((s) => s.marker === "degreeInc");
    expect(
      steps.map((s) => s.scene.nodes.find((n) => n.id === 1)!.degree),
    ).toEqual([1, 2, 2, 2]);
    expect(steps.map((s) => s.scopes.solve.edge.value)).toEqual([
      [1, 2],
      [1, 3],
      [2, 4],
      [2, 5],
    ]);
    expect(
      r.steps.find((s) => s.marker === "countInit")!.scopes.solve.edge,
    ).toBeUndefined();
    expect(steps[0].scopes.solve.degree.value).toEqual([0, 1, 0, 0, 0, 0]);
  });
  it("retains unique parents in HashSet and counts only once after all edges", () => {
    const r = generateTreeRun(sample("leaves")[0], "leaves", "parents-set");
    expect(
      r.steps
        .filter((s) => s.marker === "setAdd")
        .map((s) => s.scene.parentSetSize),
    ).toEqual([1, 1, 2, 2]);
    expect(
      r.steps
        .filter((s) => s.marker === "setAdd")
        .every((s) => s.scene.leafCount === 0),
    ).toBe(true);
    expect(r.steps.find((s) => s.marker === "setReturn")!.scene.leafCount).toBe(
      3,
    );
  });
  it("BFS polls FIFO while DFS pops LIFO, with TOP/FRONT matching memory", () => {
    for (const [method, order] of [
      ["leaf-bfs", [1, 2, 3, 4, 5]],
      ["leaf-dfs", [1, 2, 4, 5, 3]],
    ] as const) {
      const r = generateTreeRun(sample("leaves")[0], "leaves", method);
      expect(
        r.steps.filter((s) => s.marker === "pop").map((s) => s.scene.current),
      ).toEqual(order);
      for (const [i, s] of r.steps.entries())
        if (s.marker === "pop")
          expect(r.steps[i - 1].scene.frontier[0]).toBe(s.scene.current);
      expect(r.solution.metrics.pushes).toBe(5);
      expect(r.solution.metrics.pops).toBe(5);
    }
  });
  it("creates child lists before linking edges, in a separate helper scope", () => {
    const r = generateTreeRun(sample("leaves")[0], "leaves", "leaf-bfs");
    expect(
      r.steps.find((s) => s.marker === "childrenNew")!.scopes.buildChildren
        .children.value,
    ).toEqual([]);
    const links = r.steps.filter((s) => s.marker === "link");
    expect(links[0].scopes.buildChildren.children.value).toEqual([
      [],
      [2],
      [],
      [],
      [],
      [],
    ]);
    expect(links[0].scopes.solve.children).toBeUndefined();
    expect(links[0].callStack).toHaveLength(3);
  });
  it("keeps default answer zero pending until assignment, and output pending until println", () => {
    for (const m of TREE_PROBLEMS.depth.methods) {
      const r = generateTreeRun(sample("depth")[0], "depth", m);
      const allocated = r.steps.find((s) => s.marker === "answerNew")!;
      expect(allocated.scopes.solve.answer.value).toEqual([0, 0, 0]);
      expect(allocated.scene.answers).toEqual([null, null, null]);
      expect(
        r.steps.find((s) => s.marker === "answerWrite")!.scene.answers,
      ).toEqual([0, null, null]);
      expect(r.steps.slice(0, -1).every((s) => s.scene.output === null)).toBe(
        true,
      );
    }
  });
  it("assigns depth[child] = depth[parent] + 1 in BFS and DFS", () => {
    for (const m of ["depth-bfs", "depth-dfs"] as const) {
      const r = generateTreeRun(sample("depth")[0], "depth", m);
      for (const s of r.steps.filter((s) => s.marker === "depthWrite")) {
        const [u, v] = s.scene.activeEdge!,
          nodes = s.scene.nodes;
        expect(nodes.find((n) => n.id === v)!.depth).toBe(
          nodes.find((n) => n.id === u)!.depth + 1,
        );
        expect(s.scene.frontier).not.toContain(v);
      }
    }
  });
  it("memoizes each unknown depth once and avoids repeated full parent walks", () => {
    const t = chain(40),
      walk = solveTree(t, "depth", "parent-walk"),
      memo = solveTree(t, "depth", "memo-depth");
    expect(memo.values).toEqual(walk.values);
    expect(memo.metrics.visits).toBe(39);
    expect(walk.metrics.visits).toBe(116);
    const r = generateTreeRun(t, "depth", "memo-depth");
    const assigned = r.steps
      .filter((s) => s.marker === "memoDepth")
      .map((s) => s.scene.current);
    expect(new Set(assigned).size).toBe(39);
    expect(assigned).toHaveLength(39);
  });
  it("keeps large traces bounded, with accurate results, counters, and focus", () => {
    const t = chain(10000),
      r = generateTreeRun(t, "depth", "memo-depth", {
        focusNode: 9999,
        focusQuery: 0,
      });
    expect(r.detailed).toBe(false);
    expect(r.steps.length).toBeLessThan(1500);
    expect(
      r.steps.every(
        (s) => s.scene.nodes.length <= 48 && s.scene.frontier.length <= 32,
      ),
    ).toBe(true);
    expect(r.steps.some((s) => s.omittedBefore > 0)).toBe(true);
    expect(
      r.steps.some((s) => s.marker === "memoDepth" && s.scene.current === 9999),
    ).toBe(true);
    expect(r.steps.at(-1)!.scene.output).toBe("#1: 9999 0 9999 9998");
    expect(r.solution.metrics.visits).toBe(9999);
    expect(
      r.steps.find((s) => s.marker === "depthNew")!.scopes.solve.depth.value,
    ).toContain("cửa sổ");
  });
  it("lays out arbitrary labels and a deep tree without assuming a BST or recursion", () => {
    const t: TreeCase = {
      n: 5,
      edges: [
        [5, 2],
        [1, 5],
        [3, 4],
        [5, 3],
      ],
      queries: [4],
    };
    const topology = treeTopology(t),
      l = layoutTree(topology, [1, 2, 3, 4, 5]);
    expect(l.points.size).toBe(5);
    expect(topology.levels[4]).toBe(3);
    expect(l.points.get(5)!.y).toBeLessThan(l.points.get(2)!.y);
    const deep = treeTopology(chain(10000));
    expect(deep.levels[10000]).toBe(9999);
    expect(layoutTree(deep, [1, 9998, 9999, 10000]).points.size).toBe(4);
  });
});
