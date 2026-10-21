"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion } from "motion/react";
import { Layers3, MoveRight, Rotate3D } from "lucide-react";
import type { Matrix } from "@/grid/types";
import type { ProblemCase, ProblemRun, ProblemStep } from "@/problems/types";
import { foldPose, foldMotion } from "@/problems/paper";
import {
  projectedPaperColumn,
  type PaperActivity,
} from "@/problems/paper-activity";
import { PaperOriginal } from "./PaperOriginal";
export function NumberMatrix({
  values,
  active,
  label,
}: {
  values: Matrix<number>;
  active: readonly [number, number] | null;
  label: string;
}) {
  return (
    <div className="pl-matrix-scroll">
      <table className="pl-number-matrix" aria-label={label}>
        <tbody>
          {values.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => (
                <td
                  key={c}
                  className={
                    active?.[0] === r && active?.[1] === c
                      ? "pl-matrix-active"
                      : ""
                  }
                  data-row={r}
                  data-col={c}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ColorBoard({
  run,
  step,
  onCell,
}: {
  run: ProblemRun;
  step: ProblemStep;
  onCell: (r: number, c: number) => void;
}) {
  const p = step.current;
  const windowSize = 12;
  const rowStart = p
    ? Math.max(0, Math.min(run.test.rows - windowSize, p[0] - 5))
    : 0;
  const colStart = p
    ? Math.max(0, Math.min(run.test.cols - windowSize, p[1] - 5))
    : 0;
  const startR = Math.max(0, rowStart),
    startC = Math.max(0, colStart);
  return (
    <div className="pl-color-stage">
      <div className="pl-scene-heading">
        <span>
          <b>Ma trận đầu vào</b> · {run.test.rows} × {run.test.cols}
        </span>
        <small>Click ô để xem chi tiết</small>
      </div>
      <div className="pl-color-grid-wrap">
        <div
          className="pl-color-grid"
          role="group"
          aria-label="Ma trận tô màu"
          style={{
            gridTemplateColumns: `30px repeat(${Math.min(windowSize, run.test.cols)},minmax(32px,52px))`,
          }}
        >
          <span />
          {run.test.cells[0].slice(startC, startC + windowSize).map((_, j) => (
            <small key={j}>{j + startC}</small>
          ))}
          {run.test.cells.slice(startR, startR + windowSize).map((row, i) => {
            const r = i + startR;
            return (
              <div className="pl-grid-row" key={r}>
                <small>{r}</small>
                {row.slice(startC, startC + windowSize).map((v, j) => {
                  const c = j + startC;
                  const n = step.neighbors.findIndex(
                    (x) => x.r === r && x.c === c,
                  );
                  const status = step.marks[r][c];
                  const active = p?.[0] === r && p?.[1] === c;
                  return (
                    <motion.button
                      key={`${r}-${c}`}
                      onClick={() => onCell(r, c)}
                      aria-label={`Ô ${r}, ${c}: ${v}`}
                      title={`[${r}, ${c}] = ${v}`}
                      className={`pl-cell ${active ? "pl-current" : n >= 0 ? "pl-neighbor" : status === 2 ? "pl-qualified" : status === 3 ? "pl-rejected" : status === 1 ? "pl-loaded" : ""}`}
                      animate={{ scale: active ? 1.05 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span>
                        {step.phase === "input" && status === 0 ? "·" : v}
                      </span>
                      {n >= 0 && (
                        <b className="pl-cell-sign">
                          {step.signs[n] === 1
                            ? "+"
                            : step.signs[n] === -1
                              ? "−"
                              : "?"}
                        </b>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {(run.test.rows > windowSize || run.test.cols > windowSize) && (
        <small className="pl-window-note">
          Cửa sổ [{startR}…{Math.min(startR + 11, run.test.rows - 1)}, {startC}…
          {Math.min(startC + 11, run.test.cols - 1)}] theo current; chọn tọa độ
          ở thanh bộ nhớ để phân tích ô khác.
        </small>
      )}
      <div className="pl-legend">
        <span>
          <i className="pl-current" />
          Current
        </span>
        <span>
          <i className="pl-neighbor" />Ô kề
        </span>
        <span>
          <i className="pl-qualified" />
          Được tô
        </span>
        <span>
          <i className="pl-rejected" />
          Đã loại
        </span>
        <span>
          <i />
          Chưa xét
        </span>
      </div>
    </div>
  );
}
function PaperPlane({
  test,
  block,
  cell,
  orientation,
  z,
  activity,
  anchor,
}: {
  test: ProblemCase;
  block: number;
  cell: number;
  orientation: number;
  z: number;
  activity: PaperActivity | null;
  anchor: number;
}) {
  const k = test.cols / test.parts;
  const face = (back: boolean) => (
    <div
      className={`pl-paper-face ${back ? "pl-paper-back" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${k},${cell}px)`,
        gridTemplateRows: `repeat(${test.rows},${cell}px)`,
      }}
    >
      {test.cells.flatMap((row, r) =>
        Array.from({ length: k }, (_, j) => {
          const c = block * k + (back ? k - 1 - j : j);
          const visit = activity?.cells.find((p) => p.r === r && p.c === c);
          const covered = activity?.cells.some(
            (p) =>
              p.r === r &&
              projectedPaperColumn(p.c, k, anchor) ===
                projectedPaperColumn(c, k, anchor),
          );
          return (
            <span
              key={`${r}-${c}`}
              data-source={`${r},${c}`}
              data-paper-role={visit?.role ?? (covered ? "occluder" : "idle")}
              className={`${visit ? `pl-paper-lit pl-paper-role-${visit.role} pl-activity-${activity?.kind}` : ""} ${covered && !visit ? "pl-paper-occluder" : ""}`}
              style={{
                fontSize: `calc(${Math.max(10, Math.min(18, cell * 0.38))}px * var(--gl-scale))`,
              }}
            >
              <span className="pl-paper-ink">{row[c]}</span>
            </span>
          );
        }),
      )}
      <b className="pl-strip-tag">D{block}</b>
    </div>
  );
  return (
    <div
      className={`pl-paper-plane pl-strip-${block % 5}`}
      data-strip={block}
      style={{
        width: k * cell,
        height: test.rows * cell,
        transform: `translateZ(${z}px) rotateY(${orientation}deg)`,
      }}
    >
      {face(false)}
      {face(true)}
    </div>
  );
}
export function PaperBoard({
  run,
  step,
  previousFolded,
  animating,
  duration,
  epoch,
  preview,
  onPreview,
  activity,
}: {
  run: ProblemRun;
  step: ProblemStep;
  previousFolded: number;
  animating: boolean;
  duration: number;
  epoch: number;
  preview: number | null;
  onPreview: (v: number | null) => void;
  activity: PaperActivity | null;
}) {
  const host = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ w: 650, h: 350 });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ob = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const test = run.test,
    k = test.cols / test.parts;
  const geometricFolded =
    run.method === "fold"
      ? step.folded
      : step.phase === "input"
        ? 0
        : test.parts - 1;
  const shown = preview ?? geometricFolded;
  const prev = useRef({ folded: shown, epoch });
  const previewChanging =
    preview !== null &&
    prev.current.folded !== shown &&
    Math.abs(prev.current.folded - shown) === 1;
  const normalChanging =
    run.method === "fold" &&
    animating &&
    Math.abs(previousFolded - shown) === 1;
  const from = previewChanging ? prev.current.folded : previousFolded;
  const moving =
    (previewChanging || normalChanging) && prev.current.epoch === epoch;
  const direction = shown > from ? 1 : -1;
  const baseFolded = moving ? Math.min(shown, from) : shown;
  const pose = foldPose(test.parts, baseFolded),
    anchor = pose.anchor;
  const cell = Math.max(
    14,
    Math.min(42, (size.w - 46) / test.cols, (size.h - 40) / test.rows),
  );
  const depth = Math.max(1.6, Math.min(3.5, cell / 12));
  const { angle, zEnd, over } = foldMotion(test.parts, baseFolded, depth);
  useEffect(() => {
    if (!previewChanging) {
      prev.current = { folded: shown, epoch };
      return;
    }
    const timer = setTimeout(
      () => {
        prev.current = { folded: shown, epoch };
        setSize((x) => ({ ...x }));
      },
      duration * 1000 + 50,
    );
    return () => clearTimeout(timer);
  }, [shown, epoch, previewChanging, duration]);
  const topStrip = pose.order.at(-1);
  const hidden =
    activity?.cells.filter((p) => p.block >= anchor && p.block !== topStrip)
      .length ?? 0;
  const cursor = activity?.cells[0];
  const cursorColumn = cursor ? projectedPaperColumn(cursor.c, k, anchor) : 0;
  const cursorZ =
    cursor && Math.floor(cursor.c / k) >= anchor
      ? (pose.order.length - 1 - pose.anchorRank) * depth + 2
      : 2;
  return (
    <div className="pl-paper-stage" data-method={run.method}>
      <div className="pl-scene-heading">
        <span>
          <Rotate3D size={14} />
          <b>
            Giấy {test.rows} × {test.cols}
          </b>{" "}
          · {test.parts} dải · K = {k}
        </span>
        <span className="pl-fold-progress">
          {shown} / {Math.max(0, test.parts - 1)} lần gấp
        </span>
      </div>
      <div className="pl-paper-views">
        <PaperOriginal
          test={test}
          cell={cell}
          activity={activity}
          duration={animating ? duration : 0}
        />
        <section className="pl-folded-paper" aria-label="Giấy đang gấp">
          <div className="pl-paper-view-title">
            <b>02 · Giấy đang gấp</b>
            <span>{shown > 0 ? "Nhìn xuyên các lớp" : "Chưa gấp"}</span>
          </div>
          <div className="pl-paper-viewport" ref={host}>
            <div
              className="pl-paper-world"
              style={
                {
                  width: test.cols * cell,
                  height: test.rows * cell,
                  transform: `rotateX(12deg) translateZ(-10px) scale(var(--gl-grid-zoom))`,
                } as CSSProperties
              }
            >
              {Array.from({ length: anchor }, (_, b) => (
                <div
                  key={`flat-${b}`}
                  className="pl-paper-strip-flat"
                  style={{
                    left: b * k * cell,
                    width: k * cell,
                    height: test.rows * cell,
                  }}
                >
                  <PaperPlane
                    test={test}
                    block={b}
                    cell={cell}
                    orientation={0}
                    z={0}
                    activity={activity}
                    anchor={anchor}
                  />
                  {b > 0 && <div className="pl-crease" />}
                </div>
              ))}
              <motion.div
                key={`fold-${baseFolded}-${epoch}-${moving ? "moving" : "static"}`}
                className="pl-fold-stack"
                data-testid="fold-stack"
                data-anchor={anchor}
                data-layers={pose.order.map((b) => `D${b}`).join(" · ")}
                data-folded={shown}
                data-translucent={shown > 0}
                data-moving={moving}
                data-fold-direction={over ? "over" : "under"}
                initial={
                  moving
                    ? {
                        rotateY: direction === 1 ? 0 : angle,
                        z: direction === 1 ? 0 : zEnd,
                      }
                    : false
                }
                animate={{
                  rotateY: moving ? (direction === 1 ? angle : 0) : 0,
                  z: moving ? (direction === 1 ? zEnd : 0) : 0,
                }}
                transition={{ duration: duration, ease: [0.4, 0, 0.2, 1] }}
                style={
                  {
                    left: anchor * k * cell,
                    width: k * cell,
                    height: test.rows * cell,
                    transformOrigin: "0px 50%",
                    "--pl-layer-alpha": `${Math.min(0.25, 0.8 / (pose.order.length + 1)) * 100}%`,
                  } as CSSProperties
                }
              >
                {pose.order.map((b, rank) => (
                  <PaperPlane
                    key={b}
                    test={test}
                    block={b}
                    cell={cell}
                    orientation={(b - anchor) % 2 ? 180 : 0}
                    z={(rank - pose.anchorRank) * depth}
                    activity={activity}
                    anchor={anchor}
                  />
                ))}
                <div className="pl-crease" />
              </motion.div>
              {cursor && !moving && (
                <motion.div
                  className={`pl-folded-cursor pl-activity-${activity?.kind}`}
                  data-testid="folded-paper-cursor"
                  data-source={`${cursor.r},${cursor.c}`}
                  data-projected-column={cursorColumn}
                  data-hidden-count={hidden}
                  initial={false}
                  animate={{
                    x: cursorColumn * cell,
                    y: cursor.r * cell,
                    z: cursorZ,
                  }}
                  transition={{
                    duration: animating ? duration : 0,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  style={{ width: cell, height: cell }}
                >
                  <span className="pl-xray-dot" />
                </motion.div>
              )}
            </div>
          </div>
          <div className="pl-paper-view-caption">
            {hidden > 0
              ? `${hidden} ô góp số ở lớp bên trong · vẫn đang được theo dõi`
              : run.method === "fold"
                ? "Nếp gấp xen kẽ lên / xuống"
                : "Mô hình đích sau gấp · Java đang tính ánh xạ"}
          </div>
        </section>
      </div>
      <div className="pl-paper-footer">
        <span>
          <Layers3 size={14} /> {shown + 1} lớp · xanh: số gốc · tím: tổng chồng
          · cam: ghi kết quả
        </span>
        {run.method !== "fold" && (
          <button
            disabled={previewChanging}
            onClick={() =>
              onPreview(
                preview === null
                  ? 0
                  : preview < test.parts - 1
                    ? preview + 1
                    : null,
              )
            }
          >
            {preview === null
              ? "Xem gấp hình học"
              : preview < test.parts - 1
                ? "Gấp tiếp"
                : "Về debugger"}{" "}
            <MoveRight size={13} />
          </button>
        )}
      </div>
      {preview !== null && (
        <small className="pl-preview-note">
          XEM HÌNH HỌC · không thực thi Java, không thay đổi các biến. Bấm “Về
          debugger” sau lần gấp cuối.
        </small>
      )}
    </div>
  );
}
