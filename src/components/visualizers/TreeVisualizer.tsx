"use client";
import { AnimatePresence } from "motion/react";
import type { DebugStep, TreeState } from "@/engine/types";
import { ArrowDefs, Edge, Node, type Point } from "./primitives";
export function treePositions(state: TreeState): Map<string, Point> {
  const map = new Map<string, Point>();
  const walk = (id: string | null, x: number, y: number, offset: number) => {
    if (!id) return;
    const n = state.nodes.find((n) => n.id === id);
    if (!n) return;
    map.set(id, { x, y });
    walk(n.left, x - offset, y + 78, offset / 2);
    walk(n.right, x + offset, y + 78, offset / 2);
  };
  walk(state.root, 390, 20, 195);
  for (const n of state.nodes)
    if (!map.has(n.id)) map.set(n.id, { x: 710, y: 300 });
  return map;
}
export function TreeVisualizer({
  state,
  step,
}: {
  state: TreeState;
  step: DebugStep;
}) {
  const positions = treePositions(state);
  const current = step.focus.find((id) => positions.has(id));
  const pruned = new Set<string>();
  const prune = (id: string | null) => {
    if (!id) return;
    pruned.add(id);
    const n = state.nodes.find((n) => n.id === id);
    if (n) {
      prune(n.left);
      prune(n.right);
    }
  };
  if (state.output.length === 0)
    for (const id of state.path) {
      const n = state.nodes.find((n) => n.id === id);
      if (n) {
        if (state.target < n.key) prune(n.right);
        else if (state.target > n.key) prune(n.left);
      }
    }
  return (
    <>
      <div className="diagram-scroll">
        <svg
          role="img"
          aria-label="Cây BST tài liệu học tập"
          viewBox="0 0 820 365"
          style={{ minWidth: 760 }}
        >
          <ArrowDefs />
          <AnimatePresence initial={false}>
            {state.nodes.flatMap((n) =>
              [n.left, n.right]
                .filter((x): x is string => !!x)
                .map((id) => {
                  const from = positions.get(n.id)!;
                  const to = positions.get(id)!;
                  const visited =
                    state.path.includes(n.id) && state.path.includes(id);
                  return (
                    <Edge
                      key={`${n.id}-${id}`}
                      id={`${n.id}-${id}`}
                      from={{ x: from.x + 25, y: from.y + 49 }}
                      to={{ x: to.x + 25, y: to.y - 4 }}
                      active={
                        visited ||
                        step.animations.some((a) =>
                          a.ids.includes(`${n.id}-${id}`),
                        )
                      }
                      dim={pruned.has(id)}
                    />
                  );
                }),
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {state.nodes.map((n) => {
              const p = positions.get(n.id)!;
              return (
                <Node
                  key={n.id}
                  id={n.id}
                  x={p.x}
                  y={p.y}
                  value={n.key}
                  width={50}
                  height={50}
                  round
                  active={step.focus.includes(n.id) && state.found !== n.id}
                  done={state.path.includes(n.id) || state.found === n.id}
                  dim={pruned.has(n.id)}
                >
                  {state.found === n.id && (
                    <text
                      x="25"
                      y="70"
                      className="svg-small teal"
                      textAnchor="middle"
                    >
                      FOUND
                    </text>
                  )}
                </Node>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>
      {state.found && (
        <div className="result-card">
          <span>
            LESSON #{state.nodes.find((n) => n.id === state.found)?.key}
          </span>
          <strong>
            {state.nodes.find((n) => n.id === state.found)?.lesson}
          </strong>
          <small>Tài liệu đã được tìm thấy trong kho học tập</small>
        </div>
      )}
      {!!state.output.length && (
        <div className="output-strip">
          <span>RESULT</span>
          {state.output.join(" → ")}
        </div>
      )}
      {!!state.frontier.length && (
        <div className="output-strip">
          <span>AUXILIARY</span>
          {state.frontier.map((id) => id.replace("t", "")).join(" → ")}
        </div>
      )}
    </>
  );
}
