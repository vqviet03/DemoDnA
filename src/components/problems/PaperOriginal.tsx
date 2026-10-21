"use client";
import { memo, useEffect, useRef, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { ProblemCase } from "@/problems/types";
import type { PaperActivity } from "@/problems/paper-activity";
const OriginalCells = memo(function OriginalCells({
  test,
  cell,
}: {
  test: ProblemCase;
  cell: number;
}) {
  const width = test.cols / test.parts;
  return (
    <div
      className="pl-original-grid"
      style={{
        gridTemplateColumns: `repeat(${test.cols},${cell}px)`,
        gridTemplateRows: `repeat(${test.rows},${cell}px)`,
      }}
    >
      {test.cells.flatMap((row, r) =>
        row.map((value, c) => (
          <span
            key={`${r}-${c}`}
            className={`pl-original-cell pl-strip-${Math.floor(c / width) % 5} ${c % width === 0 ? "pl-original-crease" : ""}`}
            title={`a[${r}][${c}] = ${value} · D${Math.floor(c / width)}`}
          >
            <span>{value}</span>
          </span>
        )),
      )}
    </div>
  );
});
export function PaperOriginal({
  test,
  cell,
  activity,
  duration,
}: {
  test: ProblemCase;
  cell: number;
  activity: PaperActivity | null;
  duration: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const primary = activity?.cells[0];
  useEffect(() => {
    const el = viewport.current;
    if (!el || !primary) return;
    const left = primary.c * cell + 8,
      top = primary.r * cell + 8;
    if (left < el.scrollLeft || left + cell > el.scrollLeft + el.clientWidth)
      el.scrollLeft = Math.max(0, left - el.clientWidth / 2);
    if (top < el.scrollTop || top + cell > el.scrollTop + el.clientHeight)
      el.scrollTop = Math.max(0, top - el.clientHeight / 2);
  }, [primary?.r, primary?.c, cell]);
  return (
    <section className="pl-original-paper" aria-label="Giấy ban đầu">
      <div className="pl-paper-view-title">
        <b>01 · Giấy ban đầu</b>
        <span>
          a[{test.rows}][{test.cols}]
        </span>
      </div>
      <div className="pl-original-viewport" ref={viewport}>
        <div
          className="pl-original-world"
          style={
            {
              width: test.cols * cell,
              height: test.rows * cell,
              "--pl-paper-cell": `${cell}px`,
              fontSize: `calc(${Math.max(10, Math.min(17, cell * 0.4))}px * var(--gl-scale))`,
            } as CSSProperties
          }
        >
          <OriginalCells test={test} cell={cell} />
          {activity?.cells.map((visit, i) => (
            <motion.div
              key={i === 0 ? "primary" : `layer-${visit.block}`}
              className={`pl-original-cursor pl-paper-role-${visit.role} pl-activity-${activity.kind}`}
              data-testid="original-paper-cursor"
              data-source={`${visit.r},${visit.c}`}
              data-strip={visit.block}
              initial={false}
              animate={{ x: visit.c * cell, y: visit.r * cell }}
              transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: cell, height: cell }}
            >
              <b>{test.cells[visit.r][visit.c]}</b>
              <small>D{visit.block}</small>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="pl-paper-view-caption">
        Bản đề gốc · khung sáng đi theo dòng Java
      </div>
    </section>
  );
}

export function PaperReading({
  activity,
  test,
}: {
  activity: PaperActivity;
  test: ProblemCase;
}) {
  return (
    <div
      className={`pl-paper-reading pl-activity-${activity?.kind ?? "position"}`}
      aria-label="Theo dõi các lớp giấy"
    >
      <div className="pl-paper-reading-title">
        <span className="pl-xray-dot" />
        <b>
          {activity?.label ??
            "Giấy gốc và các lớp gấp dùng chung một snapshot debug"}
        </b>
        {activity?.value !== null && activity?.value !== undefined && (
          <strong data-testid="paper-reading-value">= {activity.value}</strong>
        )}
      </div>
      <div className="pl-paper-provenance" aria-label="Các ô nguồn góp số">
        {activity?.cells.map((p) => (
          <span
            key={`${p.r}-${p.c}`}
            data-source={`${p.r},${p.c}`}
            className={`pl-provenance-chip pl-strip-${p.block % 5} pl-paper-role-${p.role}`}
          >
            <b>D{p.block}</b> [{p.r},{p.c}]{" "}
            <strong>{test.cells[p.r][p.c]}</strong>
          </span>
        )) ?? <span>Mỗi dải giữ nguyên màu ở cả hai góc nhìn.</span>}
      </div>
    </div>
  );
}
