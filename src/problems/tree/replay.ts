import { freeze } from "@/engine/steps";
import type { Scope, WatchData, WatchValue } from "@/grid/types";
import {
  executeTree,
  frontierValues,
  newMachine,
  type Ref,
  type TreeMachine,
} from "./execute";
import { treeSource } from "./source";
import type {
  TreeCase,
  TreeMethod,
  TreeNodeView,
  TreeProblem,
  TreeRun,
  TreeStep,
} from "./types";
function liveArray(values: readonly number[], focus: number): WatchData {
  if (values.length <= 81) return [...values];
  const start = Math.max(0, Math.min(values.length - 12, focus - 4));
  return `length=${values.length}; [${values
    .slice(start, start + 12)
    .map((v, i) => `${start + i}:${v}`)
    .join(", ")}] … (cửa sổ)`;
}
function refValue(ref: Ref, s: TreeMachine, focus: number): WatchValue {
  if (ref === "edge") return { type: "int[]", value: [...s.edge] };
  if (ref === "children")
    return {
      type: "List<List<Integer>>",
      value:
        s.children.length <= 81
          ? s.children.map((row) => [...row])
          : `size=${s.children.length}; children[${focus}]=[${(s.children[focus] ?? []).slice(0, 20).join(", ")}]${(s.children[focus]?.length ?? 0) > 20 ? "…" : ""}`,
    };
  if (ref === "parents")
    return {
      type: "Set<Integer>",
      value:
        s.parents.size <= 80
          ? [...s.parents].sort((a, b) => a - b)
          : `size=${s.parents.size}; [${[...s.parents].slice(0, 16).join(", ")}]…`,
    };
  if (ref === "work" || ref === "path")
    return {
      type: "Deque<Integer>",
      value:
        s.work.length <= 81
          ? frontierValues(s)
          : `size=${s.work.length - (s.frontierKind === "queue" ? s.head : 0)}; FRONT/TOP [${frontierValues(s, 16).join(", ")}]…`,
    };
  if (ref === "edges")
    return {
      type: "int[][]",
      value:
        s.rawEdges.length <= 80
          ? s.rawEdges.map((row) => [...row])
          : `length=${s.rawEdges.length}; [${s.rawEdges
              .slice(0, 4)
              .map((row) => `[${row}]`)
              .join(", ")}]… (${s.loadedEdges} cạnh đã đọc)`,
    };
  const values =
    ref === "queries" ? s.inputQueries : ref === "answer" ? s.answer : s[ref];
  return {
    type: "int[]",
    value: liveArray(
      values,
      ref === "answer" || ref === "queries" ? s.queryIndex : focus,
    ),
  };
}
function scope(
  values: Record<string, number | string | boolean | null>,
): Scope {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      {
        type:
          typeof value === "number"
            ? "int"
            : typeof value === "boolean"
              ? "boolean"
              : "reference",
        value,
      },
    ]),
  );
}
export function generateTreeRun(
  test: TreeCase,
  problem: TreeProblem,
  method: TreeMethod,
  options: {
    caseIndex?: number;
    tests?: number;
    focusNode?: number;
    focusQuery?: number;
    detail?: boolean;
  } = {},
): TreeRun {
  const started = performance.now(),
    code = treeSource(problem, method),
    tc = options.caseIndex ?? 0,
    tests = options.tests ?? 1;
  const detailed =
      options.detail !== false && test.n <= 80 && test.queries.length <= 80,
    focusNode = Math.max(1, Math.min(test.n, options.focusNode ?? 1));
  const s = newMachine(test, tests, tc),
    steps: TreeStep[] = [];
  const actualParents = Array<number>(test.n + 1).fill(0),
    actualChildren = Array.from({ length: test.n + 1 }, () => [] as number[]);
  for (const [u, v] of test.edges) {
    actualParents[v] = u;
    actualChildren[u].push(v);
  }
  const near = new Set([1, focusNode]);
  let ancestor = focusNode;
  for (let i = 0; i < 8 && ancestor; i++) {
    near.add(ancestor);
    ancestor = actualParents[ancestor];
  }
  let tick = 0,
    lastKept = 0;
  function shownIds(): number[] {
    if (test.n <= 63) return Array.from({ length: test.n }, (_, i) => i + 1);
    const ids = new Set<number>();
    const add = (id: number | null) => {
      if (id && ids.size < 48) ids.add(id);
    };
    [s.current, s.neighbor, s.queryNode, focusNode, 1].forEach(add);
    for (const root of [s.current, s.neighbor, s.queryNode, focusNode])
      if (root) {
        let at = root;
        for (let i = 0; i < 8 && at; i++) {
          add(at);
          at = actualParents[at];
        }
        actualChildren[root].slice(0, 10).forEach(add);
      }
    return [...ids].sort((a, b) => a - b);
  }
  const solution = executeTree(
    test,
    problem,
    method,
    s,
    (marker, title, explanation, category = "node", force = false) => {
      tick++;
      const isFocus =
        category === "edge"
          ? s.neighbor === focusNode
          : category === "input"
            ? s.main.i !== undefined &&
              test.edges[Number(s.main.i)]?.[1] === focusNode
            : category === "query"
              ? s.queryIndex === (options.focusQuery ?? 0)
              : category === "node" &&
                (near.has(s.current ?? -1) ||
                  s.neighbor === focusNode ||
                  near.has(Number(s.helper.id ?? -1)));
      if (!detailed && !force && !isFocus && tick % 300 !== 0) return;
      const line = code.markers[marker];
      if (!line)
        throw new Error(`Unknown tree Java marker ${method}/${marker}`);
      const focus = s.current ?? focusNode,
        main: Record<string, WatchValue> = {
          args: { type: "String[]", value: [] },
          stream: { type: "InputStream", value: "input (System.in)" },
          ...scope(s.main),
        };
      for (const ref of s.mainRefs) main[ref] = refValue(ref, s, focus);
      const scopes: Record<string, Scope> = {
        static: {
          reader: { type: "BufferedReader", value: "BufferedReader(input)" },
          tokenizer: {
            type: "StringTokenizer",
            value: "helper nextInt (thu gọn)",
          },
        },
        main,
      };
      if (s.frame !== "main") {
        const local: Record<string, WatchValue> = {
          ...scope(s.local),
          edges: refValue("edges", s, focus),
        };
        if (problem === "depth") local.queries = refValue("queries", s, focus);
        for (const ref of s.solveRefs) local[ref] = refValue(ref, s, focus);
        scopes.solve = local;
      }
      if (s.frame === "buildChildren") {
        const helper: Record<string, WatchValue> = {
          ...scope(s.helper),
          edges: refValue("edges", s, focus),
        };
        for (const ref of s.helperRefs) helper[ref] = refValue(ref, s, focus);
        scopes.buildChildren = helper;
      }
      const ids = shownIds(),
        nodes: TreeNodeView[] = ids.map((id) => ({
          id,
          parent: s.parent[id] ?? -1,
          children: (s.children[id] ?? []).slice(0, 12),
          childCount: s.children[id]?.length ?? -1,
          degree: s.degree[id] ?? -1,
          depth: s.depth[id] ?? -1,
          mark: s.marks[id],
        }));
      const answerStart =
        test.queries.length <= 80
          ? 0
          : Math.max(
              0,
              Math.min(
                test.queries.length - 14,
                (s.queryIndex >= 0 ? s.queryIndex : (options.focusQuery ?? 0)) -
                  4,
              ),
            );
      const answers = Array.from(
        { length: Math.min(test.queries.length - answerStart, 80) },
        (_, j) =>
          s.answerReady[j + answerStart] ? s.answer[j + answerStart] : null,
      );
      const edgeStart = Math.max(
        0,
        Math.min(
          test.edges.length - 12,
          Number(s.main.i ?? s.representedEdges) - 4,
        ),
      );
      const stack =
        s.frame === "main"
          ? ["main(String[] args)"]
          : s.frame === "buildChildren"
            ? ["buildChildren(n, edges)", "solve(...)", "main(String[] args)"]
            : ["solve(...)", "main(String[] args)"];
      steps.push(
        freeze({
          id: `tree-${tc}-${steps.length}`,
          marker,
          activeLines: [line],
          title,
          explanation,
          scopes,
          callStack: stack,
          tick,
          omittedBefore: tick - lastKept - 1,
          scene: {
            edgeWindowStart: edgeStart,
            edgeRows: s.rawEdges
              .slice(edgeStart, edgeStart + 12)
              .map((row) => [...row]),
            parentsPreview: [...s.parents].slice(0, 80).sort((a, b) => a - b),
            parentSetSize: s.parents.size,
            phase: s.phase,
            current: s.current,
            neighbor: s.neighbor,
            activeEdge: s.activeEdge ? ([...s.activeEdge] as const) : null,
            loadedEdges: s.loadedEdges,
            representedEdges: s.representedEdges,
            inputPart: s.inputPart,
            queryIndex: s.queryIndex,
            queryNode: s.queryNode,
            nodes,
            frontier: frontierValues(s, 32),
            frontierSize:
              s.work.length - (s.frontierKind === "queue" ? s.head : 0),
            frontierKind: s.frontierKind,
            leafCount: s.leafCount,
            answers,
            answersStart: answerStart,
            answersTotal: test.queries.length,
            output: s.output,
            work: { ...s.metrics },
            loadedQueries: s.loadedQueries,
          },
        }),
      );
      lastKept = tick;
    },
    { detailed, focusQuery: options.focusQuery ?? 0 },
  );
  return freeze({
    problem,
    method,
    test,
    tests,
    caseIndex: tc,
    code,
    steps,
    detailed,
    focusNode,
    solution,
    generateMs: performance.now() - started,
    operations: tick,
  });
}
