import { describe, it, expect } from "vitest";
import { appendOperations, newSession } from "@/engine/session";
import { arrayRun } from "@/algorithms/array";
import { linkedRun } from "@/algorithms/linked";
import { stackRun, queueRun } from "@/algorithms/stack-queue";
import { treeRun } from "@/algorithms/tree";
import {
  traversalRun,
  parseGraphInput,
  adjacencyMatrix,
  GRAPH_EDGES,
  GRAPH_NODES,
  GRAPH_INPUT,
  graphKeyType,
} from "@/algorithms/graph";
import { transition, initialPlayback } from "@/engine/playback";
import type {
  LessonRun,
  OperationRequest,
  TreeState,
  LinkedState,
} from "@/engine/types";
const last = (run: LessonRun) => run.steps.at(-1)!.state;
const request = (operation: string, at = 5, value = 49): OperationRequest => ({
  operation,
  at,
  value,
});
function linkedValues(s: LinkedState) {
  const values: number[] = [],
    seen = new Set<string>();
  let id = s.head;
  while (id) {
    expect(seen.has(id)).toBe(false);
    seen.add(id);
    const n = s.nodes.find((n) => n.id === id)!;
    expect(n).toBeDefined();
    values.push(n.value);
    id = n.next;
  }
  expect(seen.size).toBe(s.nodes.length);
  expect(s.nodes.find((n) => n.id === s.tail)?.next ?? null).toBeNull();
  return values;
}
function bstKeys(s: TreeState) {
  const walk = (id: string | null, min: number, max: number): number[] => {
    if (!id) return [];
    const n = s.nodes.find((n) => n.id === id)!;
    expect(n.key).toBeGreaterThan(min);
    expect(n.key).toBeLessThan(max);
    return [...walk(n.left, min, n.key), n.key, ...walk(n.right, n.key, max)];
  };
  const result = walk(s.root, -Infinity, Infinity);
  expect(result).toHaveLength(s.nodes.length);
  expect(new Set(s.nodes.map((n) => n.id)).size).toBe(s.nodes.length);
  return result;
}
describe("Persistent datasets and combined timelines", () => {
  it("runs three array operations on the preceding result and replays across source boundaries", () => {
    const base = newSession("array"),
      serial = JSON.stringify(base);
    const session = appendOperations("array", base, [
      request("insert", 0, 123),
      request("remove", 6),
      request("get", 0),
    ]);
    const final = last(session.run);
    if (final.kind !== "array") throw Error();
    expect(final.slots.slice(0, final.size)).toEqual([
      123, 11, 18, 25, 31, 42, 55, 63, 71, 86, 94,
    ]);
    expect(session.segments).toHaveLength(4);
    expect(JSON.stringify(base)).toBe(serial);
    const boundary = session.segments[2].start;
    let cursor = transition(
      initialPlayback,
      { type: "seek", index: boundary },
      session.run.steps.length,
    );
    const step = session.run.steps[cursor.index];
    cursor = transition(cursor, { type: "previous" }, session.run.steps.length);
    cursor = transition(cursor, { type: "settled" }, session.run.steps.length);
    cursor = transition(cursor, { type: "next" }, session.run.steps.length);
    expect(session.run.steps[cursor.index]).toBe(step);
    expect(step.source?.text).toContain("int removed");
    for (const s of session.run.steps) {
      expect(Object.isFrozen(s)).toBe(true);
      s.activeLines.forEach((line) =>
        expect(line).toBeLessThanOrEqual(
          (s.source ?? session.run.code).text.split("\n").length,
        ),
      );
    }
  });
  it("automatically grows a full array before shifting, retains item identity and all values", () => {
    const full = last(arrayRun("resize"));
    if (full.kind !== "array") throw Error();
    const seed = { ...full, slots: full.slots.slice(0, full.size) };
    const run = arrayRun("insert", 3, 999, seed),
      final = last(run);
    if (final.kind !== "array") throw Error();
    expect(final.slots).toHaveLength(18);
    expect(final.size).toBe(13);
    expect(final.slots[3]).toBe(999);
    expect(final.slots.slice(0, 13)).toEqual([
      ...seed.slots.slice(0, 3),
      999,
      ...seed.slots.slice(3),
    ]);
    seed.items.forEach((n) =>
      expect(final.items.find((x) => x.id === n.id)?.value).toBe(n.value),
    );
    expect(
      run.steps.findIndex((s) => s.title === "Chuyển tham chiếu elements"),
    ).toBeLessThan(run.steps.findIndex((s) => s.title.startsWith("Dịch")));
  });
  it("does not add phantom values when explicitly resizing the shared array", () => {
    const seed = last(arrayRun("get"));
    if (seed.kind !== "array") throw Error();
    const final = last(arrayRun("resize", 0, 49, seed));
    if (final.kind !== "array") throw Error();
    expect(final.size).toBe(10);
    expect(final.slots.slice(0, 10)).toEqual(seed.slots.slice(0, 10));
  });
  it("keeps references and tail correct across repeated linked removals and duplicate values", () => {
    let seed = last(linkedRun("removeAfter"));
    if (seed.kind !== "linked") throw Error();
    seed = last(linkedRun("removeAfter", seed)) as LinkedState;
    expect(linkedValues(seed)).not.toContain(72);
    seed = last(linkedRun("addLast", seed, 48)) as LinkedState;
    expect(linkedValues(seed).at(-1)).toBe(48);
    expect(new Set(seed.nodes.map((n) => n.id)).size).toBe(seed.nodes.length);
    while (seed.nodes.length)
      seed = last(linkedRun("removeFirst", seed)) as LinkedState;
    expect(seed.head).toBeNull();
    expect(seed.tail).toBeNull();
    seed = last(linkedRun("addLast", seed, 7)) as LinkedState;
    expect(linkedValues(seed)).toEqual([7]);
  });
  it("applies pop-pop-push to one editor history, including the empty case", () => {
    const session = appendOperations("stack", newSession("stack"), [
      request("pop"),
      request("pop"),
      { ...request("push"), text: "Add caption" },
    ]);
    let state = last(session.run);
    if (state.kind !== "stack") throw Error();
    expect(state.items).toHaveLength(7);
    expect(state.editor.at(-1)).toBe("Add caption");
    expect(state.items.map((n) => n.value)).toEqual(state.editor);
    while (state.items.length) {
      state = last(stackRun("pop", state));
      if (state.kind !== "stack") throw Error();
    }
    expect(stackRun("pop", state).expectedOutput).toBe("Stack is empty\n[]");
    expect(stackRun("peek", state).expectedOutput).toBe("Top: null\n[]");
    expect(stackRun("isEmpty", state).expectedOutput).toBe("Empty: true\n[]");
  });
  it("keeps completed jobs across two polls and one offer", () => {
    const session = appendOperations("queue", newSession("queue"), [
      request("poll"),
      request("poll"),
      request("offer"),
    ]);
    const s = last(session.run);
    if (s.kind !== "queue") throw Error();
    expect(s.completed.map((n) => n.value)).toEqual(["M01", "M02", "M03"]);
    expect(s.items[0].value).toBe("M04");
    expect(s.items.at(-1)?.value).toBe("M11");
    const ids = [...s.items, ...s.completed].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(queueRun("peek", s).expectedOutput).toContain("Front: M04");
  });
  it("rejects fractional Java int arguments before appending a simulation", () => {
    expect(() => treeRun("insert", 1.5)).toThrow(RangeError);
    expect(() => treeRun("build", undefined, undefined, [1, 2.5])).toThrow(
      RangeError,
    );
    expect(() => linkedRun("addFirst", undefined, 3.14)).toThrow(RangeError);
  });
  it("does not recycle the identity of an item after it was removed", () => {
    const before = last(stackRun("pop"));
    if (before.kind !== "stack") throw Error();
    const oldId = before.removed!.id;
    const after = last(stackRun("push", before, "Insert title"));
    if (after.kind !== "stack") throw Error();
    expect(after.items.at(-1)!.id).not.toBe(oldId);
    const removed = last(arrayRun("remove", 5));
    if (removed.kind !== "array") throw Error();
    const inserted = last(arrayRun("insert", 5, 55, removed));
    if (inserted.kind !== "array") throw Error();
    expect(inserted.items.find((n) => n.slot === 5)!.id).not.toBe("a-5");
  });
  it("does not partially append a batch if a later operation is invalid", () => {
    const session = newSession("array"),
      serial = JSON.stringify(session);
    expect(() =>
      appendOperations("array", session, [
        request("add"),
        request("remove", 999),
      ]),
    ).toThrow();
    expect(JSON.stringify(session)).toBe(serial);
  });
});
describe("Tree input and general deletion", () => {
  it("builds a tree one ID at a time, then searches and updates the same nodes", () => {
    const run = treeRun("build", undefined, undefined, [10, 5, 15, 12]);
    expect(
      run.steps[0].state.kind === "tree" && run.steps[0].state.nodes,
    ).toEqual([]);
    expect(
      run.steps.filter((s) => s.animations.some((a) => a.kind === "insert")),
    ).toHaveLength(4);
    const seed = last(run) as TreeState;
    expect(bstKeys(seed)).toEqual([5, 10, 12, 15]);
    expect(treeRun("search", 12, seed).expectedOutput).toBe("Lesson 12");
    const deleted = last(treeRun("delete", 10, seed)) as TreeState;
    expect(bstKeys(deleted)).toEqual([5, 12, 15]);
    const inserted = last(treeRun("insert", 10, deleted)) as TreeState;
    expect(bstKeys(inserted)).toEqual([5, 10, 12, 15]);
    expect(inserted.nodes.find((n) => n.key === 12)?.id).toBe("t10");
  });
  it.each([5, 15, 10, 999])(
    "deletes leaf/one child/two children/absent ID %s",
    (key) => {
      const seed = last(
        treeRun("build", undefined, undefined, [10, 5, 15, 12]),
      ) as TreeState;
      const s = last(treeRun("delete", key, seed)) as TreeState;
      expect(bstKeys(s)).toEqual([5, 10, 12, 15].filter((n) => n !== key));
    },
  );
});
describe("Numeric graph sample", () => {
  it.each(["list", "matrix"] as const)(
    "loads and traverses the numeric sample with matching Java and debugger values (%s)",
    (rep) => {
      const input = parseGraphInput(GRAPH_INPUT);
      expect(input.nodes).toEqual(GRAPH_NODES);
      const loaded = last(traversalRun("load", undefined, rep, input));
      if (loaded.kind !== "graph") throw Error();
      const bfs = traversalRun("bfs", loaded, rep),
        dfs = traversalRun("dfs", loaded, rep);
      expect(bfs.expectedOutput).toBe("[1, 2, 3, 4, 5, 7]\nPath: [1, 2, 4, 7]");
      expect(dfs.expectedOutput).toBe("[1, 2, 4, 7, 3, 5]");
      expect(bfs.code.text).toContain(
        "List<Integer> names = List.of(1, 2, 3, 4, 5, 6, 7)",
      );
      expect(bfs.code.text).toContain("main(String[] args)");
      expect(bfs.steps.at(-1)!.variables).toMatchObject({
        start: 1,
        goal: 7,
        path: [1, 2, 4, 7],
      });
    },
  );
  it("preserves custom string labels, leading zeros and IDs outside the Java int range", () => {
    expect(graphKeyType(["1", "2"])).toBe("Integer");
    for (const nodes of [["A", "2"], ["01", "1"], ["2147483648"]])
      expect(graphKeyType(nodes)).toBe("String");
  });
});
describe("Graph storage, DFS backtracking and BFS parent tracing", () => {
  const input = parseGraphInput("A>B, A>C, B>D, C>D, D>A, Isolated");
  it.each(["list", "matrix"] as const)(
    "loads one edge at a time into %s",
    (rep) => {
      const run = traversalRun("load", undefined, rep, input);
      expect(
        run.steps[0].state.kind === "graph" && run.steps[0].state.edges,
      ).toEqual([]);
      const steps = run.steps.filter((s) =>
        s.animations.some((a) => a.kind === "edge"),
      );
      expect(steps).toHaveLength(input.edges.length);
      steps.forEach((s, i) => {
        if (s.state.kind !== "graph") throw Error();
        expect(s.state.edges).toHaveLength(i + 1);
        const matrix = adjacencyMatrix(s.state);
        s.state.nodes.forEach(
          (from, row) =>
            s.state.kind === "graph" &&
            s.state.nodes.forEach((to, col) =>
              expect(matrix[row][col]).toBe(
                Number(
                  s.state.kind === "graph" &&
                    s.state.edges.some((e) => e.from === from && e.to === to),
                ),
              ),
            ),
        );
      });
    },
  );
  it.each(["list", "matrix"] as const)(
    "DFS in %s has real backtracking and visits each reachable vertex once",
    (rep) => {
      const seed = last(traversalRun("load", undefined, rep, input));
      if (seed.kind !== "graph") throw Error();
      const run = traversalRun("dfs", seed, rep, input, "A", "D"),
        s = last(run);
      if (s.kind !== "graph") throw Error();
      expect(s.order).toEqual(["A", "B", "D", "C"]);
      expect(s.visited).not.toContain("Isolated");
      expect(s.stack).toEqual([]);
      expect(s.edges).toEqual(seed.edges);
      expect(
        run.steps.filter((s) => s.title.startsWith("Quay lui")),
      ).toHaveLength(4);
      run.steps.forEach((step) => {
        if (step.state.kind !== "graph") throw Error();
        expect(new Set(step.state.visited).size).toBe(
          step.state.visited?.length,
        );
        expect(step.callStack).toEqual(
          [...(step.state.stack ?? [])]
            .reverse()
            .map((n) => `dfs(${n})`)
            .concat("main(String[] args)"),
        );
      });
    },
  );
  it.each(["list", "matrix"] as const)(
    "BFS in %s traces a shortest parent path and never enqueues twice",
    (rep) => {
      const seed = last(traversalRun("load", undefined, rep, input));
      if (seed.kind !== "graph") throw Error();
      const run = traversalRun("bfs", seed, rep, input, "A", "D"),
        s = last(run);
      if (s.kind !== "graph") throw Error();
      expect(s.order).toEqual(["A", "B", "C", "D"]);
      expect(s.path).toEqual(["A", "B", "D"]);
      expect(s.parents?.D).toBe("B");
      expect(s.ready).toEqual([]);
      run.steps.forEach((step) => {
        if (step.state.kind !== "graph") throw Error();
        expect(new Set(step.state.ready).size).toBe(step.state.ready.length);
        const graph = step.state;
        graph.ready.forEach((n) => expect(graph.visited).toContain(n));
      });
      const absent = last(
        traversalRun("bfs", seed, rep, input, "A", "Isolated"),
      );
      if (absent.kind !== "graph") throw Error();
      expect(absent.path).toEqual([]);
    },
  );
  it("chains load → DFS → BFS on a custom graph without restoring the course dataset", () => {
    const session = appendOperations("graph", newSession("graph"), [
      { ...request("load"), input: "A>B, B>C, X", representation: "matrix" },
      { ...request("dfs"), start: "A", goal: "C", representation: "matrix" },
      { ...request("bfs"), start: "A", goal: "C", representation: "matrix" },
    ]);
    const s = last(session.run);
    if (s.kind !== "graph") throw Error();
    expect(s.nodes).toEqual(["A", "B", "C", "X"]);
    expect(s.path).toEqual(["A", "B", "C"]);
    expect(s.edges).not.toEqual(GRAPH_EDGES);
  });
  it("accepts isolated vertices, deduplicates edges, and rejects malformed input", () => {
    expect(parseGraphInput("A, A>B, A>B").edges).toHaveLength(1);
    expect(() => parseGraphInput("A>B>C")).toThrow();
    expect(() => parseGraphInput("")).toThrow();
  });
});
