"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Columns2,
  FileInput,
  Grid2X2,
  Maximize2,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sun,
  WrapText,
} from "lucide-react";
import { generateGridRun } from "@/grid/replay";
import {
  gridExample,
  parseExpected,
  parseGridInput,
  serializeGridInput,
} from "@/grid/input";
import {
  ALGORITHMS,
  PROBLEMS,
  type GridAlgorithm,
  type GridProblem,
  type GridRun,
} from "@/grid/types";
import { usePlayback } from "@/hooks/use-playback";
import { CodeEditor } from "../CodeEditor";
import { GridBoard } from "./GridBoard";
import {
  GridExplanation,
  GridMemoryPanel,
  GridResults,
  GridWatch,
  GridResultState,
} from "./GridPanels";
import {
  GridDisplayControls,
  DEFAULT_DISPLAY,
  readDisplay,
  bound,
  type GridDisplay,
} from "./GridDisplayControls";
import {
  GridDialog,
  InputDialog,
  MapDialog,
  TheoryDialog,
} from "./GridDialogs";
type Config = {
  problem: GridProblem;
  algorithm: GridAlgorithm;
  input: string;
  expected: string;
  file?: string;
};
type Modal = "input" | "map" | "theory" | null;
export default function GridLab() {
  const [config, setConfig] = useState<Config>(() => ({
    problem: "collect",
    algorithm: "row",
    input: serializeGridInput(gridExample("collect"), "collect"),
    expected: "",
  }));
  const [run, setRun] = useState<GridRun | null>(null),
    [busy, setBusy] = useState(true),
    [revision, setRevision] = useState(0),
    [modal, setModal] = useState<Modal>(null),
    [dark, setDark] = useState(false),
    [error, setError] = useState(""),
    [codeWidth, setCodeWidth] = useState(42),
    [codeHeight, setCodeHeight] = useState(70),
    [display, setDisplay] = useState<GridDisplay>(DEFAULT_DISPLAY),
    [displayReady, setDisplayReady] = useState(false);
  useEffect(() => {
    try {
      setDark(localStorage.getItem("structure-theme") === "dark");
      const raw = localStorage.getItem("grid-display-v1");
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        setDisplay(readDisplay(saved));
        if (typeof saved === "object" && saved !== null) {
          const sizes = saved as Record<string, unknown>;
          if (
            typeof sizes.codeWidth === "number" &&
            Number.isFinite(sizes.codeWidth)
          )
            setCodeWidth(bound(sizes.codeWidth, 26, 72));
          if (
            typeof sizes.codeHeight === "number" &&
            Number.isFinite(sizes.codeHeight)
          )
            setCodeHeight(bound(sizes.codeHeight, 32, 88));
        }
      }
    } catch {}
    setDisplayReady(true);
  }, []);
  useEffect(() => {
    if (displayReady) {
      try {
        localStorage.setItem(
          "grid-display-v1",
          JSON.stringify({ ...display, codeWidth, codeHeight }),
        );
      } catch {}
    }
  }, [display, codeWidth, codeHeight, displayReady]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    setBusy(true);
    const id = requestAnimationFrame(() => {
      try {
        const cases = parseGridInput(config.input, config.problem);
        setRun(
          generateGridRun(
            config.input,
            config.problem,
            config.algorithm,
            parseExpected(config.expected, cases.length),
            config.file,
          ),
        );
        setRevision((n) => n + 1);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [config]);
  const changeDisplay = useCallback(
    (patch: Partial<GridDisplay>) =>
      setDisplay((previous) => ({ ...previous, ...patch })),
    [],
  );
  function preset(mode: "compact" | "classroom" | "projector") {
    setDisplay({
      ...DEFAULT_DISPLAY,
      scale: mode === "projector" ? 140 : mode === "classroom" ? 125 : 100,
      memoryShare: mode === "projector" ? 38 : 31,
      presentation: mode === "projector",
      wrapCode: mode !== "compact",
    });
    setCodeWidth(mode === "compact" ? 42 : 46);
    setCodeHeight(mode === "compact" ? 70 : 76);
  }
  function commit(next: Config) {
    setBusy(true);
    setModal(null);
    setConfig(next);
  }
  return (
    <div
      className={`grid-lab ${display.presentation ? "gl-presenting" : ""} ${display.wrapCode ? "gl-code-wrapping" : ""}`}
      aria-busy={busy}
      data-ready={!!run && !busy}
      style={
        {
          "--gl-scale": display.scale / 100,
          "--gl-code-font": `${bound(Math.round((15 * display.scale) / 100) + display.codeOffset, 13, 30)}px`,
          "--gl-grid-font": `${bound((17 * display.scale) / 100, 15, 25)}px`,
          "--gl-axis-font": `${bound((12 * display.scale) / 100, 11, 17)}px`,
          "--gl-memory-font": `${bound((12 * display.scale) / 100, 11, 19)}px`,
          "--gl-memory-share": `${display.memoryShare}%`,
          "--gl-grid-zoom": display.gridZoom / 100,
        } as CSSProperties
      }
    >
      <header className="gl-header">
        <Link href="/" prefetch={false} aria-label="Về Structure Lab">
          <ArrowLeft size={14} />
          <span>Structure Lab</span>
        </Link>
        <span className="gl-header-divider" />
        <strong>
          <Grid2X2 size={17} /> GRID LAB
        </strong>
        <Link href="/problems/" prefetch={false}>Tô màu & Origami ↗</Link>
        <GridDisplayControls
          display={display}
          onChange={changeDisplay}
          onPreset={preset}
        />
        <div className="gl-header-actions">
          <button
            onClick={() => setModal("theory")}
            title="Khái niệm & cách đọc mô phỏng"
          >
            <BookOpen size={15} />
            <span>Hướng dẫn</span>
          </button>
          <button
            aria-label={dark ? "Light theme" : "Dark theme"}
            onClick={() =>
              setDark((d) => {
                try {
                  localStorage.setItem("structure-theme", d ? "light" : "dark");
                } catch {}
                return !d;
              })
            }
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <div className="gl-toolbar">
        <label>
          Bài toán
          <select
            aria-label="Bài toán Grid"
            disabled={busy}
            value={config.problem}
            onChange={(e) => {
              const problem = e.target.value as GridProblem;
              commit({
                problem,
                algorithm: PROBLEMS[problem].algorithms[0],
                input: serializeGridInput(gridExample(problem), problem),
                expected: "",
              });
            }}
          >
            {Object.entries(PROBLEMS).map(([id, p]) => (
              <option value={id} key={id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cách duyệt
          <select
            aria-label="Cách duyệt Grid"
            disabled={busy}
            value={config.algorithm}
            onChange={(e) =>
              commit({
                ...config,
                algorithm: e.target.value as GridAlgorithm,
                expected: "",
              })
            }
          >
            {PROBLEMS[config.problem].algorithms.map((id) => (
              <option key={id} value={id}>
                {ALGORITHMS[id]}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setModal("input")} disabled={!run || busy}>
          <FileInput size={14} />
          <span>Input / Expected</span>
        </button>
        <button onClick={() => setModal("map")} disabled={!run || busy}>
          <Grid2X2 size={14} />
          <span>Chỉnh bản đồ</span>
        </button>
        <span className="gl-replay-badge">STEP REPLAY · KHÔNG PHẢI JVM</span>
      </div>
      {error && (
        <div className="gl-error" role="alert">
          {error}
        </div>
      )}
      {run ? (
        <GridSession
          key={revision}
          run={run}
          display={display}
          onDisplayChange={changeDisplay}
          codeWidth={codeWidth}
          codeHeight={codeHeight}
          setCodeWidth={setCodeWidth}
          setCodeHeight={setCodeHeight}
          expectedManual={!!config.expected.trim()}
          suspended={!!modal || busy}
        />
      ) : (
        <div className="gl-loading">Đang tạo các snapshot Java…</div>
      )}
      {busy && run && (
        <div className="gl-busy" role="status">
          Đang tạo replay mới…
        </div>
      )}
      {modal === "input" && (
        <InputDialog
          input={config.input}
          expected={config.expected}
          problem={config.problem}
          onClose={() => setModal(null)}
          onApply={(input, expected, file) =>
            commit({ ...config, input, expected, file })
          }
        />
      )}
      {modal === "map" && run && (
        <MapDialog
          cases={run.cases}
          problem={config.problem}
          onClose={() => setModal(null)}
          onApply={(input) =>
            commit({ ...config, input, expected: "", file: undefined })
          }
        />
      )}
      {modal === "theory" && <TheoryDialog onClose={() => setModal(null)} />}
    </div>
  );
}
function GridSession({
  run,
  expectedManual,
  suspended,
  codeWidth,
  codeHeight,
  display,
  onDisplayChange,
  setCodeWidth,
  setCodeHeight,
}: {
  run: GridRun;
  display: GridDisplay;
  onDisplayChange: (patch: Partial<GridDisplay>) => void;
  expectedManual: boolean;
  suspended: boolean;
  codeWidth: number;
  codeHeight: number;
  setCodeWidth: Dispatch<SetStateAction<number>>;
  setCodeHeight: Dispatch<SetStateAction<number>>;
}) {
  const { state, act, epoch, duration } = usePlayback(run.steps.length),
    step = run.steps[state.index],
    previous = run.steps[Math.max(0, state.index - 1)];
  const [tab, setTab] = useState("step"),
    [breakpoints, setBreakpoints] = useState<readonly number[]>([]),
    [viewTime, setViewTime] = useState(0),
    [focusCode, setFocusCode] = useState(false),
    [reportOpen, setReportOpen] = useState(false);
  const blocked = suspended || reportOpen;
  const codeBase = Math.round((15 * display.scale) / 100);
  const codeSize = bound(codeBase + display.codeOffset, 13, 30);
  const workspace = useRef<HTMLDivElement>(null),
    rightPane = useRef<HTMLDivElement>(null),
    lastBreakpoint = useRef(-1);
  const seek = useCallback(
    (index: number) => {
      if (index >= 0) act({ type: "seek", index });
    },
    [act],
  );
  useEffect(() => {
    if (blocked) act({ type: "pause" });
  }, [blocked, act]);
  useEffect(() => {
    if (!state.playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      setViewTime((value) => value + elapsed);
    }, 1000);
    return () => {
      clearInterval(id);
      const elapsed = performance.now() - last;
      setViewTime((value) => value + elapsed);
    };
  }, [state.playing]);
  useEffect(() => {
    if (!state.playing && state.index !== lastBreakpoint.current)
      lastBreakpoint.current = -1;
    if (
      state.playing &&
      state.index !== lastBreakpoint.current &&
      step.activeLines.some((line) => breakpoints.includes(line))
    ) {
      lastBreakpoint.current = state.index;
      act({ type: "pause" });
    }
  }, [step, state.index, state.playing, breakpoints, act]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !blocked) {
        setFocusCode(false);
        if (display.presentation) onDisplayChange({ presentation: false });
        return;
      }
      if (
        blocked ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target as HTMLElement).closest(
          "input,textarea,select,button,a,summary,[contenteditable=true],[role=separator]",
        )
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        act({ type: "next" });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        act({ type: "previous" });
      } else if (event.code === "Space") {
        event.preventDefault();
        act({ type: "toggle" });
      } else if (event.key.toLowerCase() === "r") act({ type: "restart" });
      else if (event.key === "Escape") {
        setFocusCode(false);
        if (display.presentation) onDisplayChange({ presentation: false });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [act, blocked, display.presentation, onDisplayChange]);
  const testIndex = Math.max(0, step.caseIndex),
    test = run.cases[testIndex],
    status = state.playing
      ? "playing"
      : state.animating
        ? "animating"
        : state.index === run.steps.length - 1
          ? "completed"
          : "paused";
  const dragCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanup.current?.(), []);
  function drag(
    event: ReactPointerEvent<HTMLDivElement>,
    axis: "width" | "height",
  ) {
    dragCleanup.current?.();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = event.currentTarget,
      container = axis === "width" ? workspace.current : rightPane.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      if (axis === "width")
        setCodeWidth(
          Math.max(
            26,
            Math.min(72, (100 * (bounds.right - e.clientX)) / bounds.width),
          ),
        );
      else
        setCodeHeight(
          Math.max(
            32,
            Math.min(88, (100 * (e.clientY - bounds.top)) / bounds.height),
          ),
        );
    };
    const end = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointercancel", end);
    };
    dragCleanup.current = end;
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
  }
  const nodeWindows = useMemo(() => {
    const windows: (readonly [number, number] | null)[] = Array(
      run.steps.length,
    ).fill(null);
    const key = (index: number) => {
      const item = run.steps[index];
      return item.current &&
        item.memory.privateActive &&
        item.phase !== "input" &&
        item.phase !== "trace"
        ? `${item.caseIndex}/${item.current.r}/${item.current.c}`
        : null;
    };
    for (let i = 0; i < run.steps.length;) {
      const cell = key(i);
      if (cell === null) {
        i++;
        continue;
      }
      let end = i + 1;
      while (end < run.steps.length && key(end) === cell) end++;
      const window = [i, end - 1] as const;
      for (let j = i; j < end; j++) windows[j] = window;
      i = end;
    }
    return windows;
  }, [run]);
  const nodeWindow = nodeWindows[state.index];
  const nodeProgress = nodeWindow
    ? {
        index: state.index - nodeWindow[0] + 1,
        total: nodeWindow[1] - nodeWindow[0] + 1,
      }
    : undefined;
  const mobileTabs = [
    ["step", "Bước"],
    ["code", "Code"],
    ["watch", "Biến"],
    ["memory", "Bộ nhớ"],
    ["output", "Output"],
  ];
  const skipAlgorithm = () =>
    seek(
      run.steps.findIndex(
        (s) => s.caseIndex === testIndex && s.marker === "solveCall",
      ),
    );
  const nextCell = () => {
    const index = run.steps.findIndex(
      (s, i) =>
        i > state.index &&
        s.caseIndex === testIndex &&
        ["readCell", "currentC", "value"].includes(s.marker),
    );
    if (index >= 0) seek(index);
    else
      seek(
        run.steps.findIndex(
          (s, i) =>
            i > state.index &&
            s.caseIndex === testIndex &&
            s.marker === "print",
        ),
      );
  };
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        duration: state.animating ? duration : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className={`gl-session ${focusCode ? "gl-code-focus" : ""}`}
        data-mobile-tab={tab}
        data-playback-status={status}
        data-step-marker={step.marker}
      >
        <div className="gl-run-bar">
          <span className={`gl-status ${status}`}>{status}</span>
          <select
            aria-label="Test đang xem"
            value={testIndex}
            onChange={(e) =>
              seek(
                run.steps.findIndex(
                  (s) =>
                    s.caseIndex === Number(e.target.value) &&
                    s.marker === "caseCheck",
                ),
              )
            }
          >
            {run.cases.map((c, i) => (
              <option key={i} value={i}>
                Test #{i + 1} · {c.rows}×{c.cols}
              </option>
            ))}
          </select>
          <span className="gl-step-title">{step.title}</span>
          <button
            onClick={skipAlgorithm}
            title="Tua qua phần đọc input, tới solve"
          >
            Vào thuật toán
          </button>
          <button onClick={nextCell}>Ô kế</button>
          <button
            onClick={() => {
              setCodeWidth(codeWidth < 55 ? 62 : 42);
              setFocusCode(false);
            }}
            title="Đổi độ rộng code"
          >
            <Columns2 size={13} />
            <span>Code rộng</span>
          </button>
          <button
            onClick={() => setFocusCode((v) => !v)}
            aria-label="Phóng to code"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        <div
          className="gl-workspace"
          ref={workspace}
          style={
            {
              "--gl-code-width": `${codeWidth}%`,
              "--gl-code-height": `${codeHeight}%`,
            } as CSSProperties
          }
        >
          <div className="gl-left">
            <section className="gl-stage gl-panel">
              <div className="gl-board-area">
                <div className="gl-board-heading">
                  <strong title={PROBLEMS[run.problem].question}>
                    {PROBLEMS[run.problem].title}
                  </strong>
                  <span>
                    {test.rows} × {test.cols} · 0-based
                  </span>
                </div>
                <div className="gl-grid-size-buttons">
                  <button
                    aria-label="Thu nhỏ grid"
                    disabled={display.gridZoom <= 100}
                    onClick={() =>
                      onDisplayChange({
                        gridZoom: Math.max(100, display.gridZoom - 25),
                      })
                    }
                  >
                    −
                  </button>
                  <button
                    aria-label="Grid vừa khung"
                    onClick={() => onDisplayChange({ gridZoom: 100 })}
                  >
                    {display.gridZoom === 100
                      ? "Vừa khung"
                      : `${display.gridZoom}%`}
                  </button>
                  <button
                    aria-label="Phóng to grid"
                    disabled={display.gridZoom >= 200}
                    onClick={() =>
                      onDisplayChange({
                        gridZoom: Math.min(200, display.gridZoom + 25),
                      })
                    }
                  >
                    +
                  </button>
                </div>
                <p className="gl-problem-statement">
                  {PROBLEMS[run.problem].question}
                </p>
                <div
                  className={`gl-board-canvas ${display.gridZoom > 100 ? "gl-grid-zoomed" : ""}`}
                  key={`board-${epoch}`}
                >
                  <div className="gl-grid-surface">
                    <GridBoard test={test} problem={run.problem} step={step} />
                  </div>
                </div>
                <div className="gl-legend">
                  {[
                    ["unseen", "Chưa duyệt"],
                    ["queued", "Đang chờ"],
                    ["current", "Hiện tại"],
                    ["done", "Đã xong"],
                    ["path", "Đường đi"],
                    ["skipped", "Còn lại lúc dừng"],
                  ].map(([id, label]) => (
                    <span key={id}>
                      <i className={id} />
                      {label}
                    </span>
                  ))}
                </div>
                <div className="gl-terrain-legend">
                  {PROBLEMS[run.problem].legend}
                </div>
              </div>
              <div className="gl-stage-inspector">
                <GridExplanation
                  step={step}
                  run={run}
                  nodeProgress={nodeProgress}
                />
              </div>
            </section>
            <div
              className="gl-mobile-tabs"
              role="tablist"
              aria-label="Grid debugger panels"
            >
              {mobileTabs.map(([id, label]) => (
                <button
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`gl-tab-${id}`}
                  key={id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="gl-mobile-explanation" id="gl-tab-step">
              <GridExplanation
                step={step}
                run={run}
                nodeProgress={nodeProgress}
              />
            </div>
            <div className="gl-memory-slot" id="gl-tab-memory">
              <GridMemoryPanel
                step={step}
                previous={previous}
                run={run}
                onResize={(delta) =>
                  onDisplayChange({
                    memoryShare: bound(display.memoryShare + delta, 20, 45),
                  })
                }
                memoryShare={display.memoryShare}
              />
            </div>
            <div className="gl-results-slot" id="gl-tab-output">
              <div className="gl-results-summary">
                <GridResultState step={step} run={run} compact />
                <span>
                  {step.outputs.length}/{run.cases.length} test đã in
                </span>
                <button onClick={() => setReportOpen(true)}>
                  Output / Thống kê ↗
                </button>
              </div>
              {reportOpen ? (
                <GridDialog
                  title="Output / Thống kê"
                  onClose={() => setReportOpen(false)}
                >
                  <div className="gl-report-body">
                    <GridResults
                      step={step}
                      run={run}
                      onSeek={(index) => {
                        seek(index);
                        setReportOpen(false);
                      }}
                      expectedManual={expectedManual}
                      viewTimeMs={viewTime}
                    />
                  </div>
                </GridDialog>
              ) : (
                <div className="gl-results-detail">
                  <GridResults
                    step={step}
                    run={run}
                    onSeek={seek}
                    expectedManual={expectedManual}
                    viewTimeMs={viewTime}
                  />
                </div>
              )}
            </div>
          </div>
          <div
            className="gl-resize gl-resize-width"
            role="separator"
            tabIndex={0}
            aria-label="Điều chỉnh chiều rộng code"
            aria-orientation="vertical"
            aria-valuemin={26}
            aria-valuemax={72}
            aria-valuenow={Math.round(codeWidth)}
            onPointerDown={(e) => drag(e, "width")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setCodeWidth((v) =>
                  Math.max(
                    26,
                    Math.min(72, v + (e.key === "ArrowLeft" ? 2 : -2)),
                  ),
                );
              }
            }}
          >
            <span />
          </div>
          <div className="gl-right" ref={rightPane}>
            <div className="gl-code-slot" id="gl-tab-code">
              <CodeEditor
                methodName={step.callStack[0]}
                fileName="Main.java"
                displayControls={
                  <div className="gl-code-font-controls">
                    <button
                      aria-label="Giảm chữ code"
                      disabled={codeSize <= 13}
                      onClick={() =>
                        onDisplayChange({ codeOffset: codeSize - 1 - codeBase })
                      }
                    >
                      A−
                    </button>
                    <button
                      aria-label="Ngắt dòng code"
                      title="Ngắt dòng dài khi trình chiếu"
                      aria-pressed={display.wrapCode}
                      onClick={() =>
                        onDisplayChange({ wrapCode: !display.wrapCode })
                      }
                    >
                      <WrapText size={13} />
                    </button>
                    <output aria-label="Cỡ chữ code">
                      {bound(
                        Math.round((15 * display.scale) / 100) +
                          display.codeOffset,
                        13,
                        30,
                      )}
                      px
                    </output>
                    <button
                      aria-label="Tăng chữ code"
                      disabled={codeSize >= 30}
                      onClick={() =>
                        onDisplayChange({ codeOffset: codeSize + 1 - codeBase })
                      }
                    >
                      A+
                    </button>
                  </div>
                }
                code={run.code}
                step={step}
                status={status}
                breakpoints={breakpoints}
                viewKey={`${tab}-${display.scale}-${display.codeOffset}-${codeHeight}-${codeWidth}-${display.wrapCode}`}
                onBreakpoint={(line) =>
                  setBreakpoints((list) =>
                    list.includes(line)
                      ? list.filter((v) => v !== line)
                      : [...list, line],
                  )
                }
              />
            </div>
            <div
              className="gl-resize gl-resize-height"
              role="separator"
              tabIndex={0}
              aria-label="Điều chỉnh chiều cao code"
              aria-orientation="horizontal"
              aria-valuemin={32}
              aria-valuemax={88}
              aria-valuenow={Math.round(codeHeight)}
              onPointerDown={(e) => drag(e, "height")}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setCodeHeight((v) =>
                    Math.max(
                      32,
                      Math.min(88, v + (e.key === "ArrowDown" ? 3 : -3)),
                    ),
                  );
                }
              }}
            >
              <span />
            </div>
            <div className="gl-watch-slot" id="gl-tab-watch">
              <GridWatch step={step} previous={previous} />
            </div>
          </div>
        </div>
        <footer className="gl-playback">
          <div className="gl-playback-buttons">
            <button
              onClick={() => act({ type: "restart" })}
              aria-label="Restart Grid"
              title="R · Restart"
            >
              <RotateCcw size={15} />
            </button>
            <button
              disabled={state.index === 0 || state.animating || blocked}
              onClick={() => act({ type: "previous" })}
              aria-label="Previous Grid step"
              title="←"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="gl-primary gl-play-button"
              disabled={blocked || state.index === run.steps.length - 1}
              onClick={() => act({ type: "toggle" })}
              aria-label={state.playing ? "Pause Grid" : "Play Grid"}
            >
              {state.playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              disabled={
                state.index === run.steps.length - 1 ||
                state.animating ||
                blocked
              }
              onClick={() => act({ type: "next" })}
              aria-label="Next Grid step"
              title="→"
            >
              <ArrowRight size={17} />
            </button>
            <button
              onClick={() => seek(run.steps.length - 1)}
              aria-label="Chạy hết Grid"
              title="Chạy nhanh tới cuối, không phát animation từng bước"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <select
            aria-label="Tốc độ Grid"
            value={state.speed}
            onChange={(e) =>
              act({ type: "speed", speed: Number(e.target.value) })
            }
          >
            {[0.5, 1, 2, 4, 8].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
          <input
            type="range"
            aria-label="Grid timeline"
            min="0"
            max={run.steps.length - 1}
            value={state.index}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <strong data-testid="grid-step-count">
            {state.index + 1} / {run.steps.length}
            <small>điểm dừng debug</small>
          </strong>
          <span className="gl-input-cursor">
            Input {step.inputCursor.consumed}/{step.inputCursor.total} token
            <br />
            dòng {step.inputCursor.line} · token {step.inputCursor.token}
          </span>
        </footer>
      </div>
    </MotionConfig>
  );
}
