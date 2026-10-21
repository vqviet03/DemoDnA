"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileInput,
  Layers3,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  WrapText,
} from "lucide-react";
import {
  PROBLEMS,
  METHODS,
  type MethodId,
  type ProblemId,
  type ProblemRun,
} from "@/problems/types";
import { SAMPLES } from "@/problems/samples";
import {
  expectedLines,
  parseProblemInput,
  referenceAnswer,
} from "@/problems/input";
import { generateProblemRun, solveProblem } from "@/problems/replay";
import { usePlayback } from "@/hooks/use-playback";
import { CodeEditor } from "../CodeEditor";
import { GridDialog } from "../grid/GridDialogs";
import { GridWatch } from "../grid/GridPanels";
import {
  bound,
  DEFAULT_DISPLAY,
  GridDisplayControls,
  readDisplay,
  type GridDisplay,
} from "../grid/GridDisplayControls";
import { ColorBoard, NumberMatrix, PaperBoard } from "./ProblemBoards";
import { PaperReading } from "./PaperOriginal";
import { ProblemsTabs, type AppProblem } from "./ProblemsTabs";
import { paperActivity } from "@/problems/paper-activity";
type Config = {
  problem: ProblemId;
  method: MethodId;
  input: string;
  expected: string;
  selected: number;
  detail: boolean;
  focus: readonly [number, number] | null;
};
type Actual = { text: string; operations: number; ms: number; mode: string };
export default function ProblemsLab({
  initialProblem = "origami",
  onSelect,
}: {
  initialProblem?: ProblemId;
  onSelect?: (p: AppProblem) => void;
}) {
  const [config, setConfig] = useState<Config>({
    problem: initialProblem,
    method: PROBLEMS[initialProblem].methods[0],
    ...SAMPLES[initialProblem],
    selected: 0,
    detail: true,
    focus: null,
  });
  const [display, setDisplay] = useState<GridDisplay>(DEFAULT_DISPLAY),
    [ready, setReady] = useState(false),
    [dark, setDark] = useState(false),
    [width, setWidth] = useState(43),
    [codeHeight, setCodeHeight] = useState(73);
  const [modal, setModal] = useState<"input" | "theory" | "results" | null>(
      null,
    ),
    [run, setRun] = useState<ProblemRun | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [actual, setActual] = useState<Record<number, Actual>>({}),
    [batchBusy, setBatchBusy] = useState(false);
  const cases = useMemo(
    () => parseProblemInput(config.input, config.problem),
    [config.input, config.problem],
  );
  const expected = useMemo(
    () => expectedLines(config.expected, cases.length),
    [config.expected, cases.length],
  );
  const oracle = useMemo(
    () =>
      cases.map((t, i) => `#${i + 1} ${referenceAnswer(t, config.problem)}`),
    [cases, config.problem],
  );
  useEffect(() => {
    try {
      const raw = localStorage.getItem("problems-display-v1");
      if (raw) {
        const saved = JSON.parse(raw);
        setDisplay(readDisplay(saved));
        if (typeof saved.width === "number" && Number.isFinite(saved.width))
          setWidth(bound(saved.width, 28, 70));
        if (
          typeof saved.codeHeight === "number" &&
          Number.isFinite(saved.codeHeight)
        )
          setCodeHeight(bound(saved.codeHeight, 40, 85));
      }
      setDark(localStorage.getItem("structure-theme") === "dark");
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "problems-display-v1",
          JSON.stringify({ ...display, width, codeHeight }),
        );
      } catch {}
  }, [display, width, codeHeight, ready]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("structure-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    setBusy(true);
    const id = requestAnimationFrame(() => {
      try {
        setRun(
          generateProblemRun(
            cases[config.selected],
            config.problem,
            config.method,
            {
              caseIndex: config.selected,
              tests: cases.length,
              detail: config.detail,
              focus: config.focus ?? undefined,
            },
          ),
        );
        setError("");
        setRevision((x) => x + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    cases,
    config.selected,
    config.problem,
    config.method,
    config.detail,
    config.focus,
  ]);
  const updateDisplay = useCallback(
    (patch: Partial<GridDisplay>) => setDisplay((d) => ({ ...d, ...patch })),
    [],
  );
  const completed = useCallback(
    (i: number, value: Actual) =>
      setActual((a) =>
        a[i]?.text === value.text && a[i]?.mode === value.mode
          ? a
          : { ...a, [i]: value },
      ),
    [],
  );
  const change = (next: Config, reset = false) => {
    setConfig(next);
    if (reset) setActual({});
  };
  function preset(mode: "compact" | "classroom" | "projector") {
    setDisplay({
      ...DEFAULT_DISPLAY,
      scale: mode === "projector" ? 140 : mode === "classroom" ? 125 : 100,
      memoryShare:
        mode === "projector" ? (config.problem === "origami" ? 28 : 40) : 34,
      presentation: mode === "projector",
      wrapCode: mode !== "compact",
    });
    setWidth(mode === "compact" ? 43 : 46);
    setCodeHeight(73);
  }
  function batch() {
    setBatchBusy(true);
    setTimeout(() => {
      try {
        const all: Record<number, Actual> = {};
        cases.forEach((t, i) => {
          const started = performance.now(),
            answer = solveProblem(t, config.problem, config.method);
          all[i] = {
            text: `#${i + 1} ${answer.answer}`,
            operations: answer.operations,
            ms: performance.now() - started,
            mode: "Chạy nhanh JS",
          };
        });
        setActual(all);
      } finally {
        setBatchBusy(false);
      }
    }, 20);
  }
  const style = {
    "--gl-scale": display.scale / 100,
    "--gl-code-font": `${bound(Math.round((15 * display.scale) / 100) + display.codeOffset, 13, 30)}px`,
    "--gl-memory-font": `${bound((12 * display.scale) / 100, 11, 19)}px`,
    "--gl-grid-font": `${bound((17 * display.scale) / 100, 15, 25)}px`,
    "--pl-code-width": `${width}%`,
    "--pl-code-height": `${codeHeight}%`,
    "--gl-memory-share": `${display.memoryShare}%`,
    "--gl-grid-zoom": display.gridZoom / 100,
  } as CSSProperties;
  return (
    <div
      className={`grid-lab problem-lab ${display.presentation ? "gl-presenting" : ""} ${display.wrapCode ? "gl-code-wrapping" : ""}`}
      style={style}
      data-ready={!!run && !busy}
      aria-busy={busy}
    >
      <header className="gl-header">
        <Link href="/" prefetch={false}>
          <ArrowLeft size={14} />
          <span>Structure Lab</span>
        </Link>
        <span className="gl-header-divider" />
        <strong>
          <Layers3 size={17} /> BÀI TẬP PDF
        </strong>
        <Link href="/grid/" prefetch={false}>
          Grid Lab ↗
        </Link>
        <GridDisplayControls
          display={display}
          onChange={updateDisplay}
          onPreset={preset}
        />
        <div className="gl-header-actions">
          <button
            aria-label="Đề & cách giải"
            onClick={() => setModal("theory")}
          >
            <BookOpen size={14} />
            <span>Đề & cách giải</span>
          </button>
          <button
            aria-label={dark ? "Light theme" : "Dark theme"}
            onClick={() => setDark((x) => !x)}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <div className="gl-toolbar">
        <ProblemsTabs
          selected={config.problem}
          onSelect={(p) => {
            if (onSelect) onSelect(p);
            else if (p === "origami" || p === "coloring")
              change(
                {
                  problem: p,
                  method: PROBLEMS[p].methods[0],
                  ...SAMPLES[p],
                  selected: 0,
                  detail: true,
                  focus: null,
                },
                true,
              );
          }}
        />
        <label>
          Cách giải
          <select
            aria-label="Cách giải bài PDF"
            value={config.method}
            disabled={busy}
            onChange={(e) =>
              change({ ...config, method: e.target.value as MethodId }, true)
            }
          >
            {PROBLEMS[config.problem].methods.map((m) => (
              <option key={m} value={m}>
                {METHODS[m].title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Test
          <select
            aria-label="Test case PDF"
            value={config.selected}
            disabled={busy}
            onChange={(e) =>
              change({
                ...config,
                selected: Number(e.target.value),
                focus: null,
              })
            }
          >
            {cases.map((t, i) => (
              <option key={i} value={i}>
                #{i + 1} · {t.rows}×{t.cols}
                {config.problem === "origami" ? ` · ${t.parts} dải` : ""}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setModal("input")}>
          <FileInput size={14} />
          Input / Expected
        </button>
        <button onClick={() => setModal("results")}>
          <CheckCircle2 size={14} />
          Kết quả · {Object.keys(actual).length}/{cases.length}
        </button>
        <span className="gl-replay-badge">
          JAVA STEP REPLAY · KHÔNG PHẢI JVM
        </span>
      </div>
      {error && (
        <p role="alert" className="gl-error">
          {error}
        </p>
      )}
      {run ? (
        <ProblemSession
          key={revision}
          run={run}
          display={display}
          onDisplay={updateDisplay}
          suspended={busy || !!modal || batchBusy}
          width={width}
          onWidth={setWidth}
          codeHeight={codeHeight}
          onHeight={setCodeHeight}
          onComplete={completed}
          onCell={(r, c) => change({ ...config, focus: [r, c], detail: false })}
          onDetail={(v) =>
            change({
              ...config,
              detail: v,
              focus: v ? null : (config.focus ?? [0, 0]),
            })
          }
          exitPresentation={() => updateDisplay({ presentation: false })}
        />
      ) : (
        <div className="gl-loading">Đang tạo snapshot Java…</div>
      )}
      {busy && run && (
        <div className="gl-busy" role="status">
          Đang tạo replay…
        </div>
      )}
      <div className="pl-global-status">
        <span>
          {PROBLEMS[config.problem].subtitle} · {METHODS[config.method].time} ·{" "}
          {METHODS[config.method].space}
        </span>
        <span>PDF: 7 test có input · 6 cách giải đã kiểm tra bằng Java</span>
      </div>
      {modal === "input" && (
        <ProblemInput
          config={config}
          onClose={() => setModal(null)}
          onApply={(input, expected) => {
            change(
              { ...config, input, expected, selected: 0, focus: null },
              true,
            );
            setModal(null);
          }}
        />
      )}
      {modal === "theory" && (
        <GridDialog
          title={`${PROBLEMS[config.problem].title} · Đề & cách giải`}
          onClose={() => setModal(null)}
        >
          <div className="gl-dialog-body pl-theory">
            <p>{PROBLEMS[config.problem].question}</p>
            <p>
              <b>Ràng buộc gốc:</b> {PROBLEMS[config.problem].constraints}
            </p>
            <pre>{PROBLEMS[config.problem].format}</pre>
            {PROBLEMS[config.problem].methods.map((m) => (
              <article key={m}>
                <h3>{METHODS[m].title}</h3>
                <p>{METHODS[m].idea}</p>
                <small>
                  {METHODS[m].time} thời gian · {METHODS[m].space}
                </small>
              </article>
            ))}
            <p>
              <b>Đọc debugger:</b> dòng đang sáng vừa được thực hiện hoặc đang
              gọi helper. Call Stack hiển thị frame còn sống. NextInt được thu
              gọn; solve được replay theo các điểm dừng đã ghi. Chọn ô để xem
              riêng từng lệnh; dữ liệu lớn tự dùng tổng quan. Bộ đếm là điểm
              thực thi được instrument, không phải số bytecode JVM. Thời gian
              báo cáo là thời gian chạy simulator JS, không bao gồm thời gian
              người dùng dừng hay animation.
            </p>
            {config.problem === "origami" && (
              <p>
                <b>Hình học và mảng:</b> animation lật các mặt giấy trước khi
                foldLeft cộng từng ô vào next. Giấy không đổi số in trên mặt;
                bảng next/result mới lưu tổng. Với cách ánh xạ/gom lớp, nút “Xem
                gấp hình học” là phần minh họa riêng, không thực thi thêm Java.
              </p>
            )}
            <p>
              <b>Nguồn:</b> de_bai_text.pdf, trang 1–2 (tô màu), trang 3–4
              (Origami). Đã nhập đủ 5 và 2 testcase có input. Các dòng output mở
              rộng không có input tương ứng nên không dùng để tuyên bố kiểm
              chứng. Phần giải thích và các cách giải là nội dung bổ sung của
              lab.
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/problems/de_bai_text.pdf`}
              target="_blank"
              rel="noreferrer"
            >
              Mở đề PDF gốc ↗
            </a>
          </div>
          <footer>
            <button className="gl-primary" onClick={() => setModal(null)}>
              Quay lại mô phỏng
            </button>
          </footer>
        </GridDialog>
      )}
      {modal === "results" && (
        <GridDialog
          title="Expected / Actual · kiểm tra cả bộ test"
          onClose={() => setModal(null)}
        >
          <div className="gl-dialog-body">
            <p>
              {cases.length} test ·{" "}
              {cases.reduce((a, t) => a + t.rows * t.cols, 0).toLocaleString()}{" "}
              ô input ·{" "}
              {expected.length
                ? "Expected được nhập từ đề / người dùng"
                : "Expected từ bộ giải độc lập"}
              . Actual chỉ có sau println hoặc nút chạy nhanh.
            </p>
            <div className="pl-report-scroll">
              <table className="pl-results" aria-label="Expected Actual">
                <thead>
                  <tr>
                    <th>Test / kích thước</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Check</th>
                    <th>Điểm thực thi</th>
                    <th>JS solve</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((t, i) => {
                    const e = expected[i] ?? oracle[i],
                      a = actual[i];
                    return (
                      <tr key={i}>
                        <td>
                          #{i + 1} · {t.rows}×{t.cols}
                          {config.problem === "origami"
                            ? ` / ${t.parts} dải`
                            : ""}
                        </td>
                        <td>
                          <code>{e}</code>
                        </td>
                        <td>
                          <code>{a?.text ?? "Chưa chạy"}</code>
                          <small>{a?.mode}</small>
                        </td>
                        <td
                          className={
                            a ? (a.text === e ? "pl-pass" : "pl-fail") : ""
                          }
                        >
                          {a ? (a.text === e ? "MATCH" : "MISMATCH") : "—"}
                        </td>
                        <td>{a?.operations.toLocaleString() ?? "—"}</td>
                        <td>{a ? `${a.ms.toFixed(2)} ms` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              Tổng{" "}
              {Object.values(actual)
                .reduce((n, a) => n + a.operations, 0)
                .toLocaleString()}{" "}
              điểm thực thi · JS{" "}
              {Object.values(actual)
                .reduce((n, a) => n + a.ms, 0)
                .toFixed(2)}{" "}
              ms · input int payload ≥{" "}
              {(
                cases.reduce((n, t) => n + t.rows * t.cols * 4, 0) / 1024
              ).toFixed(1)}{" "}
              KiB (không gồm overhead).
            </p>
            <p className="pl-metric-note">
              Điểm thực thi gồm các điểm dừng được ghi trong input, solve và
              output; helper tokenizer không mở rộng. Không phải benchmark Java
              hoặc phép đo heap JVM. Kiểm tra MATCH không tự thay Expected bằng
              Actual.
            </p>
            <p>
              Simulator đang dùng {METHODS[config.method].title}.{" "}
              {batchBusy
                ? "Đang chạy…"
                : Object.keys(actual).length === cases.length
                  ? "Đã chạy đủ bộ test."
                  : "Có thể chạy nhanh cả bộ hoặc debug từng test."}
            </p>
          </div>
          <footer>
            <button onClick={() => setModal(null)}>Về debugger</button>
            <button className="gl-primary" disabled={batchBusy} onClick={batch}>
              {batchBusy ? "Đang chạy…" : "Chạy cả bộ test"}
            </button>
          </footer>
        </GridDialog>
      )}
    </div>
  );
}
function ProblemInput({
  config,
  onApply,
  onClose,
}: {
  config: Config;
  onApply: (input: string, expected: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState(config.input),
    [expected, setExpected] = useState(config.expected),
    [error, setError] = useState("");
  return (
    <GridDialog title="Input / Expected · bài từ PDF" onClose={onClose}>
      <div className="gl-dialog-body">
        <p>
          <b>{PROBLEMS[config.problem].title}.</b>{" "}
          {PROBLEMS[config.problem].constraints}. Dòng đầu T; mỗi test lặp phần
          kích thước và ma trận, không lặp lại T.
        </p>
        <pre>{PROBLEMS[config.problem].format}</pre>
        <div className="pl-input-columns">
          <label>
            Input · tương đương System.in
            <textarea
              aria-label="Input bài PDF"
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
          <label>
            Expected · mỗi test một dòng
            <textarea
              aria-label="Expected bài PDF"
              spellCheck={false}
              value={expected}
              placeholder="#1 16"
              onChange={(e) => setExpected(e.target.value)}
            />
            <small>
              Để trống để dùng bộ giải độc lập. Java tải xuống đọc System.in; có
              thể truyền input.txt qua tham số khi chạy trên máy.
            </small>
          </label>
        </div>
        {error && (
          <p role="alert" className="gl-error">
            {error}
          </p>
        )}
        <p>
          Giới hạn lab: tối đa 100 test và 100.000 ô mỗi bộ. Mọi kích thước theo
          đề đều được hỗ trợ. Test lớn tự thu gọn trace; chọn một ô để mở từng
          lệnh.
        </p>
      </div>
      <footer>
        <button
          onClick={() => {
            setInput(SAMPLES[config.problem].input);
            setExpected(SAMPLES[config.problem].expected);
            setError("");
          }}
        >
          Nạp mẫu PDF
        </button>
        <button
          className="gl-primary"
          onClick={() => {
            try {
              const cases = parseProblemInput(input, config.problem);
              expectedLines(expected, cases.length);
              onApply(input, expected);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Áp dụng input
        </button>
      </footer>
    </GridDialog>
  );
}
function ProblemSession({
  run,
  display,
  onDisplay,
  suspended,
  width,
  onWidth,
  codeHeight,
  onHeight,
  onComplete,
  onCell,
  onDetail,
  exitPresentation,
}: {
  run: ProblemRun;
  display: GridDisplay;
  onDisplay: (p: Partial<GridDisplay>) => void;
  suspended: boolean;
  width: number;
  onWidth: (w: number) => void;
  codeHeight: number;
  onHeight: (h: number) => void;
  onComplete: (i: number, a: Actual) => void;
  onCell: (r: number, c: number) => void;
  onDetail: (v: boolean) => void;
  exitPresentation: () => void;
}) {
  const start = run.focus
    ? Math.max(
        0,
        run.steps.findIndex(
          (s) =>
            s.phase === "solve" &&
            s.current?.[0] === run.focus![0] &&
            s.current?.[1] === run.focus![1] &&
            s.detail,
        ),
      )
    : 0;
  const durations = useMemo(
    () =>
      run.steps.map((s, i) =>
        s.foldFrom !== null || run.steps[i + 1]?.foldFrom !== null ? 1500 : 360,
      ),
    [run],
  );
  const { state, act, epoch, duration, reduced } = usePlayback(
    run.steps.length,
    start,
    durations,
  );
  const step = run.steps[state.index],
    last = useRef(step);
  const previous = useMemo(() => {
    const p = last.current;
    last.current = step;
    return p;
  }, [step]);
  const [breakpoints, setBreakpoints] = useState<number[]>([]),
    [tab, setTab] = useState("visual"),
    [preview, setPreview] = useState<number | null>(null),
    [focusR, setFocusR] = useState(run.focus?.[0] ?? 0),
    [focusC, setFocusC] = useState(run.focus?.[1] ?? 0);
  const workspace = useRef<HTMLDivElement>(null),
    right = useRef<HTMLDivElement>(null),
    drag = useRef(false),
    heightDrag = useRef(false);
  useEffect(() => {
    if (suspended) act({ type: "pause" });
  }, [suspended, act]);
  useEffect(() => {
    setPreview(null);
  }, [state.index]);
  useEffect(() => {
    if (state.playing && breakpoints.includes(step.activeLines[0]))
      act({ type: "pause" });
  }, [state.index, state.playing, breakpoints, step.activeLines, act]);
  useEffect(() => {
    if (step.output)
      onComplete(run.caseIndex, {
        text: step.output,
        operations: run.operations,
        ms: run.generateMs,
        mode: "Debug replay (thời gian tạo trace)",
      });
  }, [step.output, onComplete, run]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        suspended ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target instanceof HTMLElement &&
          e.target.closest(
            "input,textarea,select,button,summary,[role=separator],[contenteditable=true]",
          ))
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        act({ type: "next" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        act({ type: "previous" });
      } else if (e.code === "Space") {
        e.preventDefault();
        act({ type: "toggle" });
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        act({ type: "restart" });
      } else if (e.key === "Escape") exitPresentation();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [suspended, act, exitPresentation]);
  const solved = step.marks.flat().filter((x) => x >= 2).length;
  const status = state.animating
    ? "animating"
    : state.index === run.steps.length - 1
      ? "completed"
      : state.playing
        ? "playing"
        : "paused";
  const paperRead = useMemo(
    () => (run.problem === "origami" ? paperActivity(run, step) : null),
    [run, step],
  );
  const baseFont = Math.round((15 * display.scale) / 100);
  const sourceFont = bound(baseFont + display.codeOffset, 13, 30);
  const readingCurrent =
    run.problem === "origami" && step.marker === "rightValue" && step.target;
  const readingResult =
    run.problem === "origami" &&
    ["maxCol", "best"].includes(step.marker) &&
    step.target;
  const sourceLabel = readingCurrent
    ? "Đọc current"
    : readingResult
      ? "Đọc result"
      : "Ô nguồn";
  const sourcePoint = readingCurrent
    ? [step.target![0], run.test.cols / run.test.parts - 1 - step.target![1]]
    : readingResult
      ? step.target
      : step.current;
  const line = run.code.text.split("\n")[step.activeLines[0] - 1]?.trim();
  const formula = step.neighbors
    .map(
      (n, i) =>
        `${step.signs[i] === 1 ? "+" : step.signs[i] === -1 ? "−" : "?"}(${n.value})`,
    )
    .join(" ");
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="pl-session"
        data-step-marker={step.marker}
        data-playback-status={status}
      >
        <div className="pl-session-summary">
          <span>
            <b>{METHODS[run.method].title}</b> ·{" "}
            {run.detailed
              ? "Từng lệnh"
              : run.focus
                ? `Chi tiết ô [${run.focus.join(", ")}] + tổng quan`
                : "Tổng quan theo ô"}
          </span>
          <label className="pl-detail-choice">
            <input
              type="checkbox"
              checked={run.detailed}
              disabled={run.test.rows * run.test.cols > 144}
              onChange={(e) => onDetail(e.target.checked)}
            />{" "}
            Từng lệnh toàn bộ
          </label>
          <span>
            {run.operations.toLocaleString()} điểm thực thi ·{" "}
            {run.steps.length.toLocaleString()} snapshot
          </span>
        </div>
        <nav className="pl-mobile-tabs" aria-label="Panel bài tập">
          {[
            ["visual", "Mô phỏng"],
            ["code", "Java"],
            ["watch", "Variables"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className={`pl-workspace pl-tab-${tab}`} ref={workspace}>
          <div className="pl-left">
            <section className="pl-visual gl-panel">
              {run.problem === "origami" ? (
                <PaperBoard
                  key={epoch}
                  run={run}
                  step={step}
                  activity={paperRead}
                  previousFolded={previous.folded}
                  animating={state.animating}
                  duration={reduced ? 0 : preview !== null ? 1.5 : duration}
                  epoch={epoch}
                  preview={preview}
                  onPreview={(v) => {
                    if (state.playing || state.animating)
                      act({ type: "pause" });
                    setPreview(v);
                  }}
                />
              ) : (
                <ColorBoard
                  run={run}
                  step={step}
                  onCell={(r, c) => {
                    act({ type: "pause" });
                    onCell(r, c);
                  }}
                />
              )}
              <div className="pl-logic" aria-live="polite">
                <div className="pl-logic-title">
                  <span className="gl-live-dot" />
                  <b data-testid="problem-step-title">{step.title}</b>
                  <small>
                    L{step.activeLines[0]} · {status}
                  </small>
                </div>
                {paperRead ? (
                  <PaperReading activity={paperRead} test={run.test} />
                ) : (
                  <p>{step.explanation}</p>
                )}
                <code>{line}</code>
              </div>
            </section>
            <div className="pl-memory-row">
              <section className="gl-panel pl-temp">
                <div className="gl-panel-title">
                  <Layers3 size={14} />
                  <b>
                    {run.problem === "origami"
                      ? "Ma trận tạm · next / result"
                      : "Bộ nhớ tạm · values / dấu"}
                  </b>
                  <span>Đồng bộ L{step.activeLines[0]}</span>
                </div>
                {run.problem === "origami" ? (
                  <NumberMatrix
                    values={step.results}
                    active={step.target}
                    label="Ma trận tổng chồng lớp"
                  />
                ) : (
                  <div className="pl-sign-memory">
                    <div className="pl-values-strip">
                      {step.neighbors.length ? (
                        step.neighbors.map((n, i) => (
                          <div
                            className={step.signs[i] ? "pl-signed" : ""}
                            key={`${n.r}-${n.c}`}
                          >
                            <small>values[{i}]</small>
                            <strong>{n.value}</strong>
                            <b>
                              {step.signs[i] === 1
                                ? "+"
                                : step.signs[i] === -1
                                  ? "−"
                                  : "?"}
                            </b>
                          </div>
                        ))
                      ) : (
                        <p>Đang chờ thu thập các ô kề.</p>
                      )}
                    </div>
                    <div className="pl-expression">
                      <code>{formula || "…"}</code>
                      <span>
                        {run.method === "subset" ? "sum nhóm +" : "sum"} ={" "}
                        <b>{step.sum ?? "—"}</b>
                      </span>
                    </div>
                    {run.method === "dfs" && (
                      <div
                        className="pl-call-stack"
                        aria-label="Call Stack đệ quy"
                      >
                        {step.callStack.map((f, i) => (
                          <span
                            key={i}
                            className={i === 0 ? "pl-active-frame" : ""}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
              <section className="gl-panel pl-current-panel">
                <div className="gl-panel-title">
                  <b>Current & Result</b>
                  <span>Test #{run.caseIndex + 1}</span>
                </div>
                <div className="pl-current-body">
                  <div>
                    <small>{sourceLabel}</small>
                    <strong data-testid="paper-source-pointer">
                      {sourcePoint ? `[${sourcePoint.join(", ")}]` : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>
                      {run.problem === "origami" ? "Ô đích" : "Giá trị đích"}
                    </small>
                    <strong>
                      {run.problem === "origami"
                        ? step.target
                          ? `[${step.target.join(", ")}]`
                          : "—"
                        : step.current
                          ? run.test.cells[step.current[0]][step.current[1]]
                          : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>
                      {run.problem === "origami" ? "best" : "count"}
                    </small>
                    <strong data-testid="problem-answer">{step.answer}</strong>
                  </div>
                  <div>
                    <small>
                      {run.problem === "coloring" ? "Ô đã xét" : "Lớp đã gấp"}
                    </small>
                    <strong>
                      {run.problem === "coloring"
                        ? `${solved}/${run.test.rows * run.test.cols}`
                        : `${step.folded + 1}/${run.test.parts}`}
                    </strong>
                  </div>
                </div>
                <div className="pl-output-line">
                  <small>Console Output</small>
                  <code data-testid="problem-output">
                    {step.output ?? "Chưa println"}
                  </code>
                </div>
                <div className="pl-focus-input">
                  <label>
                    r
                    <input
                      aria-label="Hàng cần phân tích"
                      type="number"
                      min="0"
                      max={run.test.rows - 1}
                      value={focusR}
                      onChange={(e) =>
                        setFocusR(
                          bound(Number(e.target.value), 0, run.test.rows - 1),
                        )
                      }
                    />
                  </label>
                  <label>
                    c
                    <input
                      aria-label="Cột cần phân tích"
                      type="number"
                      min="0"
                      max={run.test.cols - 1}
                      value={focusC}
                      onChange={(e) =>
                        setFocusC(
                          bound(Number(e.target.value), 0, run.test.cols - 1),
                        )
                      }
                    />
                  </label>
                  <button onClick={() => onCell(focusR, focusC)}>
                    Phân tích ô
                  </button>
                </div>
              </section>
            </div>
          </div>
          <div
            className="pl-width-handle"
            role="separator"
            aria-label="Đổi chiều rộng source code"
            aria-orientation="vertical"
            tabIndex={0}
            aria-valuenow={Math.round(width)}
            aria-valuemin={28}
            aria-valuemax={70}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                onWidth(
                  bound(width + (e.key === "ArrowLeft" ? 2 : -2), 28, 70),
                );
              }
            }}
            onPointerDown={(e) => {
              drag.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              act({ type: "pause" });
            }}
            onPointerMove={(e) => {
              if (drag.current && workspace.current) {
                const b = workspace.current.getBoundingClientRect();
                onWidth(bound(((b.right - e.clientX) / b.width) * 100, 28, 70));
              }
            }}
            onPointerUp={() => {
              drag.current = false;
            }}
            onLostPointerCapture={() => {
              drag.current = false;
            }}
          />
          <div className="pl-right" ref={right}>
            <CodeEditor
              code={run.code}
              step={step}
              status={status}
              breakpoints={breakpoints}
              onBreakpoint={(line) =>
                setBreakpoints((b) =>
                  b.includes(line) ? b.filter((x) => x !== line) : [...b, line],
                )
              }
              fileName="Main.java"
              methodName={step.callStack[0]}
              viewKey={`${display.scale}-${display.codeOffset}-${width}-${codeHeight}-${display.wrapCode}-${tab}`}
              displayControls={
                <>
                  <button
                    aria-label="Giảm chữ Java"
                    disabled={sourceFont <= 13}
                    onClick={() =>
                      onDisplay({
                        codeOffset: sourceFont - 1 - baseFont,
                      })
                    }
                  >
                    A−
                  </button>
                  <button
                    aria-label="Tăng chữ Java"
                    disabled={sourceFont >= 30}
                    onClick={() =>
                      onDisplay({
                        codeOffset: sourceFont + 1 - baseFont,
                      })
                    }
                  >
                    A+
                  </button>
                  <button
                    aria-label="Ngắt dòng Java"
                    aria-pressed={display.wrapCode}
                    onClick={() => onDisplay({ wrapCode: !display.wrapCode })}
                  >
                    <WrapText size={14} />
                  </button>
                  <button
                    aria-label="Mở rộng Java"
                    onClick={() => onWidth(width < 55 ? 62 : 43)}
                  >
                    ↔
                  </button>
                </>
              }
            />
            <div
              className="pl-height-handle"
              role="separator"
              aria-label="Đổi chiều cao source code"
              aria-orientation="horizontal"
              tabIndex={0}
              aria-valuenow={Math.round(codeHeight)}
              aria-valuemin={40}
              aria-valuemax={85}
              onKeyDown={(e) => {
                if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                  e.preventDefault();
                  onHeight(
                    bound(
                      codeHeight + (e.key === "ArrowDown" ? 2 : -2),
                      40,
                      85,
                    ),
                  );
                }
              }}
              onPointerDown={(e) => {
                heightDrag.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (heightDrag.current && right.current) {
                  const b = right.current.getBoundingClientRect();
                  onHeight(
                    bound(((e.clientY - b.top) / b.height) * 100, 40, 85),
                  );
                }
              }}
              onPointerUp={() => {
                heightDrag.current = false;
              }}
              onLostPointerCapture={() => {
                heightDrag.current = false;
              }}
            />
            <div className="pl-watch-container">
              <GridWatch step={step} previous={previous} />
              <div className="pl-stack-caption">
                Call Stack: {step.callStack.join(" ← ")}
              </div>
            </div>
          </div>
        </div>
        <footer className="pl-playback">
          <button
            aria-label="Restart bài PDF"
            onClick={() => act({ type: "restart" })}
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Previous bài PDF"
            disabled={state.index === 0 || state.animating}
            onClick={() => act({ type: "previous" })}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="gl-primary"
            aria-label={state.playing ? "Pause bài PDF" : "Play bài PDF"}
            disabled={state.index === run.steps.length - 1}
            onClick={() => act({ type: "toggle" })}
          >
            {state.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            aria-label="Next bài PDF"
            disabled={state.animating || state.index === run.steps.length - 1}
            onClick={() => act({ type: "next" })}
          >
            <ArrowRight size={16} />
          </button>
          <select
            aria-label="Tốc độ bài PDF"
            value={state.speed}
            onChange={(e) =>
              act({ type: "speed", speed: Number(e.target.value) })
            }
          >
            {[0.5, 1, 1.5, 2, 4].map((x) => (
              <option key={x} value={x}>
                {x}×
              </option>
            ))}
          </select>
          <input
            aria-label="Timeline bài PDF"
            type="range"
            min="0"
            max={run.steps.length - 1}
            value={state.index}
            onChange={(e) =>
              act({ type: "seek", index: Number(e.target.value) })
            }
          />
          <output data-testid="problem-step-count">
            {state.index + 1} / {run.steps.length}
          </output>
          <button
            onClick={() => {
              act({ type: "seek", index: run.steps.length - 1 });
            }}
          >
            Kết quả ↗
          </button>
        </footer>
        <div className="pl-telemetry">
          <span>
            Đã chạy {step.tick.toLocaleString()} /{" "}
            {run.operations.toLocaleString()} điểm thực thi
          </span>
          <span>
            Input {run.test.rows * run.test.cols} số · payload int[] ≥{" "}
            {(
              (run.test.rows * run.test.cols * 4 +
                step.results.length * step.results[0].length * 4) /
              1024
            ).toFixed(1)}{" "}
            KiB
          </span>
          <span>
            Tạo trace JS {run.generateMs.toFixed(1)} ms ·{" "}
            {state.animating ? "đang chuyển động" : status}
          </span>
        </div>
      </div>
    </MotionConfig>
  );
}
