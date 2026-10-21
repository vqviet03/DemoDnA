"use client";
import { AnimatePresence, motion } from "motion/react";
import type { DebugStep, GraphState } from "@/engine/types";
import { adjacencyMatrix, graphKeyType } from "@/algorithms/graph";
import { ArrowDefs, Edge, Node, type Point } from "./primitives";
const defaultPositions: Record<string, Point> = {
  "1": { x: 8, y: 28 },
  "2": { x: 116, y: 10 },
  "3": { x: 116, y: 88 },
  "4": { x: 224, y: 10 },
  "5": { x: 224, y: 88 },
  "6": { x: 116, y: 166 },
  "7": { x: 332, y: 88 },
};
const short = (s: string) => (s.length > 9 ? s.slice(0, 8) + "…" : s);
export function GraphVisualizer({
  state,
  step,
  view = "list",
  showStorage = false,
}: {
  state: GraphState;
  step: DebugStep;
  view?: "list" | "matrix";
  showStorage?: boolean;
}) {
  const usesDefaultLayout = state.nodes.every((id) =>
    Object.hasOwn(defaultPositions, id),
  );
  const positions = new Map(
    state.nodes.map((n, i) => [
      n,
      (usesDefaultLayout ? defaultPositions[n] : undefined) ?? {
        x: 8 + (i % 4) * 108,
        y: 12 + Math.floor(i / 4) * 78,
      },
    ]),
  );
  const matrix = adjacencyMatrix(state);
  const active = state.activeCell;
  const visited = state.visited ?? state.order;
  const loaded = state.loaded ?? state.nodes;
  return (
    <>
      <div className="graph-scene" data-storage={showStorage}>
        <div className="diagram-scroll">
          <svg
            role="img"
            aria-label="Đồ thị có hướng DFS BFS"
            viewBox={
              state.edges.some((e) => e.from === e.to)
                ? "0 -45 440 283"
                : "0 0 440 238"
            }
          >
            <ArrowDefs />
            <AnimatePresence initial={false}>
              {state.edges.map((e) => {
                const a = positions.get(e.from)!,
                  b = positions.get(e.to)!,
                  reverse = b.x < a.x;
                return (
                  <Edge
                    key={e.id}
                    id={e.id}
                    from={{
                      x: a.x + (e.from === e.to ? 22 : reverse ? 0 : 92),
                      y: a.y + (e.from === e.to ? 0 : 20),
                    }}
                    to={{
                      x: b.x + (e.from === e.to ? 70 : reverse ? 92 : 0),
                      y: b.y + (e.from === e.to ? 0 : 20),
                    }}
                    curve
                    loop={e.from === e.to}
                    active={step.focus.includes(e.id)}
                    done={state.processedEdges.includes(e.id)}
                  />
                );
              })}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {state.nodes.map((id) => {
                const p = positions.get(id)!;
                return (
                  <Node
                    key={id}
                    id={id}
                    x={p.x}
                    y={p.y}
                    value={short(id)}
                    width={92}
                    height={40}
                    active={step.focus.includes(id)}
                    done={visited.includes(id)}
                    dim={!loaded.includes(id)}
                  >
                    <title>{id}</title>
                    <text
                      x="46"
                      y="58"
                      textAnchor="middle"
                      className="svg-small"
                    >
                      {state.parents && Object.hasOwn(state.parents, id)
                        ? `parent: ${state.parents[id] ? short(state.parents[id]!) : "∅"}`
                        : !loaded.includes(id)
                          ? "chưa lưu"
                          : `in: ${state.degrees[id]}`}
                    </text>
                  </Node>
                );
              })}
            </AnimatePresence>
            {state.current && positions.has(state.current) && (
              <motion.g
                animate={{
                  x: positions.get(state.current)!.x,
                  y: positions.get(state.current)!.y - 12,
                }}
              >
                <text
                  x="46"
                  y="0"
                  textAnchor="middle"
                  className="svg-small teal"
                >
                  {state.returning ? "↶ BACKTRACK" : "CURRENT ↓"}
                </text>
              </motion.g>
            )}
          </svg>
        </div>
        <div className="graph-storage" data-testid="graph-storage">
          <div className="storage-caption">
            <b>{view === "list" ? "DANH SÁCH KỀ" : "MA TRẬN KỀ"}</b>
            <small>
              {view === "list"
                ? `Map<${graphKeyType(state.nodes)}, List<${graphKeyType(state.nodes)}>>`
                : "int[V][V] · hàng → cột"}
            </small>
          </div>
          {view === "list" ? (
            <div className="adjacency-rows">
              {state.nodes.map((n) => (
                <div key={n} className={active?.[0] === n ? "active" : ""}>
                  <strong title={n}>{short(n)}</strong>
                  <span>
                    → [
                    {state.edges
                      .filter((e) => e.from === n)
                      .map((e, i) => (
                        <span
                          key={e.id}
                          className={
                            active?.[0] === n && active[1] === e.to
                              ? "cell-active"
                              : ""
                          }
                        >
                          {i > 0 ? ", " : ""}
                          {short(e.to)}
                        </span>
                      ))}
                    ]
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <table className="matrix">
              <thead>
                <tr>
                  <th>→</th>
                  {state.nodes.map((n, i) => (
                    <th key={n} title={`${i}: ${n}`}>
                      {short(n)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={state.nodes[i]}>
                    <th title={`${i}: ${state.nodes[i]}`}>
                      {short(state.nodes[i])}
                    </th>
                    {row.map((value, j) => (
                      <td
                        key={state.nodes[j]}
                        className={`${value ? "has-edge" : ""} ${active?.[0] === state.nodes[i] && active[1] === state.nodes[j] ? "cell-active" : ""}`}
                        title={`${state.nodes[i]} → ${state.nodes[j]}`}
                      >
                        <motion.span
                          key={value}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: 1 }}
                        >
                          {value}
                        </motion.span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {view === "matrix" && (
            <div className="matrix-key sr-only">
              {state.nodes.map((n, i) => (
                <span key={n}>
                  {i}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="graph-lanes">
        <div>
          <b>
            {state.algorithm === "dfs" ? "CALL STACK" : "QUEUE · FRONT → REAR"}
          </b>
          <div className="chip-lane">
            <AnimatePresence initial={false}>
              {(state.algorithm === "dfs"
                ? (state.stack ?? [])
                : state.ready
              ).map((id) => (
                <motion.span
                  layout
                  key={id}
                  className="queue-chip"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                >
                  {short(id)}
                </motion.span>
              ))}
            </AnimatePresence>
            {!(state.algorithm === "dfs"
              ? state.stack?.length
              : state.ready.length) && <small>∅</small>}
          </div>
        </div>
        <div>
          <b>
            {state.algorithm === "load"
              ? `ĐÃ LƯU ${state.edges.length}/${state.inputEdges?.length ?? state.edges.length} CẠNH`
              : state.path?.length
                ? state.algorithm === "dfs"
                  ? "ĐƯỜNG ĐANG ĐI"
                  : "PATH · LẦN NGƯỢC PARENT"
                : "THỨ TỰ KHÁM PHÁ"}
          </b>
          <div className="chip-lane">
            {(state.path?.length ? state.path : state.order).map((n, i) => (
              <motion.span layout key={n} className="done-chip">
                <small>{i + 1}</small>
                {short(n)}
              </motion.span>
            ))}
            {state.algorithm === "load" && (
              <small>Cạnh có hướng · không tự thêm cạnh ngược</small>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
