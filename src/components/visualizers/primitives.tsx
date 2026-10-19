"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
export interface Point {
  x: number;
  y: number;
}
export function ArrowDefs() {
  return (
    <defs>
      <marker
        id="arrow"
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto-start-reverse"
      >
        <path
          d="M1 1 L7 4 L1 7"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.5"
        />
      </marker>
    </defs>
  );
}
export function Node({
  id,
  x,
  y,
  value,
  label,
  active = false,
  moving = false,
  done = false,
  dim = false,
  width = 58,
  height = 58,
  children,
  round = false,
}: {
  id: string;
  x: number;
  y: number;
  value: string | number;
  label?: string;
  active?: boolean;
  moving?: boolean;
  done?: boolean;
  dim?: boolean;
  width?: number;
  height?: number;
  children?: ReactNode;
  round?: boolean;
}) {
  return (
    <motion.g
      data-node={id}
      initial={{ opacity: 0, x, y: y - 30 }}
      animate={{ opacity: dim ? 0.25 : 1, x, y }}
      exit={{ opacity: 0, y: y - 45, x: x + 40 }}
    >
      <rect
        className={`svg-node ${active ? (moving ? "moving" : "active") : done ? "done" : ""}`}
        width={width}
        height={height}
        rx={round ? height / 2 : 10}
      />
      <text
        className="node-value"
        x={width / 2}
        y={height / 2 + 5}
        textAnchor="middle"
      >
        {value}
      </text>
      {label && (
        <text className="node-label" x={width / 2} y={-12} textAnchor="middle">
          {label}
        </text>
      )}
      {children}
    </motion.g>
  );
}
export function Edge({
  id,
  from,
  to,
  active = false,
  done = false,
  curve = false,
  dim = false,
}: {
  id: string;
  from: Point;
  to: Point;
  active?: boolean;
  done?: boolean;
  curve?: boolean;
  dim?: boolean;
}) {
  const d = curve
    ? `M ${from.x} ${from.y} C ${from.x + 35} ${from.y}, ${to.x - 35} ${to.y}, ${to.x} ${to.y}`
    : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  return (
    <motion.path
      data-edge={id}
      initial={{ d, opacity: 0 }}
      animate={{ d, opacity: dim ? 0.2 : 1 }}
      exit={{ opacity: 0 }}
      className={`svg-edge ${active ? "active" : done ? "done" : ""}`}
      markerEnd="url(#arrow)"
    />
  );
}
