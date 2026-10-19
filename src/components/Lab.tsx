"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Braces,
  Bug,
  Check,
  ChevronDown,
  Circle,
  Code2,
  Expand,
  GitBranch,
  Keyboard,
  Layers,
  Link,
  ListOrdered,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  SquareTerminal,
  Sun,
  TreePine,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LessonRun, Structure, Variable } from "@/engine/types";
import { LESSONS, createRun, type Lesson } from "@/data/lessons";
import { usePlayback } from "@/hooks/use-playback";
import { Button } from "./ui/button";
import { CodeEditor } from "./CodeEditor";
import { SceneRenderer } from "./visualizers/SceneRenderer";
const ICONS: Record<Structure, LucideIcon> = {
  array: Braces,
  linked: Link,
  stack: Layers,
  queue: ListOrdered,
  tree: TreePine,
  graph: GitBranch,
};
const format = (v: Variable) =>
  v === null ? "null" : Array.isArray(v) ? `[${v.join(", ")}]` : String(v);
export default function Lab() {
  const [ready, setReady] = useState(false);
  const [structure, setStructure] = useState<Structure>("array");
  const [dark, setDark] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [reset, setReset] = useState(0);
  const [theory, setTheory] = useState(false);
  const lesson = LESSONS.find((l) => l.id === structure)!;
  useEffect(() => {
    setReady(true);
    try {
      setDark(localStorage.getItem("structure-theme") === "dark");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  function toggleTheme() {
    setDark((d) => {
      try {
        localStorage.setItem("structure-theme", d ? "light" : "dark");
      } catch {}
      return !d;
    });
  }
  return (
    <div
      className={`lab-app ${presentation ? "presentation" : ""}`}
      inert={!ready}
      aria-busy={!ready}
      data-ready={ready}
    >
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={23} fill="currentColor" />
          </span>
          <span>
            STRUCTURE LAB<span className="brand-version">2.0</span>
          </span>
          <span className="brand-tag">JAVA VISUAL DEBUG</span>
        </div>
        <div className="header-actions">
          <span className="header-caption">Algorithms explained in motion</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Light theme" : "Dark theme"}
            title="Đổi theme"
            onClick={toggleTheme}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <span className="header-separator" />
          <Button
            variant="ghost"
            className="reset-button"
            aria-label="Reset lab"
            onClick={() => setReset((n) => n + 1)}
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </Button>
          <Button
            variant="outline"
            className="presentation-button"
            aria-label={presentation ? "Exit presentation" : "Presentation"}
            onClick={() => setPresentation((p) => !p)}
          >
            {presentation ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{presentation ? "Exit presentation" : "Presentation"}</span>
          </Button>
        </div>
      </header>
      <nav className="navigation" aria-label="Cấu trúc dữ liệu">
        <div className="nav-inner">
          {LESSONS.map((item, index) => {
            const Icon = ICONS[item.id];
            return (
              <button
                key={item.id}
                className={`nav-tab ${structure === item.id ? "selected" : ""}`}
                aria-current={structure === item.id ? "page" : undefined}
                onClick={() => setStructure(item.id)}
              >
                <Icon size={17} />
                <span>{item.name}</span>
                <small>0{index + 1}</small>
              </button>
            );
          })}
          <span className="nav-right">
            <span className="live-dot" />
            INTERACTIVE WORKSPACE
          </span>
        </div>
      </nav>
      <main className="main">
        <div className="lesson-heading">
          <div>
            <div className="eyebrow">
              <span>THE LEARNING LAB</span>
              <span>/</span>
              <span>{lesson.name.toUpperCase()}</span>
            </div>
            <h1>
              {lesson.title}
              <span className="heading-dot">.</span>
            </h1>
            <p>{lesson.description}</p>
          </div>
          <Button variant="outline" onClick={() => setTheory(true)}>
            <BookOpen size={16} />
            Lý thuyết & Big-O <span className="shortcut">?</span>
          </Button>
        </div>
        <LabSession
          key={`${structure}-${reset}`}
          lesson={lesson}
          presentation={presentation}
          onPresentation={() => setPresentation((p) => !p)}
          onExit={() => setPresentation(false)}
        />
        <footer className="app-footer">
          <span>
            <Code2 size={13} /> Java algorithm step replay · Không chạy JVM
            trong trình duyệt
          </span>
          <span>
            <Keyboard size={13} />
            <kbd>←</kbd>
            <kbd>→</kbd> Step <kbd>Space</kbd> Play/Pause <kbd>R</kbd> Restart
          </span>
          <span>
            Made for curious minds <Sparkles size={12} />
          </span>
        </footer>
      </main>
      {theory && <Theory lesson={lesson} onClose={() => setTheory(false)} />}
    </div>
  );
}
function LabSession({
  lesson,
  presentation,
  onPresentation,
  onExit,
}: {
  lesson: Lesson;
  presentation: boolean;
  onPresentation: () => void;
  onExit: () => void;
}) {
  const [operation, setOperation] = useState(lesson.operations[0].id);
  const [at, setAt] = useState("5");
  const [value, setValue] = useState("49");
  const [params, setParams] = useState({ at: 5, value: 49 });
  const [error, setError] = useState("");
  const run = useMemo(
    () => createRun(lesson.id, operation, params.at, params.value),
    [lesson.id, operation, params],
  );
  return (
    <>
      <div className="operation-toolbar">
        <div className="operation-selector">
          <span className="micro-label">OPERATION</span>
          <label className="select-shell">
            <select
              aria-label="Chọn thao tác"
              value={operation}
              onChange={(e) => {
                const op = e.target.value;
                setOperation(op);
                setError("");
                if (
                  lesson.id === "array" &&
                  (op === "get" || op === "remove") &&
                  params.at > 9
                ) {
                  setParams((p) => ({ ...p, at: 9 }));
                  setAt("9");
                }
              }}
            >
              {lesson.operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        {lesson.id === "array" && operation !== "resize" && (
          <form
            className="parameter-form"
            onSubmit={(e) => {
              e.preventDefault();
              const index = Number(at),
                n = Number(value);
              if (
                !Number.isInteger(index) ||
                index < 0 ||
                index > (operation === "get" || operation === "remove" ? 9 : 10)
              ) {
                setError(
                  "Index hợp lệ: 0–" +
                    (operation === "get" || operation === "remove" ? 9 : 10),
                );
                return;
              }
              if (!Number.isInteger(n) || Math.abs(n) > 999) {
                setError("Giá trị phải là số nguyên từ -999 đến 999");
                return;
              }
              setParams({ at: index, value: n });
              setError("");
            }}
          >
            {operation !== "add" && (
              <label>
                index{" "}
                <input
                  type="number"
                  aria-label="Index"
                  min="0"
                  max={operation === "insert" ? 10 : 9}
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                />
              </label>
            )}
            {(operation === "insert" || operation === "add") && (
              <label>
                value{" "}
                <input
                  type="number"
                  aria-label="Value"
                  min="-999"
                  max="999"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            )}
            <Button variant="ghost" size="sm" type="submit">
              <Play size={12} />
              Apply
            </Button>
          </form>
        )}
        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
        <span className="complexity-badge">
          <Circle size={7} fill="currentColor" />
          {lesson.id === "array"
            ? "DYNAMIC ARRAY"
            : lesson.id === "tree"
              ? "CONCEPTUAL BST"
              : lesson.id === "graph"
                ? "KAHN’S ALGORITHM"
                : lesson.id === "stack"
                  ? "LIFO"
                  : lesson.id === "linked"
                    ? "SINGLY LINKED LIST"
                    : "FIFO"}
          <b>{run.complexity}</b>
        </span>
      </div>
      <Execution
        key={run.key}
        run={run}
        lesson={lesson}
        presentation={presentation}
        onPresentation={onPresentation}
        onExit={onExit}
      />
    </>
  );
}
function Execution({
  run,
  lesson,
  presentation,
  onPresentation,
  onExit,
}: {
  run: LessonRun;
  lesson: Lesson;
  presentation: boolean;
  onPresentation: () => void;
  onExit: () => void;
}) {
  const { state, act, epoch, duration } = usePlayback(run.steps.length);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [debugTab, setDebugTab] = useState<"console" | "trace" | "stack">(
    "console",
  );
  const [showNote, setShowNote] = useState(false);
  const lastBreakpoint = useRef(-1);
  const consoleRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const step = run.steps[state.index];
  const previous = run.steps[Math.max(0, state.index - 1)];
  const completed = state.index === run.steps.length - 1;
  const status = completed
    ? "completed"
    : state.animating
      ? "animating"
      : state.playing
        ? "playing"
        : "paused";
  useEffect(() => {
    if (lastBreakpoint.current !== state.index) lastBreakpoint.current = -1;
    if (
      state.playing &&
      breakpoints.some((b) => step.activeLines.includes(b)) &&
      lastBreakpoint.current !== state.index
    ) {
      lastBreakpoint.current = state.index;
      act({ type: "pause" });
    }
  }, [state.playing, state.index, breakpoints, step.activeLines, act]);
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.index, debugTab]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const nodeId = step.focus.find((id) =>
      stage.querySelector(`[data-node="${CSS.escape(id)}"]`),
    );
    const node = nodeId
      ? stage.querySelector(`[data-node="${CSS.escape(nodeId)}"]`)
      : null;
    const scroller = node?.closest<HTMLElement>(".diagram-scroll");
    if (node && scroller && scroller.scrollWidth > scroller.clientWidth) {
      const a = node.getBoundingClientRect(),
        b = scroller.getBoundingClientRect();
      scroller.scrollLeft += a.x + a.width / 2 - b.x - b.width / 2;
    }
  }, [step, epoch]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Escape") {
        onExit();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest("input,select,textarea,[contenteditable=true],dialog"))
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        act({ type: "next" });
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        act({ type: "previous" });
      }
      if (e.code === "Space" && !target.closest("button")) {
        e.preventDefault();
        act({ type: "toggle" });
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        act({ type: "restart" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [act, onExit]);
  const toggleBreakpoint = useCallback(
    (line: number) =>
      setBreakpoints((b) =>
        b.includes(line) ? b.filter((x) => x !== line) : [...b, line],
      ),
    [],
  );
  return (
    <div className="execution" data-status={status}>
      <div className="workspace-grid">
        <section className="panel visualization-panel">
          <div className="panel-heading">
            <div>
              <span className="section-icon">
                <Layers size={15} />
              </span>
              <h2>Data structure view</h2>
              <span className="live-badge">LIVE</span>
            </div>
            <div>
              <span className="step-pill">
                {String(state.index + 1).padStart(2, "0")}{" "}
                <span>/ {String(run.steps.length).padStart(2, "0")}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  presentation
                    ? "Thu nhỏ visualization"
                    : "Phóng to visualization"
                }
                onClick={onPresentation}
              >
                <Expand size={15} />
              </Button>
            </div>
          </div>
          <div className="step-summary">
            <span className={`step-tag ${completed ? "finished" : ""}`}>
              <span className="live-dot" />
              {completed
                ? "COMPLETED"
                : (step.animations[0]?.kind.toUpperCase() ??
                  (state.index === 0 ? "INITIAL STATE" : "EXECUTING"))}
            </span>
            <h3 data-testid="step-title">{step.title}</h3>
            <p>{step.description}</p>
          </div>
          <MotionConfig
            reducedMotion="user"
            transition={{
              duration: state.animating ? duration : 0,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <div
              key={epoch}
              ref={stageRef}
              className={`visualization-stage ${lesson.id}`}
            >
              <SceneRenderer step={step} />
            </div>
          </MotionConfig>
          <div className="visualization-bottom">
            <div className="legend">
              <span>
                <i className="blue" />
                Đang truy cập
              </span>
              <span>
                <i className="amber" />
                Di chuyển
              </span>
              <span>
                <i className="green" />
                Hoàn tất
              </span>
              <span>
                <i className="purple" />
                Tham chiếu
              </span>
            </div>
            <button
              className="info-toggle"
              aria-expanded={showNote}
              onClick={() => setShowNote((n) => !n)}
            >
              <BookOpen size={14} />
              <span>Ghi chú</span>
              <ChevronDown size={12} />
            </button>
          </div>
          {showNote && <div className="teaching-note">{lesson.warning}</div>}
        </section>
        <CodeEditor
          code={run.code}
          step={step}
          status={status}
          breakpoints={breakpoints}
          onBreakpoint={toggleBreakpoint}
        />
        <section className="panel watch-panel">
          <div className="panel-heading">
            <div>
              <Bug size={15} />
              <h2>Watch variables</h2>
              <span className="panel-subtitle">MEMORY & STATE</span>
            </div>
            <span className="small-muted">
              {Object.keys(step.variables).length} variables
            </span>
          </div>
          <div className="variable-grid" data-testid="variables">
            {Object.entries(step.variables).map(([key, val]) => {
              const changed =
                JSON.stringify(previous.variables[key]) !== JSON.stringify(val);
              return (
                <div
                  className={`variable-card ${changed ? "changed" : ""}`}
                  key={key}
                >
                  <span>
                    {key}
                    {changed && <span className="changed-dot" />}
                  </span>
                  <strong title={format(val)}>{format(val)}</strong>
                </div>
              );
            })}
          </div>
          <div className="watch-note">
            <span className="live-dot" />
            Biến và hình minh họa dùng cùng snapshot{" "}
            <span>#{String(state.index + 1).padStart(2, "0")}</span>
          </div>
        </section>
        <section className="panel console-panel">
          <div className="debug-tabs" role="tablist" aria-label="Debugger">
            <button
              role="tab"
              aria-selected={debugTab === "console"}
              onClick={() => setDebugTab("console")}
            >
              <SquareTerminal size={14} />
              Console<span>{step.console.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={debugTab === "trace"}
              onClick={() => setDebugTab("trace")}
            >
              Trace
            </button>
            <button
              role="tab"
              aria-selected={debugTab === "stack"}
              onClick={() => setDebugTab("stack")}
            >
              Call stack
            </button>
            <span className="console-dot" />
          </div>
          <div
            ref={consoleRef}
            className="console-content"
            role="tabpanel"
            aria-label={debugTab}
            data-testid="console"
          >
            {debugTab === "console" ? (
              step.console.length ? (
                step.console.map((line, i) => (
                  <div
                    key={i}
                    className={i === step.console.length - 1 ? "latest" : ""}
                  >
                    <span className="console-chevron">›</span>
                    <span>{line}</span>
                  </div>
                ))
              ) : (
                <div className="empty-console">
                  <SquareTerminal size={20} />
                  <span>
                    Console sẵn sàng.
                    <br />
                    <small>Output xuất hiện khi chạy lệnh System.out.</small>
                  </span>
                </div>
              )
            ) : debugTab === "trace" ? (
              run.steps.slice(0, state.index + 1).map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => act({ type: "seek", index: i })}
                  className={i === state.index ? "latest" : ""}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s.title}</span>
                  <small>L{s.activeLines[0]}</small>
                </button>
              ))
            ) : (
              step.callStack.map((s, i) => (
                <div key={`${s}-${i}`}>
                  <span className="teal">{i === 0 ? "→" : "↳"}</span>
                  <span>{s}</span>
                </div>
              ))
            )}
          </div>
          <div className="console-footer">
            <span className="live-dot" />
            Deterministic step replay <span>{status}</span>
          </div>
        </section>
      </div>
      <section className="playback" aria-label="Playback controls">
        <div className="playback-buttons">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Restart"
            title="Restart (R)"
            onClick={() => act({ type: "restart" })}
          >
            <RotateCcw size={16} />
          </Button>
          <span className="playback-separator" />
          <Button
            variant="outline"
            aria-label="Previous Step"
            disabled={state.index === 0 || state.animating}
            onClick={() => act({ type: "previous" })}
          >
            <ArrowLeft size={15} />
            <span>Previous</span>
          </Button>
          <Button
            aria-label={state.playing ? "Pause" : "Play"}
            className="play-button"
            disabled={completed}
            onClick={() => act({ type: "toggle" })}
          >
            {state.playing ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            <span>{state.playing ? "Pause" : "Play"}</span>
          </Button>
          <Button
            variant="secondary"
            aria-label="Next Step"
            disabled={completed || state.animating}
            onClick={() => act({ type: "next" })}
          >
            <span>Next step</span>
            <ArrowRight size={15} />
          </Button>
        </div>
        <div className="timeline">
          <span className="timeline-label">
            STEP{" "}
            <b data-testid="step-counter">
              {String(state.index + 1).padStart(2, "0")}
            </b>{" "}
            / {String(run.steps.length).padStart(2, "0")}
          </span>
          <input
            aria-label="Timeline"
            type="range"
            min="0"
            max={run.steps.length - 1}
            value={state.index}
            onChange={(e) =>
              act({ type: "seek", index: Number(e.target.value) })
            }
            style={
              {
                "--progress": `${(state.index / (run.steps.length - 1)) * 100}%`,
              } as React.CSSProperties
            }
          />
          <span className={`playback-status ${completed ? "complete" : ""}`}>
            <span className="live-dot" />
            {status}
          </span>
        </div>
        <div className="speed-control">
          <span>SPEED</span>
          <select
            aria-label="Playback speed"
            value={state.speed}
            onChange={(e) =>
              act({ type: "speed", speed: Number(e.target.value) })
            }
          >
            {[0.5, 1, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </section>
      <div className="sr-only" aria-live="polite">
        Bước {state.index + 1}: {step.title}
      </div>
    </div>
  );
}
function Theory({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="theory-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="theory-title"
    >
      <div className="theory-inner">
        <div className="theory-top">
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng lý thuyết"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>
        <span className="eyebrow">THE CONCEPT, BEHIND THE CODE</span>
        <h2 id="theory-title">{lesson.name}</h2>
        <p>{lesson.concept}</p>
        {[
          ["Cách lưu trữ", lesson.storage],
          ["Ứng dụng thực tế", lesson.use],
          ["Big-O & so sánh", lesson.comparison],
        ].map(([title, text]) => (
          <section key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </section>
        ))}
        <div className="theory-warning">{lesson.warning}</div>
        <Button onClick={onClose}>
          <Check size={16} />
          Quay lại phòng lab
        </Button>
      </div>
    </dialog>
  );
}
