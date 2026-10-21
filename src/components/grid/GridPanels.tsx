"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock3,
  Database,
  GitCompareArrows,
  Layers,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  ALGORITHMS,
  type GridRun,
  type GridStep,
  type Matrix,
  type WatchData,
} from "@/grid/types";
export function GridExplanation({
  step,
  run,
  nodeProgress,
}: {
  step: GridStep;
  run: GridRun;
  nodeProgress?: { index: number; total: number };
}) {
  const test = run.cases[Math.max(0, step.caseIndex)],
    p = step.current,
    n = step.neighbor;
  const local =
    step.scopes.flood ??
    step.scopes.solve ??
    step.scopes.nextInt ??
    step.scopes.main ??
    {};
  const interesting = [
    "value",
    "item",
    "land",
    "id",
    "direction",
    "nr",
    "nc",
    "inside",
    "terrain",
    "passable",
    "known",
    "atTarget",
    "node",
    "count",
  ].filter((name) => name in local);
  const focus: Record<string, readonly string[]> = {
    bounds: ["nr", "nc", "inside"],
    ifInside: ["nr", "nc", "inside"],
    terrain: ["terrain", "nr", "nc"],
    passable: ["terrain", "passable"],
    ifPassable: ["terrain", "passable"],
    known: ["known", "nr", "nc"],
    ifNew: ["known", "nr", "nc"],
    markSeen: ["known", "nr", "nc"],
    directionNext: ["id", "direction"],
    currentC: ["id", "r", "c"],
  };
  const shown = (focus[step.marker] ?? interesting)
    .filter((name) => name in local)
    .slice(0, 4);
  return (
    <div className="gl-explanation">
      <div className="gl-inspector-heading">
        <span className="gl-live-dot" /> NODE & LOGIC{" "}
        <b>L{step.activeLines[0]}</b>
      </div>
      <div className="gl-node-coordinates">
        <span>CURRENT</span>
        <strong>{p ? `[${p.r}, ${p.c}]` : "—"}</strong>
        {n && (
          <small>
            Neighbor [{n.r}, {n.c}]
          </small>
        )}
      </div>
      {nodeProgress && (
        <div className="gl-node-progress">
          <span>Logic tại ô</span>
          <b>
            {nodeProgress.index} / {nodeProgress.total} điểm dừng
          </b>
        </div>
      )}
      {p && (
        <p className="gl-node-data">
          Đề bài: <b>{test.cells[p.r]?.[p.c]}</b> · grid đang lưu:{" "}
          <b>{step.memory.grid[p.r]?.[p.c] ?? "chưa cấp phát"}</b>
          {step.phase === "input" && !step.memory.loaded[p.r]?.[p.c] && (
            <em> Chưa đọc ô này</em>
          )}
        </p>
      )}
      {step.condition && (
        <div
          className={`gl-condition ${step.condition.endsWith("false") ? "false" : ""}`}
          data-testid="grid-condition"
        >
          {step.condition}
        </div>
      )}
      <div className="gl-inline-vars">
        {shown.map((name) => (
          <span key={name}>
            {name} <b>{String(local[name].value)}</b>
          </span>
        ))}
      </div>
      <p className="gl-detailed-explanation" data-testid="grid-explanation">
        {step.explanation}
      </p>
      <code className="gl-current-source">
        {run.code.text.split("\n")[step.activeLines[0] - 1].trim()}
      </code>
      <GridResultState step={step} run={run} />
    </div>
  );
}
export function GridResultState({
  step,
  run,
  compact = false,
}: {
  step: GridStep;
  run: GridRun;
  compact?: boolean;
}) {
  const index = Math.max(0, step.caseIndex),
    actual = step.outputs[index],
    returned = step.scopes.main?.result?.value;
  const count = step.scopes.solve?.count?.value;
  const p = step.current,
    distance = p ? step.memory.dist[p.r]?.[p.c] : undefined;
  const value =
    actual ??
    returned ??
    count ??
    (distance !== undefined && distance >= 0 ? distance : undefined);
  const phase =
    actual !== undefined
      ? "printed"
      : returned !== undefined
        ? "returned"
        : step.phase === "input"
          ? "input"
          : "computing";
  const label =
    phase === "printed"
      ? "OUTPUT"
      : phase === "returned"
        ? "RESULT"
        : count !== undefined
          ? "count"
          : distance !== undefined && distance >= 0
            ? run.algorithm === "dfs"
              ? "độ sâu"
              : "dist[current]"
            : "RESULT";
  const state =
    phase === "printed"
      ? actual === run.expected[index]
        ? "MATCH"
        : "MISMATCH"
      : phase === "returned"
        ? "đã return · chờ print"
        : phase === "input"
          ? "đang đọc input"
          : "đang tính · chưa return";
  return (
    <div
      className={`gl-live-result ${compact ? "compact" : ""} ${phase === "printed" ? (actual === run.expected[index] ? "match" : "mismatch") : ""}`}
      data-result-phase={phase}
      data-testid={compact ? "grid-live-result" : undefined}
    >
      <span>{label}</span>
      <strong>{value === undefined ? "—" : String(value)}</strong>
      <small>{state}</small>
    </div>
  );
}
const display = (data: WatchData): string =>
  data === null
    ? "null"
    : Array.isArray(data)
      ? JSON.stringify(data)
      : String(data);
export function GridWatch({
  step,
  previous,
}: {
  step: Pick<GridStep, "scopes" | "callStack">;
  previous: Pick<GridStep, "scopes" | "callStack">;
}) {
  const frame = step.callStack[0] ?? "";
  const active = frame.startsWith("choose(")
    ? `choose${frame.match(/^choose\((\d+)/)?.[1] ?? ""}`
    : frame.split("(")[0];
  return (
    <section className="gl-watch gl-panel" aria-label="Grid debugger variables">
      <div className="gl-panel-title">
        <Layers size={14} />
        <b>Variables / Watch</b>
        <span>scope thực tế</span>
      </div>
      <div className="gl-watch-scroll" data-testid="grid-variables">
        {Object.entries(step.scopes)
          .sort(
            ([a], [b]) =>
              ["nextInt", "flood", "solve", "main", "static", "watch"].indexOf(
                a,
              ) -
              ["nextInt", "flood", "solve", "main", "static", "watch"].indexOf(
                b,
              ),
          )
          .map(([scope, variables]) => (
            <details
              className="gl-scope"
              key={scope}
              open={
                scope === active ||
                (active === "<clinit>" && scope === "static")
              }
            >
              <summary className="gl-scope-name">
                {scope === "watch"
                  ? "WATCH · expressions"
                  : scope === "static"
                    ? "GLOBAL · static"
                    : scope === "main"
                      ? "LOCAL · main"
                      : `LOCAL · ${scope}`}
                <small>{Object.keys(variables).length} biến</small>
              </summary>
              <div className="gl-watch-grid">
                {Object.entries(variables)
                  .sort(([a], [b]) => {
                    const order = [
                      "value",
                      "item",
                      "count",
                      "id",
                      "r",
                      "c",
                      "direction",
                      "nr",
                      "nc",
                      "inside",
                      "terrain",
                      "passable",
                      "known",
                      "atTarget",
                      "node",
                      "result",
                      "tc",
                    ];
                    const rank = (key: string) => {
                      const n = order.indexOf(key);
                      return n < 0 ? 100 : n;
                    };
                    return rank(a) - rank(b);
                  })
                  .map(([name, watch]) => {
                    const changed =
                      JSON.stringify(previous.scopes[scope]?.[name]) !==
                      JSON.stringify(watch);
                    return (
                      <div
                        className={`gl-watch-value ${changed ? "changed" : ""}`}
                        key={name}
                      >
                        <span>
                          {name}
                          <small>{watch.type}</small>
                        </span>
                        <strong title={display(watch.value)}>
                          {display(watch.value)}
                        </strong>
                      </div>
                    );
                  })}
              </div>
            </details>
          ))}
      </div>
      <div className="gl-stack-frames">
        {step.callStack.map((frame, i) => (
          <span key={`${frame}-${i}`}>
            {i ? "↳" : "→"} {frame}
          </span>
        ))}
      </div>
    </section>
  );
}
export function GridMemoryPanel({
  step,
  previous,
  run,
  onResize,
  memoryShare,
}: {
  step: GridStep;
  previous: GridStep;
  run: GridRun;
  onResize?: (delta: number) => void;
  memoryShare?: number;
}) {
  const [tab, setTab] = useState<"grid" | "seen" | "dist" | "parent" | "flat">(
    run.algorithm === "bfs" || run.algorithm === "dfs"
      ? "seen"
      : run.algorithm === "linear"
        ? "flat"
        : "grid",
  );
  const test = run.cases[Math.max(0, step.caseIndex)],
    memory = step.memory;
  const data: Matrix<number | boolean> =
    tab === "flat" ? [memory.flat] : memory[tab];
  return (
    <section className="gl-memory gl-panel" aria-label="Bộ nhớ tạm">
      <div className="gl-memory-matrix">
        <div className="gl-memory-tabs">
          <div className="gl-memory-tab-buttons">
            {["grid", "seen", "dist", "parent", "flat"].map((name) => (
              <button
                key={name}
                aria-pressed={name === tab}
                onClick={() => setTab(name as typeof tab)}
              >
                {name}
                {name === "flat" ? "[]" : "[][]"}
              </button>
            ))}
          </div>
          <span>
            {tab === "grid" && !!step.scopes.main?.grid
              ? "main · live"
              : memory.privateActive
                ? "solve · live"
                : "snapshot"}
          </span>
          {onResize && (
            <div className="gl-memory-size-buttons">
              <button
                aria-label="Thu vùng bộ nhớ"
                disabled={memoryShare !== undefined && memoryShare <= 20}
                onClick={() => onResize(-5)}
              >
                −
              </button>
              <button
                aria-label="Mở rộng vùng bộ nhớ"
                disabled={memoryShare !== undefined && memoryShare >= 45}
                onClick={() => onResize(5)}
              >
                +
              </button>
            </div>
          )}
        </div>
        {data.length && data[0]?.length ? (
          <div className="gl-memory-table-wrap">
            <table className="gl-memory-table" aria-label={`${tab} memory`}>
              <tbody>
                {data.map((row, r) => (
                  <tr key={r}>
                    <th>{r}</th>
                    {row.map((value, c) => {
                      const p = step.current,
                        active =
                          tab === "flat"
                            ? p && p.r * test.cols + p.c === c
                            : p?.r === r && p.c === c;
                      const unread = tab === "grid" && !memory.loaded[r]?.[c];
                      const before =
                        tab === "flat"
                          ? previous.memory.flat[c]
                          : previous.memory[tab][r]?.[c];
                      const changed = before !== undefined && before !== value;
                      return (
                        <td
                          key={c}
                          className={`${active ? "active" : ""} ${unread ? "unread" : ""} ${changed ? "written" : ""}`}
                          title={`${tab}[${r}][${c}] = ${value}${unread ? " · chưa đọc input" : ""}`}
                        >
                          <motion.span
                            key={String(value)}
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 1 }}
                          >
                            {typeof value === "boolean"
                              ? value
                                ? "T"
                                : "F"
                              : value}
                          </motion.span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="gl-memory-empty">
            {tab} chưa được cấp phát / không dùng trong cách duyệt này.
          </p>
        )}
        <small>
          {tab === "parent"
            ? "Giá trị là ID cha: r * C + c; -1 kết thúc."
            : tab === "dist" && run.algorithm === "dfs"
              ? "Độ sâu DFS; không cam kết ngắn nhất."
              : tab === "seen"
                ? "T: visited · F: chưa · xanh: current · vàng: vừa đổi."
                : tab === "flat"
                  ? "Mảng 1D thực sự được Java cấp phát khi chọn flatten."
                  : "0 mờ = giá trị mặc định ở ô chưa được đọc input."}
          {!memory.privateActive &&
            tab !== "grid" &&
            " Snapshot trước return; biến đã hết scope."}
        </small>
      </div>
      <div className="gl-frontier">
        <div className="gl-frontier-caption">
          <b>
            {run.algorithm === "dfs"
              ? "STACK · TOP ↓"
              : run.algorithm === "bfs"
                ? "QUEUE · FRONT → REAR"
                : "BỘ NHỚ TRUY CẬP"}
          </b>
          <span>
            {memory.frontier.length} chờ · peak {step.counts.peakFrontier}
          </span>
        </div>
        {run.algorithm === "bfs" || run.algorithm === "dfs" ? (
          <div
            className={`gl-frontier-items ${run.algorithm === "dfs" ? "stack" : ""}`}
            data-testid="grid-frontier"
          >
            <AnimatePresence initial={false}>
              {memory.frontier.map((id, i) => (
                <motion.div
                  key={`${step.caseIndex}-${id}`}
                  layout
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -35 }}
                >
                  <small>
                    {i === 0 ? (run.algorithm === "dfs" ? "TOP" : "FRONT") : i}
                  </small>
                  <b>
                    [{Math.floor(id / test.cols)}, {id % test.cols}]
                  </b>
                  <span>#{id}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {!memory.frontier.length && (
              <span className="gl-memory-empty">∅ empty</span>
            )}
          </div>
        ) : (
          <p className="gl-memory-empty">
            {run.algorithm === "linear"
              ? "flat[] + index; hàng = index / C, cột = index % C."
              : "Duyệt trực tiếp grid bằng r, c. Không cần Queue hay Stack phụ."}
          </p>
        )}
        {memory.path.length > 0 && (
          <div className="gl-path-text">
            <b>PATH</b>
            {memory.path
              .map((id) => `[${Math.floor(id / test.cols)},${id % test.cols}]`)
              .join(" → ")}
          </div>
        )}
        <small>
          {!memory.privateActive && memory.frontier.length
            ? "Frontier còn lại lúc return; các ô này không tiếp tục chạy."
            : "Màu chờ là đã phát hiện nhưng chưa hoàn tất xử lý."}
        </small>
      </div>
    </section>
  );
}
export function GridResults({
  step,
  run,
  onSeek,
  expectedManual,
  viewTimeMs,
}: {
  step: GridStep;
  run: GridRun;
  onSeek: (index: number) => void;
  expectedManual: boolean;
  viewTimeMs: number;
}) {
  const totalCells = run.cases.reduce((sum, c) => sum + c.rows * c.cols, 0),
    completed = step.outputs.length;
  const maximum = Math.max(
    0,
    ...step.reports.map((r) => r.counts.peakBytes),
    step.counts.peakBytes,
  );
  const positions = useMemo(
    () =>
      run.cases.map((_, i) => ({
        start: run.steps.findIndex(
          (s) => s.caseIndex === i && s.marker === "caseCheck",
        ),
        print: run.steps.findIndex(
          (s) => s.caseIndex === i && s.marker === "print",
        ),
      })),
    [run],
  );
  return (
    <section className="gl-results gl-panel">
      <div className="gl-output-section">
        <div className="gl-panel-title">
          <GitCompareArrows size={14} />
          <b>Expected / Actual</b>
          <span>{expectedManual ? "Expected bạn nhập" : "Oracle độc lập"}</span>
        </div>
        <div className="gl-output-scroll">
          <table className="gl-output-table">
            <thead>
              <tr>
                <th>Test / grid</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Check / bước</th>
              </tr>
            </thead>
            <tbody>
              {run.cases.map((test, i) => {
                const actual = step.outputs[i],
                  expected = run.expected[i],
                  match = actual === expected,
                  report = step.reports.find((r) => r.caseIndex === i),
                  print = positions[i].print;
                return (
                  <tr key={i} className={step.caseIndex === i ? "active" : ""}>
                    <td>
                      <button onClick={() => onSeek(positions[i].start)}>
                        #{i + 1}{" "}
                        <small>
                          {test.rows}×{test.cols}
                        </small>
                      </button>
                    </td>
                    <td>
                      <code>{expected}</code>
                    </td>
                    <td>
                      <code data-testid={`grid-actual-${i}`}>
                        {actual ?? "— đang chờ print"}
                      </code>
                    </td>
                    <td>
                      <button
                        className={
                          actual === undefined
                            ? "pending"
                            : match
                              ? "match"
                              : "mismatch"
                        }
                        onClick={() => onSeek(print)}
                        title="Chạy nhanh tới dòng print của test này"
                      >
                        {actual === undefined ? (
                          "↗ tới output"
                        ) : match ? (
                          <>
                            <CheckCircle2 size={12} /> MATCH
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> MISMATCH
                          </>
                        )}
                        {report && <small>{report.steps} bước</small>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="gl-stat-section">
        <div className="gl-panel-title">
          <Database size={14} />
          <b>Execution metrics</b>
          <span>{ALGORITHMS[run.algorithm].split(" · ")[0]}</span>
        </div>
        <div className="gl-stat-grid">
          <div>
            <span>Test đã in / T</span>
            <strong>
              {completed} / {run.cases.length}
            </strong>
          </div>
          <div>
            <span>Kích thước input</span>
            <strong>{totalCells} ô</strong>
          </div>
          <div>
            <span>Đọc / ghi · test hiện tại</span>
            <strong>
              {step.counts.cellReads} / {step.counts.writes}
            </strong>
          </div>
          <div>
            <span>if / while · test hiện tại</span>
            <strong>{step.counts.checks}</strong>
          </div>
          <div>
            <span>Đến kết quả test</span>
            <strong>
              {step.reports.find((r) => r.caseIndex === step.caseIndex)
                ?.resultAt ?? "—"}{" "}
              bước
            </strong>
          </div>
          <div>
            <span>Payload peak ước tính</span>
            <strong>{maximum.toLocaleString("vi-VN")} B</strong>
          </div>
          <div>
            <span>
              <Clock3 size={10} /> Sinh toàn replay (JS)
            </span>
            <strong>{run.generateMs.toFixed(1)} ms</strong>
          </div>
          <div>
            <span>Thời gian phát</span>
            <strong>{(viewTimeMs / 1000).toFixed(1)} s</strong>
          </div>
        </div>
        <details>
          <summary>Ý nghĩa số đo / log từng test</summary>
          <p>
            Bước = điểm dừng debug, gồm input, gọi/trả hàm và từng dòng
            if/while; không phải JVM bytecode. Đọc/ghi ô đếm thao tác dữ liệu
            tường minh. Payload = phần tử int (4 B), boolean (1 B), Deque/path
            số nguyên; không gồm object header, reader, GC hay toàn bộ JVM heap.
            Thời gian sinh replay gồm tạo snapshot bằng JavaScript, không phải
            thời gian Java. Thời gian phát chỉ tính khi Play; tua nhanh không
            phải thời gian thực thi.
          </p>
          {step.reports.map((report) => (
            <p key={report.caseIndex}>
              Test {report.caseIndex + 1}: {report.rows}×{report.cols};{" "}
              {report.steps} bước tới print; input {report.inputSteps}; solve{" "}
              {report.solveSteps}; khám phá {report.counts.discovered}; xong{" "}
              {report.counts.processed}; push/pop {report.counts.pushed}/
              {report.counts.popped}; peak frontier {report.counts.peakFrontier}
              ; sinh replay {run.caseGenerateMs[report.caseIndex].toFixed(1)}{" "}
              ms.
            </p>
          ))}
        </details>
      </div>
    </section>
  );
}
