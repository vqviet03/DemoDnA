"use client";
import { AnimatePresence, motion } from "motion/react";
import type { DebugStep, GraphState } from "@/engine/types";
import { ArrowDefs, Edge, Node, type Point } from "./primitives";
const positions: Record<string, Point> = {
  HTML: { x: 25, y: 40 },
  CSS: { x: 220, y: 10 },
  JavaScript: { x: 220, y: 100 },
  React: { x: 440, y: 20 },
  API: { x: 440, y: 122 },
  Git: { x: 220, y: 216 },
  "Final Project": { x: 660, y: 104 },
};
export function GraphVisualizer({
  state,
  step,
}: {
  state: GraphState;
  step: DebugStep;
}) {
  return (
    <>
      <div className="diagram-scroll">
        <svg
          role="img"
          aria-label="Đồ thị tiên quyết các môn học"
          viewBox="0 0 825 308"
          style={{ minWidth: 790 }}
        >
          <ArrowDefs />
          {state.edges.map((e) => {
            const a = positions[e.from],
              b = positions[e.to];
            const reverse = b.x < a.x;
            return (
              <Edge
                key={e.id}
                id={e.id}
                from={{ x: a.x + (reverse ? 0 : 116), y: a.y + 26 }}
                to={{ x: b.x + (reverse ? 116 : 0), y: b.y + 26 }}
                curve
                active={step.focus.includes(e.id)}
                done={state.processedEdges.includes(e.id)}
              />
            );
          })}
          {state.nodes.map((id) => {
            const p = positions[id];
            return (
              <Node
                key={id}
                id={id}
                x={p.x}
                y={p.y}
                value={id}
                width={116}
                height={51}
                active={step.focus.includes(id) && !state.order.includes(id)}
                done={state.order.includes(id)}
                dim={state.degrees[id] > 0 && !step.focus.includes(id)}
              >
                <text
                  x="58"
                  y="71"
                  textAnchor="middle"
                  className={`svg-small ${state.degrees[id] === 0 ? "teal" : ""}`}
                >
                  in-degree: {state.degrees[id]}
                </text>
                {state.degrees[id] > 0 && !state.order.includes(id) && (
                  <text x="105" y="13" textAnchor="end" className="node-label">
                    •
                  </text>
                )}
              </Node>
            );
          })}
        </svg>
      </div>
      <div className="graph-queues">
        <div>
          <span className="micro-label">READY QUEUE</span>
          <div className="chip-lane">
            <AnimatePresence initial={false}>
              {state.ready.map((id) => (
                <motion.span
                  key={id}
                  layout
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="queue-chip"
                >
                  {id}
                </motion.span>
              ))}
            </AnimatePresence>
            {!state.ready.length && <small>∅ empty</small>}
          </div>
        </div>
        <div>
          <span className="micro-label">COMPLETED ORDER</span>
          <div className="chip-lane">
            {state.order.map((id, i) => (
              <motion.span
                key={id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="done-chip"
              >
                <small>{i + 1}</small>
                {id}
              </motion.span>
            ))}
            {!state.order.length && <small>Chưa có môn hoàn thành</small>}
          </div>
        </div>
      </div>
      {state.cycle && (
        <div className="cycle-warning" role="alert">
          Có chu trình: không thể mở khóa các môn còn lại.
        </div>
      )}
      <details className="adjacency">
        <summary>
          Adjacency List <span>Map&lt;String, List&lt;String&gt;&gt;</span>
        </summary>
        <div>
          {state.nodes.map((n) => (
            <div key={n}>
              <strong>{n}</strong>
              <span>
                → [
                {state.edges
                  .filter((e) => e.from === n)
                  .map((e) => e.to)
                  .join(", ")}
                ]
              </span>
              <b>{state.degrees[n]}</b>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
