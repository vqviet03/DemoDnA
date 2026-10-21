import { describe, expect, it } from "vitest";
import { arrayRun, ARRAY_VALUES } from "@/algorithms/array";
import { linkedRun } from "@/algorithms/linked";
import { stackRun, queueRun, ACTIONS } from "@/algorithms/stack-queue";
import { treeRun } from "@/algorithms/tree";
import { graphRun, GRAPH_EDGES } from "@/algorithms/graph";
import { createRun, LESSONS } from "@/data/lessons";
import type {
  ArrayState,
  GraphState,
  LinkedState,
  TreeState,
} from "@/engine/types";
describe("ArrayList physical memory replay", () => {
  it("copies right-to-left in five independent steps, retaining each source until overwritten", () => {
    const run = arrayRun("insert");
    const copies = run.steps.filter((s) =>
      s.animations.some((a) => a.kind === "copy"),
    );
    expect(copies.map((s) => s.variables.moving)).toEqual([94, 86, 71, 63, 55]);
    copies.forEach((s, i) => {
      const state = s.state as ArrayState;
      const from = 9 - i;
      expect(state.slots[from]).toBe(ARRAY_VALUES[from]);
      expect(state.slots[from + 1]).toBe(ARRAY_VALUES[from]);
      expect(new Set(state.items.map((x) => x.id)).size).toBe(
        state.items.length,
      );
    });
    const final = run.steps.at(-1)!.state as ArrayState;
    expect(final.slots.slice(0, final.size)).toEqual([
      11, 18, 25, 31, 42, 49, 55, 63, 71, 86, 94,
    ]);
    expect(
      final.items
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((n) => n.value),
    ).toEqual(final.slots.slice(0, 11));
  });
  it.each([0, 1, 5, 10])(
    "inserts at boundary/index %s without losing values",
    (at) => {
      const result = arrayRun("insert", at, 123).steps.at(-1)!
        .state as ArrayState;
      const expected: number[] = [...ARRAY_VALUES];
      expected.splice(at, 0, 123);
      expect(result.slots.slice(0, result.size)).toEqual(expected);
    },
  );
  it.each([0, 5, 9])("removes index %s and clears the final slot", (at) => {
    const s = arrayRun("remove", at).steps.at(-1)!.state as ArrayState;
    const expected: number[] = [...ARRAY_VALUES];
    expected.splice(at, 1);
    expect(s.slots.slice(0, s.size)).toEqual(expected);
    expect(s.slots[s.size]).toBeNull();
  });
  it("copies into a separate allocation and preserves size through resize", () => {
    const run = arrayRun("resize");
    const copies = run.steps.filter((s) =>
      s.animations.some((a) => a.kind === "copy"),
    );
    expect(copies).toHaveLength(12);
    copies.forEach((s) => {
      const state = s.state as ArrayState;
      expect(state.oldSlots).toEqual([...ARRAY_VALUES, 101, 112]);
      expect(state.size).toBe(12);
    });
    const final = run.steps.at(-1)!.state as ArrayState;
    expect(final.slots.length).toBe(18);
    expect(final.slots.slice(0, 12)).toEqual([...ARRAY_VALUES, 101, 112]);
  });
  it("rejects invalid indices", () => {
    expect(() => arrayRun("get", 10)).toThrow(RangeError);
    expect(() => arrayRun("insert", -1)).toThrow(RangeError);
  });
});
function linkedValues(s: LinkedState) {
  const values: number[] = [];
  const seen = new Set<string>();
  let current = s.head;
  while (current) {
    expect(seen.has(current)).toBe(false);
    seen.add(current);
    const n = s.nodes.find((n) => n.id === current);
    expect(n).toBeDefined();
    values.push(n!.value);
    current = n!.next;
  }
  return values;
}
describe("LinkedList reference ordering", () => {
  it("links new.next first, rewires current.next second, then only changes layout", () => {
    const steps = linkedRun("insertAfter").steps;
    const alloc = steps.find((s) => s.title.includes("riêng biệt"))!
      .state as LinkedState;
    expect(alloc.nodes.find((n) => n.id === "n54")!.next).toBeNull();
    expect(linkedValues(alloc)).not.toContain(54);
    const first = steps.find((s) => s.title === "Gán reference đầu tiên")!
      .state as LinkedState;
    expect(first.nodes.find((n) => n.id === "n54")!.next).toBe("n60");
    expect(first.nodes.find((n) => n.id === "n48")!.next).toBe("n60");
    const rewire = steps.find((s) => s.title === "Cập nhật reference")!
      .state as LinkedState;
    expect(linkedValues(rewire)).toEqual([12, 24, 36, 48, 54, 60, 72, 84, 96]);
    const aligned = steps.find((s) => s.title === "Căn chỉnh để dễ đọc")!
      .state as LinkedState;
    expect(aligned.nodes.map((n) => [n.id, n.next]).sort()).toEqual(
      rewire.nodes.map((n) => [n.id, n.next]).sort(),
    );
  });
  it.each(["removeFirst", "removeAfter"] as const)(
    "rewires before removing %s",
    (op) => {
      const steps = linkedRun(op).steps;
      const rewired = steps.find((s) => s.title === "Nối lại danh sách trước")!
        .state as LinkedState;
      expect(rewired.nodes).toHaveLength(8);
      const final = steps.at(-1)!.state as LinkedState;
      expect(final.nodes).toHaveLength(7);
      expect(linkedValues(final)).toHaveLength(7);
      steps.forEach((s) => linkedValues(s.state as LinkedState));
    },
  );
  it.each(["addFirst", "addLast", "traversal"] as const)(
    "preserves links in %s",
    (op) => {
      linkedRun(op).steps.forEach((s) => linkedValues(s.state as LinkedState));
    },
  );
});
describe("Stack and Queue semantics", () => {
  it("pops last action before applying Undo to editor", () => {
    const run = stackRun("pop");
    const pop = run.steps.find((s) => s.title.startsWith("Pop:"))!.state;
    if (pop.kind !== "stack") throw Error();
    expect(pop.removed!.value).toBe(ACTIONS.at(-1));
    expect(pop.items.at(-1)!.value).toBe("Change color");
    expect(pop.editor).toHaveLength(9);
    const final = run.steps.at(-1)!.state;
    if (final.kind !== "stack") throw Error();
    expect(final.editor).toHaveLength(8);
    expect(final.items).toHaveLength(8);
  });
  it("pushes to the same LIFO end", () => {
    const final = stackRun("push").steps.at(-1)!.state;
    if (final.kind !== "stack") throw Error();
    expect(final.items.at(-1)!.value).toBe("Insert title");
    expect(final.editor).toEqual(ACTIONS);
  });
  it("polls oldest and accounts for every job at each worker stage", () => {
    queueRun("poll").steps.forEach((s) => {
      if (s.state.kind !== "queue") throw Error();
      const all = [
        ...s.state.items,
        ...s.state.completed,
        ...(s.state.processing ? [s.state.processing] : []),
      ];
      expect(all).toHaveLength(10);
      expect(new Set(all.map((n) => n.id)).size).toBe(10);
    });
    const final = queueRun("poll").steps.at(-1)!.state;
    if (final.kind !== "queue") throw Error();
    expect(final.completed.map((n) => n.value)).toEqual(["M01"]);
    expect(final.items[0].value).toBe("M02");
  });
  it("offers at rear and peeks without mutating", () => {
    const s = queueRun("offer").steps.at(-1)!.state;
    if (s.kind !== "queue") throw Error();
    expect(s.items.at(-1)!.value).toBe("M11");
    expect(queueRun("peek").steps[0].state).toEqual(
      queueRun("peek").steps.at(-1)!.state,
    );
  });
});
function verifyBST(state: TreeState) {
  const walk = (id: string | null, min: number, max: number): number[] => {
    if (!id) return [];
    const n = state.nodes.find((n) => n.id === id)!;
    expect(n.key).toBeGreaterThan(min);
    expect(n.key).toBeLessThan(max);
    return [...walk(n.left, min, n.key), n.key, ...walk(n.right, n.key, max)];
  };
  return walk(state.root, -Infinity, Infinity);
}
describe("Conceptual BST", () => {
  it("searches 50 → 70 → 60 → 65 and returns the matching lesson", () => {
    const last = treeRun("search").steps.at(-1)!.state as TreeState;
    expect(last.path).toEqual(["t50", "t70", "t60", "t65"]);
    expect(last.found).toBe("t65");
    expect(treeRun("search").expectedOutput).toBe("Java Generics");
  });
  it("handles an absent key", () => {
    expect(treeRun("search", 66).expectedOutput).toBe("Not found: 66");
  });
  it("inorder produces sorted unique keys and exposes recursive frames", () => {
    const run = treeRun("inorder");
    const final = run.steps.at(-1)!.state as TreeState;
    expect(final.output).toEqual(verifyBST(final));
    expect(final.output).toHaveLength(11);
    expect(run.steps.some((s) => s.callStack.length > 3)).toBe(true);
  });
  it.each(["insert", "delete", "levelorder"] as const)(
    "maintains BST invariants for %s",
    (op) => {
      const run = treeRun(op);
      run.steps.forEach((s) => verifyBST(s.state as TreeState));
      const final = run.steps.at(-1)!.state as TreeState;
      expect(final.nodes).toHaveLength(
        op === "insert" ? 12 : op === "delete" ? 10 : 11,
      );
      if (op === "levelorder")
        expect(final.output).toEqual([
          50, 30, 70, 20, 40, 60, 85, 10, 25, 65, 90,
        ]);
    },
  );
});
describe("Kahn’s Algorithm", () => {
  it("initial degrees include every incoming edge", () => {
    const s = graphRun().steps[0].state as GraphState;
    expect(s.degrees).toEqual({
      "1": 0,
      "2": 1,
      "3": 1,
      "4": 2,
      "5": 1,
      "6": 0,
      "7": 3,
    });
  });
  it("satisfies all dependency edges in its topological order", () => {
    const s = graphRun().steps.at(-1)!.state as GraphState;
    expect(new Set(s.order).size).toBe(7);
    for (const e of GRAPH_EDGES)
      expect(s.order.indexOf(e.from)).toBeLessThan(s.order.indexOf(e.to));
    expect(s.cycle).toBe(false);
  });
  it("each decrement exactly matches processed edges and every ready node has degree zero", () => {
    graphRun().steps.forEach((step) => {
      const s = step.state as GraphState;
      s.nodes.forEach((n) =>
        expect(s.degrees[n]).toBe(
          s.edges.filter((e) => e.to === n && !s.processedEdges.includes(e.id))
            .length,
        ),
      );
      s.ready.forEach((n) => {
        expect(s.degrees[n]).toBe(0);
        expect(s.order).not.toContain(n);
      });
      expect(new Set(s.ready).size).toBe(s.ready.length);
    });
  });
  it("reports a cycle when queue drains before all nodes finish", () => {
    const s = graphRun(true).steps.at(-1)!.state as GraphState;
    expect(s.cycle).toBe(true);
    expect(s.order).toEqual(["6"]);
    expect(s.ready).toEqual([]);
  });
});
describe("Shared replay contracts", () => {
  for (const lesson of LESSONS)
    for (const op of lesson.operations)
      it(`${lesson.id}/${op.id}: immutable snapshots, valid lines and stable IDs`, () => {
        const run = createRun(lesson.id, op.id);
        expect(run.steps.at(-1)!.console.join("\n").trim()).toBe(
          run.expectedOutput?.trim(),
        );
        expect(run.steps.length).toBeGreaterThan(2);
        const lineCount = run.code.text.split("\n").length;
        run.steps.forEach((s, i) => {
          expect(s.id).toBe(`step-${i}`);
          expect(Object.isFrozen(s.state)).toBe(true);
          s.activeLines.forEach((line) => {
            expect(line).toBeGreaterThan(0);
            expect(line).toBeLessThanOrEqual(lineCount);
          });
          expect(s.state.kind).toBe(lesson.id);
        });
        const serial = JSON.stringify(run.steps);
        expect(JSON.stringify(createRun(lesson.id, op.id).steps)).toBe(serial);
      });
});
