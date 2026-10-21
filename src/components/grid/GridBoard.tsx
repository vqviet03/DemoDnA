"use client";
import { useId } from "react";
import { motion } from "motion/react";
import type { GridCase, GridProblem, GridStep } from "@/grid/types";
import { PROBLEMS } from "@/grid/types";
export function GridBoard({
  test,
  problem,
  step,
  onCell,
  brush,
}: {
  test: GridCase;
  problem: GridProblem;
  step?: GridStep;
  onCell?: (r: number, c: number) => void;
  brush?: string;
}) {
  const markerId = useId().replace(/:/g, "");
  const size = 44,
    hasPoints = PROBLEMS[problem].hasPoints,
    current = step?.current,
    neighbor = step?.neighbor;
  const inside =
    neighbor &&
    neighbor.r >= 0 &&
    neighbor.r < test.rows &&
    neighbor.c >= 0 &&
    neighbor.c < test.cols;
  return (
    <svg
      className="gl-board-svg"
      role={onCell ? "group" : "img"}
      aria-label="Grid mô phỏng, tọa độ hàng cột từ 0"
      viewBox={`-30 -28 ${test.cols * size + 58} ${test.rows * size + 54}`}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6" fill="var(--amber)" />
        </marker>
      </defs>
      {Array.from({ length: test.cols }, (_, c) => (
        <text
          key={`c${c}`}
          className="gl-axis"
          x={c * size + size / 2}
          y={-9}
          textAnchor="middle"
        >
          {c}
        </text>
      ))}
      {test.cells.map((row, r) => (
        <g key={r}>
          <text
            className="gl-axis"
            x={-13}
            y={r * size + size / 2 + 4}
            textAnchor="middle"
          >
            {r}
          </text>
          {row.map((value, c) => {
            const id = r * test.cols + c,
              status = step?.status[id] ?? "unseen",
              active = current?.r === r && current.c === c,
              candidate = neighbor?.r === r && neighbor.c === c,
              start = hasPoints && test.start.r === r && test.start.c === c,
              goal = hasPoints && test.goal.r === r && test.goal.c === c;
            const terrain =
              problem === "islands"
                ? value === 1
                  ? "land"
                  : "water"
                : value === 1
                  ? "wall"
                  : "floor";
            return (
              <g
                key={c}
                data-cell={`${r},${c}`}
                data-cell-status={active ? "current" : status}
                className={`gl-cell ${terrain} ${status} ${active ? "current" : ""} ${candidate ? "candidate" : ""} ${onCell ? "editable" : ""}`}
                transform={`translate(${c * size},${r * size})`}
                role={onCell ? "button" : undefined}
                tabIndex={onCell ? 0 : undefined}
                aria-label={`Ô ${r},${c}: ${value}${start ? ", S" : ""}${goal ? ", G" : ""}`}
                onClick={() => onCell?.(r, c)}
                onKeyDown={(e) => {
                  if (onCell && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onCell(r, c);
                  }
                }}
              >
                <title>{`[${r}][${c}] = ${value} · ${status}${brush ? ` · click đặt ${brush}` : ""}`}</title>
                <rect x="2" y="2" width={size - 4} height={size - 4} rx="7" />
                {terrain === "wall" ? (
                  <path
                    className="gl-wall-mark"
                    d="M12 13h20M12 21h20M12 29h20M17 13v8M27 21v8"
                  />
                ) : value === 2 ? (
                  <g className="gl-item">
                    <path d="M22 10L32 21L22 32L12 21Z" />
                    <text x="22" y="25" textAnchor="middle">
                      2
                    </text>
                  </g>
                ) : (
                  <text
                    className="gl-cell-value"
                    x="22"
                    y="27"
                    textAnchor="middle"
                  >
                    {value}
                  </text>
                )}
                {start && (
                  <g className="gl-start">
                    <rect x="11" y="12" width="22" height="19" rx="4" />
                    <path d="M17 10v-3h10v3M15 18h3M26 18h3M18 25h8" />
                  </g>
                )}
                {goal && !start && (
                  <path className="gl-goal" d="M16 33V10l15 4-15 6" />
                )}
                {(start || goal) && (
                  <text className="gl-role" x="35" y="11" textAnchor="end">
                    {start && goal ? "S/G" : start ? "S" : "G"}
                  </text>
                )}
                {status === "done" && (
                  <circle className="gl-done-dot" cx="35" cy="35" r="2" />
                )}
              </g>
            );
          })}
        </g>
      ))}
      {!!step?.memory.path.length && (
        <motion.polyline
          className="gl-path-line"
          initial={false}
          animate={{
            points: step.memory.path
              .map(
                (id) =>
                  `${(id % test.cols) * size + 22},${Math.floor(id / test.cols) * size + 22}`,
              )
              .join(" "),
          }}
        />
      )}
      {current && neighbor && (
        <motion.line
          className={`gl-neighbor-edge ${!inside ? "outside" : ""}`}
          initial={false}
          animate={{
            x1: current.c * size + 22,
            y1: current.r * size + 22,
            x2:
              Math.max(-0.45, Math.min(test.cols - 0.55, neighbor.c)) * size +
              22,
            y2:
              Math.max(-0.45, Math.min(test.rows - 0.55, neighbor.r)) * size +
              22,
          }}
          markerEnd={`url(#${markerId})`}
        />
      )}
      {current && (
        <motion.g
          className="gl-pointer"
          initial={false}
          animate={{ x: current.c * size, y: current.r * size }}
        >
          <rect x="1" y="1" width="42" height="42" rx="8" />
          <circle cx="5" cy="5" r="4" />
        </motion.g>
      )}
    </svg>
  );
}
