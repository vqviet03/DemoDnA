"use client";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  LessonRun,
  Structure,
  Variable,
  OperationRequest,
} from "@/engine/types";
import { LESSONS, type Lesson } from "@/data/lessons";
import { appendOperations, newSession, type Session } from "@/engine/session";
import {
  GRAPH_INPUT,
  GRAPH_NODES,
  GRAPH_START,
  GRAPH_GOAL,
  parseGraphInput,
} from "@/algorithms/graph";
import { TREE_KEYS } from "@/algorithms/tree";
import { ACTIONS } from "@/algorithms/stack-queue";
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
  const [sessions, setSessions] = useState<Record<Structure, Session>>(
    () =>
      Object.fromEntries(
        LESSONS.map((l) => [l.id, newSession(l.id)]),
      ) as Record<Structure, Session>,
  );
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
          <NextLink href="/grid/" prefetch={false} className="grid-lab-link">Grid Lab ↗</NextLink>
          <NextLink href="/problems/" prefetch={false} className="grid-lab-link">Tô màu & Origami ↗</NextLink>
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
            onClick={() => {
              setSessions((s) => ({
                ...s,
                [structure]: newSession(structure),
              }));
              setReset((n) => n + 1);
            }}
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
          session={sessions[structure]}
          onSession={(session) =>
            setSessions((s) => ({ ...s, [structure]: session }))
          }
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
  session,
  onSession,
  presentation,
  onPresentation,
  onExit,
}: {
  lesson: Lesson;
  session: Session;
  onSession: (session: Session) => void;
  presentation: boolean;
  onPresentation: () => void;
  onExit: () => void;
}) {
  const [operation, setOperation] = useState(lesson.operations[0].id);
  const [at, setAt] = useState(lesson.id === "linked" ? "48" : "5");
  const [value, setValue] = useState(
    lesson.id === "tree" ? "65" : lesson.id === "linked" ? "54" : "49",
  );
  const [text, setText] = useState(lesson.id === "stack" ? "Insert title" : "");
  const [input, setInput] = useState(
    lesson.id === "tree" ? TREE_KEYS.join(", ") : GRAPH_INPUT,
  );
  const [representation, setRepresentation] = useState<"list" | "matrix">(
    "list",
  );
  const [start, setStart] = useState<string>(GRAPH_START),
    [goal, setGoal] = useState<string>(GRAPH_GOAL);
  const [queue, setQueue] = useState<OperationRequest[]>([]),
    [error, setError] = useState("");
  const final = session.run.steps.at(-1)!.state;
  const draftLoad = [...queue].reverse().find((r) => r.operation === "load");
  let draftNodes: readonly string[] | undefined;
  try {
    if (draftLoad?.input) draftNodes = parseGraphInput(draftLoad.input).nodes;
  } catch {}
  const nodes =
    draftNodes ?? (final.kind === "graph" ? final.nodes : GRAPH_NODES);
  const request = (): OperationRequest => ({
    operation,
    at: Number(at),
    value: Number(value),
    text,
    input,
    representation,
    start:
      operation === "load"
        ? undefined
        : nodes.includes(start)
          ? start
          : nodes[0],
    goal:
      operation === "load"
        ? undefined
        : nodes.includes(goal)
          ? goal
          : nodes.at(-1),
  });
  function changeOperation(op: string) {
    setOperation(op);
    setError("");
    if (lesson.id === "tree") setValue(op === "insert" ? "68" : "65");
    if (lesson.id === "linked")
      setValue(op === "addFirst" ? "6" : op === "addLast" ? "108" : "54");
  }
  function execute() {
    try {
      const next = appendOperations(
        lesson.id,
        session,
        queue.length ? queue : [request()],
      );
      onSession(next);
      setQueue([]);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể thực hiện thao tác.",
      );
    }
  }
  const hasValue =
    (lesson.id === "array" && ["add", "insert"].includes(operation)) ||
    (lesson.id === "linked" &&
      ["addFirst", "addLast", "insertAfter"].includes(operation)) ||
    (lesson.id === "tree" &&
      ["search", "insert", "delete"].includes(operation));
  return (
    <>
      <div className="operation-toolbar">
        <label className="select-shell">
          <select
            aria-label="Chọn thao tác"
            value={operation}
            onChange={(e) => changeOperation(e.target.value)}
          >
            {lesson.operations.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <div className="parameter-form">
          {((lesson.id === "array" &&
            ["insert", "remove", "get"].includes(operation)) ||
            (lesson.id === "linked" &&
              ["insertAfter", "removeAfter"].includes(operation))) && (
            <label>
              {lesson.id === "linked" ? "sau node" : "index"}
              <input
                aria-label="Index"
                type="number"
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </label>
          )}
          {hasValue && (
            <label>
              {lesson.id === "tree" ? "ID" : "value"}
              <input
                aria-label="Value"
                type="number"
                min="-999"
                max="999"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          )}
          {lesson.id === "stack" && operation === "push" && (
            <select
              aria-label="Editor action"
              value={text}
              onChange={(e) => setText(e.target.value)}
            >
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          )}
          {lesson.id === "queue" && operation === "offer" && (
            <input
              className="text-param"
              aria-label="Email job"
              placeholder="Mới: tự đặt ID"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
          {((lesson.id === "tree" && operation === "build") ||
            (lesson.id === "graph" && operation === "load")) && (
            <label className="dataset-param">
              Dữ liệu
              <input
                aria-label="Dữ liệu đầu vào"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                title={
                  lesson.id === "tree"
                    ? "ID cách nhau bằng dấu phẩy, tối đa 12 ID"
                    : "Cạnh u>v, phân cách bằng dấu phẩy. Node riêng là đỉnh cô lập."
                }
              />
            </label>
          )}
          {lesson.id === "graph" && (
            <select
              aria-label="Cách lưu Graph"
              value={representation}
              onChange={(e) =>
                setRepresentation(e.target.value as "list" | "matrix")
              }
            >
              <option value="list">Danh sách kề</option>
              <option value="matrix">Ma trận kề</option>
            </select>
          )}
          {lesson.id === "graph" && operation !== "load" && (
            <>
              <select
                aria-label="Node bắt đầu"
                value={nodes.includes(start) ? start : nodes[0]}
                onChange={(e) => setStart(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              {operation === "bfs" && (
                <select
                  aria-label="Node đích"
                  value={nodes.includes(goal) ? goal : nodes.at(-1)}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  {nodes.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
        <div className="compose-actions">
          <Button
            variant="outline"
            size="sm"
            aria-label="Thêm vào chuỗi"
            disabled={queue.length === 3}
            onClick={() => {
              setQueue((q) => [...q, request()]);
              setError("");
            }}
          >
            <Plus size={13} />
            Thêm {queue.length}/3
          </Button>
          <Button size="sm" aria-label="Apply" onClick={execute}>
            <Play size={12} /> {queue.length ? "Chạy chuỗi" : "Áp dụng"}
          </Button>
        </div>
      </div>
      <div className="session-strip">
        <span
          className="session-hint"
          title="Thao tác mới luôn nối sau dữ liệu cuối chuỗi. Restart chỉ phát lại; Reset tạo bộ mẫu mới."
        >
          <span className="live-dot" /> Cùng dữ liệu · nối từ cuối chuỗi
        </span>
        <span
          className="dataset-count"
          title="Dữ liệu sau khi chạy xong toàn bộ chuỗi"
        >
          Cuối chuỗi:{" "}
          {final.kind === "array"
            ? `${final.size} phần tử / ${final.slots.length} ô`
            : final.kind === "queue"
              ? `${final.items.length} chờ · ${final.completed.length} xong`
              : final.kind === "stack"
                ? `${final.items.length} actions`
                : final.kind === "graph"
                  ? `${final.nodes.length} đỉnh · ${final.edges.length} cạnh`
                  : `${final.nodes.length} node`}
        </span>
        {queue.map((r, i) => (
          <button
            className="draft-chip"
            key={i}
            aria-label={`Bỏ thao tác ${i + 1}`}
            onClick={() => setQueue((q) => q.filter((_, at) => at !== i))}
          >
            {i + 1}. {r.operation}
            {["array", "tree", "linked"].includes(lesson.id)
              ? `(${r.value})`
              : ""}{" "}
            ×
          </button>
        ))}
        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <Execution
        key={session.run.key}
        run={session.run}
        session={session}
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
  session,
  lesson,
  presentation,
  onPresentation,
  onExit,
}: {
  run: LessonRun;
  session: Session;
  lesson: Lesson;
  presentation: boolean;
  onPresentation: () => void;
  onExit: () => void;
}) {
  const { state, act, epoch, duration } = usePlayback(
    run.steps.length,
    session.startIndex,
  );
  const [breakpointMap, setBreakpointMap] = useState<Record<string, number[]>>(
    {},
  );
  const [mobilePanel, setMobilePanel] = useState("details");
  const [showStorage, setShowStorage] = useState(false);
  const [storageView, setStorageView] = useState<"list" | "matrix">("list");
  const [debugTab, setDebugTab] = useState<"console" | "trace" | "stack">(
    "console",
  );
  const [showNote, setShowNote] = useState(false);
  const lastBreakpoint = useRef(-1);
  const consoleRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const step = run.steps[state.index];
  const code = step.source ?? run.code;
  const graphRepresentation =
    step.state.kind === "graph" ? step.state.representation : undefined;
  const graphAlgorithm =
    step.state.kind === "graph" ? step.state.algorithm : undefined;
  useEffect(() => {
    if (graphRepresentation) setStorageView(graphRepresentation);
    setShowStorage(graphAlgorithm === "load");
  }, [step.segment, graphRepresentation, graphAlgorithm]);
  const breakpoints = breakpointMap[code.text] ?? [];
  const segment = step.segment ?? 0;
  const previousSegment = useRef(segment);
  useEffect(() => {
    if (previousSegment.current !== segment) {
      lastBreakpoint.current = -1;
      previousSegment.current = segment;
    }
  }, [segment]);
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
  }, [state.index, debugTab, mobilePanel]);
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
      setBreakpointMap((map) => {
        const lines = map[code.text] ?? [];
        return {
          ...map,
          [code.text]: lines.includes(line)
            ? lines.filter((x) => x !== line)
            : [...lines, line],
        };
      }),
    [code.text],
  );
  return (
    <div
      className="execution"
      data-status={status}
      data-mobile-panel={mobilePanel}
    >
      <div className="sequence-history" aria-label="Lịch sử thao tác">
        {session.segments.map((part, i) => (
          <button
            key={part.start}
            className={segment === i ? "active" : ""}
            onClick={() => act({ type: "seek", index: part.start })}
            title={`Bước ${part.start + 1}–${part.end + 1}`}
          >
            <span>{i + 1}</span>
            {part.label}
          </button>
        ))}
        <small>
          {session.segments[segment].complexity} · {session.segments.length}{" "}
          thao tác · {run.steps.length} bước
        </small>
      </div>
      <div
        className="mobile-panel-tabs"
        role="tablist"
        aria-label="Workspace panels"
      >
        {[
          ["details", "Giải thích"],
          ["code", "Java"],
          ["watch", "Biến"],
          ["console", "Console"],
        ].map(([id, label]) => (
          <button
            role="tab"
            aria-selected={mobilePanel === id}
            key={id}
            onClick={() => setMobilePanel(id)}
          >
            {label}
          </button>
        ))}
      </div>
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
              <SceneRenderer
                step={step}
                graphView={storageView}
                showStorage={showStorage}
              />
            </div>
          </MotionConfig>
          {lesson.id === "graph" && (
            <div className="storage-toggle">
              <span>Xem:</span>
              <button
                className={`graph-diagram-button ${!showStorage ? "active" : ""}`}
                onClick={() => setShowStorage(false)}
              >
                Đồ thị
              </button>
              <button
                className={
                  storageView === "list"
                    ? showStorage
                      ? "active"
                      : "desktop-active"
                    : ""
                }
                onClick={() => {
                  setStorageView("list");
                  setShowStorage(true);
                }}
              >
                Danh sách kề
              </button>
              <button
                className={
                  storageView === "matrix"
                    ? showStorage
                      ? "active"
                      : "desktop-active"
                    : ""
                }
                onClick={() => {
                  setStorageView("matrix");
                  setShowStorage(true);
                }}
              >
                Ma trận kề
              </button>
              <small>Góc nhìn · không đổi dữ liệu</small>
            </div>
          )}
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
          code={code}
          viewKey={mobilePanel}
          step={step}
          status={status}
          breakpoints={breakpoints}
          onBreakpoint={toggleBreakpoint}
        />
        <section
          className="panel explanation-panel"
          aria-label="Giải thích chi tiết"
        >
          <div className="panel-heading">
            <div>
              <BookOpen size={14} />
              <h2>Giải thích từng bước</h2>
            </div>
            <span className="small-muted">
              {session.segments[segment].label}
            </span>
          </div>
          <div className="explanation-content" data-testid="step-explanation">
            {step.explanation.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <div className="before-after">
              <span>Trước → Sau</span>
              {Object.entries(step.variables)
                .filter(
                  ([key, val]) =>
                    JSON.stringify(previous.variables[key]) !==
                    JSON.stringify(val),
                )
                .map(([key, val]) => (
                  <code key={key}>
                    {key}:{" "}
                    {previous.variables[key] === undefined
                      ? "—"
                      : format(previous.variables[key])}{" "}
                    → <b>{format(val)}</b>
                  </code>
                ))}
              {state.index === 0 && (
                <small>Trạng thái ban đầu, chưa thay đổi dữ liệu.</small>
              )}
            </div>
          </div>
        </section>
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
