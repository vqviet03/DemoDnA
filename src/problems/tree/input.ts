import { freeze } from "@/engine/steps";
import type { TreeCase, TreeProblem } from "./types";
export const TREE_SAMPLES = {
  leaves: {
    input: "3\n5\n1 2\n1 3\n2 4\n2 5\n3\n1 2\n2 3\n1",
    expected: "#1: 3\n#2: 1\n#3: 1",
  },
  depth: {
    input: "2\n5 3\n1 2\n1 3\n2 4\n2 5\n1\n4\n3\n4 2\n1 2\n2 3\n3 4\n4\n2",
    expected: "#1: 0 2 1\n#2: 3 1",
  },
} as const;
export function parseTreeInput(
  text: string,
  problem: TreeProblem,
): readonly TreeCase[] {
  const tokens = text.trim().split(/\s+/);
  let at = 0;
  const read = () => {
    const t = tokens[at++];
    if (t === undefined || !/^\d+$/.test(t) || !Number.isSafeInteger(Number(t)))
      throw new Error(
        `Token ${at}: cần số nguyên không âm${t === undefined ? " (input bị thiếu)" : ""}.`,
      );
    return Number(t);
  };
  const count = read();
  if (count < 1 || count > 10) throw new Error("Theo đề: 1 ≤ T ≤ 10.");
  const tests: TreeCase[] = [];
  for (let tc = 0; tc < count; tc++) {
    const n = read(),
      q = problem === "depth" ? read() : 0;
    if (n < 1 || n > 10000) throw new Error(`Test #${tc + 1}: 1 ≤ N ≤ 10000.`);
    if (problem === "depth" && (q < 1 || q > 10000))
      throw new Error(`Test #${tc + 1}: 1 ≤ Q ≤ 10000.`);
    const parent = Array<number>(n + 1).fill(0),
      dsu = Array.from({ length: n + 1 }, (_, i) => i);
    const find = (x: number): number => {
      let y = x;
      while (dsu[y] !== y) {
        dsu[y] = dsu[dsu[y]];
        y = dsu[y];
      }
      return y;
    };
    const edges: (readonly [number, number])[] = [];
    for (let i = 0; i < n - 1; i++) {
      const u = read(),
        v = read();
      if (u < 1 || u > n || v < 1 || v > n || u === v)
        throw new Error(
          `Test #${tc + 1}, cạnh ${i + 1}: cần 1 ≤ u,v ≤ N và u khác v.`,
        );
      if (v === 1) throw new Error(`Test #${tc + 1}: root 1 không có cha.`);
      if (parent[v] !== 0)
        throw new Error(
          `Test #${tc + 1}: nút ${v} có nhiều cha hoặc cạnh bị lặp.`,
        );
      const a = find(u),
        b = find(v);
      if (a === b)
        throw new Error(`Test #${tc + 1}: có chu trình; input phải là cây.`);
      dsu[b] = a;
      parent[v] = u;
      edges.push([u, v]);
    }
    for (let v = 2; v <= n; v++)
      if (parent[v] === 0 || find(v) !== find(1))
        throw new Error(`Test #${tc + 1}: cây chưa liên thông tới root 1.`);
    const queries = Array.from({ length: q }, () => {
      const x = read();
      if (x < 1 || x > n)
        throw new Error(`Test #${tc + 1}: query x phải từ 1 đến N.`);
      return x;
    });
    tests.push(freeze({ n, edges, queries }));
  }
  if (at !== tokens.length)
    throw new Error(
      `Input còn ${tokens.length - at} token thừa. Bài 9 không có Q; Bài 10 có N Q rồi N−1 cạnh và Q truy vấn.`,
    );
  return freeze(tests);
}
export function treeExpected(
  text: string,
  tests: readonly TreeCase[],
  problem: TreeProblem,
): readonly string[] {
  if (!text.trim()) return [];
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/\s+/g, " "));
  if (lines.length !== tests.length)
    throw new Error(`Expected cần ${tests.length} dòng, dạng #1: ...`);
  return lines.map((line, i) => {
    const match = line.match(new RegExp(`^#${i + 1}: ([-\\d ]+)$`));
    const values = match?.[1].split(" ");
    if (
      !values ||
      values.some((v) => !/^-?\d+$/.test(v)) ||
      values.length !== (problem === "leaves" ? 1 : tests[i].queries.length)
    )
      throw new Error(
        `Expected test #${i + 1}: cần #${i + 1}: rồi ${problem === "leaves" ? 1 : tests[i].queries.length} số nguyên.`,
      );
    return line;
  });
}
export const treeOutput = (tc: number, values: readonly number[]) =>
  `#${tc + 1}: ${values.join(" ")}`;
/** Independent oracle: explicit child counts and breadth-first distance, never edge order. */
export function treeReference(
  test: TreeCase,
  problem: TreeProblem,
): readonly number[] {
  const children = Array.from({ length: test.n + 1 }, () => [] as number[]);
  test.edges.forEach(([u, v]) => children[u].push(v));
  if (problem === "leaves")
    return [children.slice(1).filter((list) => list.length === 0).length];
  const distance = Array<number>(test.n + 1).fill(-1),
    queue = [1];
  distance[1] = 0;
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of children[u]) {
      distance[v] = distance[u] + 1;
      queue.push(v);
    }
  }
  return test.queries.map((x) => distance[x]);
}
export function serializeTreeCases(
  tests: readonly TreeCase[],
  problem: TreeProblem,
): string {
  return [
    tests.length,
    ...tests.flatMap((t) => [
      problem === "depth" ? `${t.n} ${t.queries.length}` : String(t.n),
      ...t.edges.map((e) => e.join(" ")),
      ...t.queries.map(String),
    ]),
  ].join("\n");
}
