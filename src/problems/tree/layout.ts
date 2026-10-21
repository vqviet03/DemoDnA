import type { TreeCase } from "./types";
export interface TreeTopology {
  readonly parents: readonly number[];
  readonly children: readonly (readonly number[])[];
  readonly levels: readonly number[];
  readonly incident: readonly number[];
}
export function treeTopology(test: TreeCase): TreeTopology {
  const parents = Array<number>(test.n + 1).fill(0),
    children = Array.from({ length: test.n + 1 }, () => [] as number[]),
    incident = Array<number>(test.n + 1).fill(Infinity),
    levels = Array<number>(test.n + 1).fill(0);
  test.edges.forEach(([u, v], i) => {
    parents[v] = u;
    children[u].push(v);
    incident[u] = Math.min(incident[u], i);
    incident[v] = Math.min(incident[v], i);
  });
  const queue = [1];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of children[u]) {
      levels[v] = levels[u] + 1;
      queue.push(v);
    }
  }
  return { parents, children, levels, incident };
}
export function layoutTree(topology: TreeTopology, ids: readonly number[]) {
  const visible = new Set(ids),
    children = new Map(
      ids.map((id) => [
        id,
        topology.children[id].filter((v) => visible.has(v)),
      ]),
    );
  const roots = ids.filter((id) => !visible.has(topology.parents[id]));
  const widths = new Map<number, number>();
  for (const id of [...ids].sort(
    (a, b) => topology.levels[b] - topology.levels[a],
  ))
    widths.set(
      id,
      Math.max(
        1,
        (children.get(id) ?? []).reduce(
          (sum, v) => sum + (widths.get(v) ?? 1),
          0,
        ),
      ),
    );
  const levels = [...new Set(ids.map((id) => topology.levels[id]))].sort(
      (a, b) => a - b,
    ),
    levelIndex = new Map(levels.map((d, i) => [d, i]));
  const points = new Map<number, { x: number; y: number }>();
  let left = 0;
  const pending: { id: number; left: number }[] = [];
  for (const root of roots) {
    pending.push({ id: root, left });
    left += widths.get(root) ?? 1;
  }
  while (pending.length) {
    const p = pending.pop()!,
      weight = widths.get(p.id) ?? 1;
    points.set(p.id, {
      x: 40 + (p.left + weight / 2) * 76,
      y: 42 + (levelIndex.get(topology.levels[p.id]) ?? 0) * 80,
    });
    let offset = p.left;
    for (const child of children.get(p.id) ?? []) {
      pending.push({ id: child, left: offset });
      offset += widths.get(child) ?? 1;
    }
  }
  return {
    points,
    width: Math.max(260, 80 + left * 76),
    height: Math.max(180, 84 + (levels.length - 1) * 80),
    levels,
  };
}
