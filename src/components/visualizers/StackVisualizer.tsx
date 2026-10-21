"use client";
import { AnimatePresence, motion } from "motion/react";
import type { DebugStep, StackState } from "@/engine/types";
import { Node } from "./primitives";
export function StackVisualizer({
  state,
  step,
}: {
  state: StackState;
  step: DebugStep;
}) {
  const entries = [...state.items, ...(state.removed ? [state.removed] : [])];
  return (
    <div className="stack-layout">
      <div className="diagram-scroll">
        <svg
          role="img"
          aria-label="Stack lịch sử thao tác LIFO"
          viewBox={`0 0 390 ${Math.max(390, state.items.length * 30 + 120)}`}
          style={{ minWidth: 340 }}
        >
          <text x="24" y="54" className="svg-small teal">
            TOP / LAST IN
          </text>
          <path
            d={`M 16 47 V ${Math.max(355, state.items.length * 30 + 70)} H 316 V 47`}
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <AnimatePresence initial={false}>
            {entries.map((item) => {
              const removed = state.removed?.id === item.id;
              const y = removed
                ? 20
                : 63 + (state.items.length - 1 - item.slot) * 30;
              return (
                <motion.g
                  key={item.id}
                  initial={{ opacity: 0, x: 355, y: 10 }}
                  animate={{ opacity: 1, x: removed ? 56 : 29, y }}
                  exit={{ opacity: 0, x: 355, y: 10 }}
                >
                  <rect
                    className={`svg-node ${removed ? "removed" : step.focus.includes(item.id) ? "active" : ""}`}
                    width="274"
                    height="26"
                    rx="5"
                  />
                  <text className="stack-text" x="14" y="18">
                    {removed ? "UNDO → " : ""}
                    {item.value}
                  </text>
                  <text className="node-label" x="256" y="17" textAnchor="end">
                    {String(item.slot + 1).padStart(2, "0")}
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>
          <text
            x="24"
            y={Math.max(378, state.items.length * 30 + 95)}
            className="svg-small"
          >
            BOTTOM / FIRST IN
          </text>
        </svg>
      </div>
      <div className="editor-preview">
        <div className="preview-bar">
          <span />
          <span />
          <span />
          <small>document.java-notes</small>
        </div>
        <div className="preview-page">
          <p className="preview-kicker">MY LEARNING JOURNAL</p>
          {state.editor.includes("Insert title") && (
            <h3>Learning, one step at a time.</h3>
          )}
          <p
            style={{
              fontWeight: state.editor.includes("Bold text") ? 600 : 400,
              color: state.editor.includes("Change color")
                ? "var(--accent)"
                : "inherit",
            }}
          >
            Small ideas. Powerful structures.
          </p>
          {state.editor.includes("Paste image") && (
            <div
              className={`preview-illustration ${state.editor.includes("Move image") ? "moved" : ""}`}
              style={{
                height: state.editor.includes("Resize image") ? 90 : 65,
              }}
            >
              <div />
              <div />
              <div />
              <span>▦</span>
            </div>
          )}
          {state.editor.includes("Add caption") && (
            <small>Fig. 1 — Connecting the dots.</small>
          )}
          <div className="preview-lines">
            <i />
            <i />
            <i />
          </div>
          <span className="preview-cursor" />
        </div>
        <div className="preview-footer">
          <span className="live-dot" />
          EDITOR PREVIEW · {state.editor.length} actions
        </div>
      </div>
    </div>
  );
}
