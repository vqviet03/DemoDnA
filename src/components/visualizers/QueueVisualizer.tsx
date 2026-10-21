"use client";
import { AnimatePresence, motion } from "motion/react";
import type { DebugStep, QueueState } from "@/engine/types";
import { ArrowDefs, Edge, Node } from "./primitives";
export function QueueVisualizer({
  state,
  step,
}: {
  state: QueueState;
  step: DebugStep;
}) {
  const entries = [
    ...state.items,
    ...(state.processing ? [state.processing] : []),
    ...state.completed,
  ];
  return (
    <div className="diagram-scroll">
      <svg
        role="img"
        aria-label="Hàng đợi email FIFO và worker"
        viewBox={`0 0 ${Math.max(830, state.items.length * 71 + 45, 600 + state.completed.length * 70)} 340`}
        style={{ minWidth: 790 }}
      >
        <ArrowDefs />
        <text x="22" y="32" className="svg-small teal">
          FRONT → {state.items[0]?.value ?? "null"}
        </text>
        <text
          x={Math.max(778, state.items.length * 71 + 10)}
          y="32"
          textAnchor="end"
          className="svg-small teal"
        >
          {state.items.at(-1)?.value ?? "null"} ← REAR
        </text>
        <rect
          x="12"
          y="53"
          width={Math.max(804, state.items.length * 71 + 25)}
          height="89"
          rx="12"
          className="queue-lane"
        />
        <path
          d="M 48 149 V 216 H 322"
          fill="none"
          stroke="var(--border)"
          strokeDasharray="4 5"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <rect
          x="323"
          y="177"
          width="165"
          height="110"
          rx="12"
          className={`worker-box ${state.worker === "processing" ? "processing" : ""}`}
        />
        <text x="407" y="201" className="svg-small" textAnchor="middle">
          EMAIL WORKER
        </text>
        <text x="408" y="276" className="svg-small teal" textAnchor="middle">
          {state.worker.toUpperCase()}
        </text>
        <text x="589" y="193" className="svg-small">
          COMPLETED JOBS
        </text>
        <Edge
          id="worker-completed"
          from={{ x: 496, y: 231 }}
          to={{ x: 573, y: 231 }}
          done={state.completed.length > 0}
        />
        <AnimatePresence initial={false}>
          {entries.map((item) => {
            const completed = state.completed.some((x) => x.id === item.id);
            const processing = state.processing?.id === item.id;
            return (
              <Node
                key={item.id}
                id={item.id}
                x={
                  completed
                    ? 600 +
                      state.completed.findIndex((n) => n.id === item.id) * 70
                    : processing
                      ? 379
                      : 22 + item.slot * 71
                }
                y={completed || processing ? 211 : 68}
                value={item.value}
                width={61}
                height={56}
                active={step.focus.includes(item.id)}
                moving={step.animations.some(
                  (a) =>
                    (a.kind === "move" || a.kind === "insert") &&
                    a.ids.includes(item.id),
                )}
                done={completed}
              />
            );
          })}
        </AnimatePresence>
        <text x="24" y="324" className="svg-meta">
          {state.items.length} pending
          <tspan dx="35">{state.processing ? 1 : 0} processing</tspan>
          <tspan dx="35">{state.completed.length} completed</tspan>
        </text>
      </svg>
    </div>
  );
}
