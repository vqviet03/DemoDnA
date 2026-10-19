"use client";
import { AnimatePresence, motion } from "motion/react";
import type { ArrayState, DebugStep } from "@/engine/types";
import { ArrowDefs, Node } from "./primitives";
export function ArrayVisualizer({
  state,
  step,
}: {
  state: ArrayState;
  step: DebugStep;
}) {
  const width = Math.max(810, state.slots.length * 64 + 30);
  const y = state.copying ? 175 : 125;
  const movement = step.animations.find((a) => a.kind === "copy");
  return (
    <div className="diagram-scroll">
      <svg
        role="img"
        aria-label="Trạng thái bộ nhớ mảng động"
        viewBox={`0 0 ${width} ${state.copying ? 310 : 280}`}
        style={{ minWidth: width }}
      >
        <ArrowDefs />
        <text x="17" y="28" className="svg-meta">
          size = {state.size}
          <tspan dx="30">capacity = {state.slots.length}</tspan>
          <tspan dx="30">index = {state.target}</tspan>
        </text>
        {state.copying && (
          <>
            <text x="17" y="55" className="svg-small">
              OLD MEMORY · elements / old
            </text>
            {state.oldSlots?.map((v, i) => (
              <g key={`old-${i}`}>
                <rect
                  className="svg-node old"
                  x={17 + i * 64}
                  y="70"
                  width="55"
                  height="45"
                  rx="8"
                />
                <text
                  className="node-value"
                  x={44 + i * 64}
                  y="98"
                  textAnchor="middle"
                >
                  {v ?? "—"}
                </text>
              </g>
            ))}
            <text x="17" y="145" className="svg-small">
              NEW MEMORY · expanded
            </text>
          </>
        )}
        {state.slots.map((value, i) => (
          <g key={`slot-${i}`}>
            <text
              x={44 + i * 64}
              y={y - 16}
              textAnchor="middle"
              className={`node-label ${i === state.target ? "teal" : ""}`}
            >
              {String(i).padStart(2, "0")}
            </text>
            <rect
              x={17 + i * 64}
              y={y}
              width="55"
              height="60"
              rx="10"
              className={`array-slot ${i === state.target ? "target" : ""}`}
            />
            {!state.items.some((n) => n.slot === i) && (
              <text
                x={44 + i * 64}
                y={y + 35}
                textAnchor="middle"
                className={value === null ? "empty-value" : "ghost-value"}
              >
                {value ?? "—"}
              </text>
            )}
          </g>
        ))}
        <AnimatePresence initial={false}>
          {state.items.map((item) => (
            <Node
              key={item.id}
              id={item.id}
              x={17 + item.slot * 64}
              y={y}
              value={item.value}
              width={55}
              height={60}
              active={step.focus.includes(item.id)}
              moving={step.animations.some(
                (a) =>
                  (a.kind === "copy" || a.kind === "insert") &&
                  a.ids.includes(item.id),
              )}
              done={step.title.includes("Hoàn tất")}
            />
          ))}
        </AnimatePresence>
        {movement &&
          movement.from !== undefined &&
          movement.to !== undefined &&
          !state.copying && (
            <g className="moving-annotation">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                d={`M ${44 + movement.from * 64} ${y - 40} Q ${44 + (movement.to + movement.from) * 32} ${y - 100} ${44 + movement.to * 64} ${y - 40}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
                markerEnd="url(#arrow)"
              />
              <text
                className="svg-small teal"
                textAnchor="middle"
                x={44 + (movement.to + movement.from) * 32}
                y={y - 76}
              >
                COPY {state.items.find((n) => n.id === movement.ids[0])?.value}
              </text>
            </g>
          )}
        {!state.copying && (
          <>
            <path
              d={`M ${44 + state.target * 64} ${y + 72} v 13`}
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            <text
              x={44 + state.target * 64}
              y={y + 104}
              textAnchor="middle"
              className="svg-small teal"
            >
              {step.title.includes("Dịch") ? "INSERT AT" : "TARGET"} [
              {state.target}]
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
