"use client";
import { AnimatePresence } from "motion/react";
import type { DebugStep, LinkedState, LinkNode } from "@/engine/types";
import { ArrowDefs, Edge, Node } from "./primitives";
const position = (n: LinkNode) => ({
  x: 20 + n.slot * 99,
  y: n.floating ? 205 : 92,
});
export function LinkedListVisualizer({
  state,
  step,
}: {
  state: LinkedState;
  step: DebugStep;
}) {
  const width = Math.max(890, state.nodes.length * 99 + 70);
  return (
    <div className="diagram-scroll">
      <svg
        role="img"
        aria-label="Danh sách node và reference next"
        viewBox={`0 0 ${width} 310`}
        style={{ minWidth: width }}
      >
        <ArrowDefs />
        <text x="20" y="28" className="svg-meta">
          HEAD → {state.head ?? "null"}
          <tspan dx="35">TAIL → {state.tail ?? "null"}</tspan>
        </text>
        <AnimatePresence initial={false}>
          {state.nodes.map((n) => {
            const p = position(n);
            const target = state.nodes.find((x) => x.id === n.next);
            const end = target ? position(target) : { x: p.x + 91, y: p.y };
            return (
              <Edge
                key={`ref-${n.id}`}
                id={`ref-${n.id}`}
                from={{ x: p.x + 73, y: p.y + 29 }}
                to={{ x: end.x, y: end.y + 29 }}
                curve
                active={step.animations.some(
                  (a) => a.kind === "reference" && a.ids.includes(n.id),
                )}
              />
            );
          })}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {state.nodes.map((n) => {
            const p = position(n);
            return (
              <Node
                key={n.id}
                id={n.id}
                x={p.x}
                y={p.y}
                value={n.value}
                label={n.id}
                width={73}
                height={58}
                active={step.focus.includes(n.id)}
              >
                <line x1="51" y1="2" x2="51" y2="56" stroke="var(--border)" />
                <circle cx="63" cy="29" r="3" fill="var(--purple)" />
                <text className="node-label" textAnchor="middle" x="36" y="77">
                  {n.next ?? "null"}
                </text>
                {state.head === n.id && (
                  <text
                    className="svg-small teal"
                    x="36"
                    y="-29"
                    textAnchor="middle"
                  >
                    HEAD
                  </text>
                )}
                {state.tail === n.id && (
                  <text
                    className="svg-small teal"
                    x="36"
                    y="101"
                    textAnchor="middle"
                  >
                    TAIL → null
                  </text>
                )}
              </Node>
            );
          })}
        </AnimatePresence>
        <text x="20" y="295" className="svg-small">
          data | next · ID stable · Position ≠ heap address
        </text>
      </svg>
    </div>
  );
}
