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
  TREE_PROBLEMS,
  TREE_METHODS,
  type TreeProblem,
  type TreeMethod,
  type TreeRun,
  type TreeCase,
} from "@/problems/tree/types";
import {
  TREE_SAMPLES,
  parseTreeInput,
  treeExpected,
  treeReference,
  treeOutput,
} from "@/problems/tree/input";
import { generateTreeRun } from "@/problems/tree/replay";
import { solveTree } from "@/problems/tree/execute";
import { usePlayback } from "@/hooks/use-playback";
import { CodeEditor } from "../../CodeEditor";
import { GridWatch } from "../../grid/GridPanels";
import { GridDialog } from "../../grid/GridDialogs";
import {
  bound,
  DEFAULT_DISPLAY,
  GridDisplayControls,
  readDisplay,
  type GridDisplay,
} from "../../grid/GridDisplayControls";
import { ProblemsTabs, type AppProblem } from "../ProblemsTabs";
import { TreeBoard, TreeMemory, TreeQueryResults } from "./TreeBoards";
interface Config {
  method: TreeMethod;
  input: string;
  expected: string;
  selected: number;
  focusNode: number;
  focusQuery: number;
  detail: boolean;
  jump: "input" | "node" | "query";
}
interface Actual {
  text: string;
  ms: number;
  visits: number;
  mode: string;
}
export default function TreeProblemsLab({
  problem,
  onSelect,
}: {
  problem: TreeProblem;
  onSelect: (p: AppProblem) => void;
}) {
  const [config, setConfig] = useState<Config>({
    method: TREE_PROBLEMS[problem].methods[0],
    ...TREE_SAMPLES[problem],
    selected: 0,
    focusNode: 1,
    focusQuery: 0,
    detail: true,
    jump: "input",
  });
  const [display, setDisplay] = useState<GridDisplay>(DEFAULT_DISPLAY),
    [width, setWidth] = useState(43),
    [height, setHeight] = useState(73),
    [ready, setReady] = useState(false),
    [dark, setDark] = useState(false);
  const [run, setRun] = useState<TreeRun | null>(null),
    [revision, setRevision] = useState(0),
    [focusRequest, setFocusRequest] = useState(0),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [modal, setModal] = useState<"input" | "theory" | "results" | null>(null),
    [actual, setActual] = useState<Record<number, Actual>>({}),
    [batch, setBatch] = useState(false);
  const tests = useMemo(
    () => parseTreeInput(config.input, problem),
    [config.input, problem],
  );
  const expected = useMemo(
    () => treeExpected(config.expected, tests, problem),
    [config.expected, tests, problem],
  );
  const oracle = useMemo(
    () => tests.map((t) => treeReference(t, problem)),
    [tests, problem],
  );
  useEffect(() => {
    try {
      setDark(localStorage.getItem("structure-theme") === "dark");
      const raw = localStorage.getItem("problems-display-v1");
      if (raw) {
        const value: unknown = JSON.parse(raw);
        setDisplay(readDisplay(value));
        if (value && typeof value === "object") {
          const v = value as Record<string, unknown>;
          if (typeof v.width === "number" && Number.isFinite(v.width))
            setWidth(bound(v.width, 28, 70));
          if (typeof v.codeHeight === "number" && Number.isFinite(v.codeHeight))
            setHeight(bound(v.codeHeight, 40, 85));
        }
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "problems-display-v1",
          JSON.stringify({ ...display, width, codeHeight: height }),
        );
      } catch {}
  }, [display, width, height, ready]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("structure-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    setBusy(true);
    const timer = requestAnimationFrame(() => {
      try {
        setRun(
          generateTreeRun(tests[config.selected], problem, config.method, {
            caseIndex: config.selected,
            tests: tests.length,
            detail: config.detail,
            focusNode: config.focusNode,
            focusQuery: config.focusQuery,
          }),
        );
        setRevision((x) => x + 1);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [
    tests,
    problem,
    config.method,
    config.selected,
    config.detail,
    config.focusNode,
    config.focusQuery,
    focusRequest,
  ]);
  const changeDisplay = useCallback(
    (patch: Partial<GridDisplay>) => setDisplay((d) => ({ ...d, ...patch })),
    [],
  );
  const completed = useCallback(
    (i: number, a: Actual) =>
      setActual((old) =>
        old[i]?.text === a.text && old[i]?.mode === a.mode
          ? old
          : { ...old, [i]: a },
      ),
    [],
  );
  function configure(patch: Partial<Config>, reset = false) {
    if (reset) setActual({});
    setConfig((c) => ({ ...c, ...patch }));
  }
  function preset(mode: "compact" | "classroom" | "projector") {
    setDisplay({
      ...DEFAULT_DISPLAY,
      scale: mode === "projector" ? 140 : mode === "classroom" ? 125 : 100,
      memoryShare: mode === "projector" ? 30 : 31,
      presentation: mode === "projector",
      wrapCode: mode !== "compact",
    });
    setWidth(mode === "compact" ? 43 : 46);
    setHeight(73);
  }
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
    },
    [],
  );
  function runAll() {
    setBatch(true);
    batchTimer.current = setTimeout(() => {
      try {
        const all: Record<number, Actual> = {};
        tests.forEach((t, i) => {
          const start = performance.now(),
            solution = solveTree(t, problem, config.method);
          all[i] = {
            text: treeOutput(i, solution.values),
            ms: performance.now() - start,
            visits: solution.metrics.visits,
            mode: "Chạy nhanh JS",
          };
        });
        setActual(all);
      } finally {
        setBatch(false);
      }
    }, 20);
  }
  const expectedForCase = expected[config.selected]
    ? expected[config.selected].split(": ")[1].split(" ").map(Number)
    : oracle[config.selected];
  const styles = {
    "--gl-scale": display.scale / 100,
    "--gl-code-font": `${bound(Math.round((15 * display.scale) / 100) + display.codeOffset, 13, 30)}px`,
    "--gl-memory-font": `${bound((12 * display.scale) / 100, 11, 19)}px`,
    "--gl-grid-font": `${bound((17 * display.scale) / 100, 15, 25)}px`,
    "--pl-code-width": `${width}%`,
    "--pl-code-height": `${height}%`,
    "--gl-memory-share": `${display.memoryShare}%`,
    "--gl-grid-zoom": display.gridZoom / 100,
  } as CSSProperties;
  return (
    <div
      className={`grid-lab problem-lab tree-problem-lab ${display.presentation ? "gl-presenting" : ""} ${display.wrapCode ? "gl-code-wrapping" : ""}`}
      style={styles}
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
          onChange={changeDisplay}
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
        <ProblemsTabs selected={problem} onSelect={onSelect} />
        <label>
          Cách giải
          <select
            aria-label="Cách giải bài PDF"
            value={config.method}
            disabled={busy}
            onChange={(e) =>
              configure(
                { method: e.target.value as TreeMethod, jump: "input" },
                true,
              )
            }
          >
            {TREE_PROBLEMS[problem].methods.map((m) => (
              <option key={m} value={m}>
                {TREE_METHODS[m].title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Test
          <select
            aria-label="Test case PDF"
            disabled={busy}
            value={config.selected}
            onChange={(e) =>
              configure({
                selected: Number(e.target.value),
                focusNode: 1,
                focusQuery: 0,
                jump: "input",
              })
            }
          >
            {tests.map((t, i) => (
              <option key={i} value={i}>
                #{i + 1} · N={t.n}
                {problem === "depth" ? ` Q=${t.queries.length}` : ""}
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
          Kết quả · {Object.keys(actual).length}/{tests.length}
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
        <TreeSession
          key={revision}
          run={run}
          jump={config.jump}
          focusQuery={config.focusQuery}
          expected={expectedForCase}
          display={display}
          onDisplay={changeDisplay}
          width={width}
          onWidth={setWidth}
          height={height}
          onHeight={setHeight}
          suspended={busy || !!modal || batch}
          onComplete={completed}
          onNode={(id) => {
            configure({ focusNode: id, jump: "node" });
            setFocusRequest((x) => x + 1);
          }}
          onQuery={(i) => {
            configure({ focusQuery: i, jump: "query" });
            setFocusRequest((x) => x + 1);
          }}
          onDetail={(detail) => configure({ detail, jump: "input" })}
        />
      ) : (
        <div className="gl-loading">Đang dựng snapshot cây và Java…</div>
      )}
      {busy && run && (
        <div className="gl-busy" role="status">
          Đang tạo replay mới…
        </div>
      )}
      <div className="pl-global-status">
        <span>
          {TREE_PROBLEMS[problem].title} · {TREE_METHODS[config.method].time} ·{" "}
          {TREE_METHODS[config.method].space}
        </span>
        <span>5 testcase PDF · 8 lời giải Java</span>
      </div>
      {modal === "input" && (
        <TreeInput
          problem={problem}
          input={config.input}
          expected={config.expected}
          onClose={() => setModal(null)}
          onApply={(input, expected) => {
            configure(
              {
                input,
                expected,
                selected: 0,
                focusNode: 1,
                focusQuery: 0,
                jump: "input",
              },
              true,
            );
            setModal(null);
          }}
        />
      )}
      {modal === "theory" && (
        <GridDialog
          title={`${TREE_PROBLEMS[problem].title} · Đề & cách giải`}
          onClose={() => setModal(null)}
        >
          <div className="gl-dialog-body pl-theory">
            <p>{TREE_PROBLEMS[problem].question}</p>
            <p>
              <b>Giới hạn gốc:</b> 1 ≤ T ≤ 10; 1 ≤ N ≤ 10000
              {problem === "depth" ? "; 1 ≤ Q ≤ 10000" : ""}. Cạnh có hướng cha
              → con. Root không có cha; mỗi nút khác root có đúng một cha.
            </p>
            <pre>{TREE_PROBLEMS[problem].format}</pre>
            {TREE_PROBLEMS[problem].methods.map((m) => (
              <article key={m}>
                <h3>{TREE_METHODS[m].title}</h3>
                <p>{TREE_METHODS[m].idea}</p>
                <small>
                  {TREE_METHODS[m].time} thời gian · {TREE_METHODS[m].space} bộ
                  nhớ · H là chiều cao cây
                </small>
              </article>
            ))}
            <p>
              <b>Đọc hình:</b> sơ đồ theo đề gốc; cạnh mờ chưa đọc, cạnh liền đã
              lưu trong edges. Bộ nhớ cho thấy từng bước chuyển Edge List sang
              parent[], degree[], Set hoặc Adjacency List. Đây là cây có gốc
              tổng quát, không phải BST/TreeMap. Queue dùng FIFO, Stack dùng
              LIFO; DFS ở đây là iterative, không tạo Call Stack đệ quy.
            </p>
            <p>
              <b>Debug:</b> biến local thuộc main/solve/buildChildren; dữ liệu
              trong Watch là snapshot sau lệnh được highlight. Bảng query phân
              biệt “đã tính” với “đã println”. Với N/Q lớn, lab hiển thị cửa sổ
              tối đa 48 node, preview bộ nhớ và checkpoint; chọn ID/query để xem
              đoạn cần giảng. Các phần bị thu gọn được ghi rõ, bộ đếm xử lý vẫn
              chạy theo thuật toán đã chọn. Số điểm debug không phải số bytecode
              JVM.
            </p>
            <p>
              <b>Nguồn:</b> Bai_9_10_De_Giai_Thich_Va_Code_Nhap_Input.pdf: trang
              1–2 (Bài 9), trang 3–4 (Bài 10). PDF cung cấp đề, ví dụ và khung
              đọc input; các thuật toán, giải thích và mô phỏng là phần bổ sung.
              Code chuyển thành Main.java độc lập, bỏ package buoi2 để chạy trực
              tiếp. java Main đọc System.in; java Main input.txt đọc file.
              Simulator là TypeScript step replay, không chạy JVM trong browser.
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/problems/bai-9-10.pdf#page=${TREE_PROBLEMS[problem].pdfPage}`}
              target="_blank"
              rel="noreferrer"
            >
              Mở PDF Bài 9–10 ↗
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
          title="Expected / Actual · bài cây"
          onClose={() => setModal(null)}
        >
          <div className="gl-dialog-body">
            <p>
              {tests.length} test ·{" "}
              {tests.reduce((n, t) => n + t.n, 0).toLocaleString()} nút ·{" "}
              {tests.reduce((n, t) => n + t.queries.length, 0).toLocaleString()}{" "}
              truy vấn. Expected{" "}
              {config.expected.trim()
                ? "từ PDF / người dùng"
                : "từ oracle độc lập"}
              . Actual chỉ có khi debug tới println hoặc chạy nhanh.
            </p>
            <div className="pl-report-scroll">
              <table
                className="pl-results"
                aria-label="Expected Actual bài cây"
              >
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Check</th>
                    <th>Xử lý nút/cạnh</th>
                    <th>JS</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => {
                    const e = expected[i] ?? treeOutput(i, oracle[i]),
                      a = actual[i];
                    return (
                      <tr key={i}>
                        <td>
                          #{i + 1} · N={t.n}
                          {problem === "depth" ? ` Q=${t.queries.length}` : ""}
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
                        <td>{a?.visits.toLocaleString() ?? "—"}</td>
                        <td>{a ? `${a.ms.toFixed(2)} ms` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              Tổng thời gian JS{" "}
              {Object.values(actual)
                .reduce((sum, a) => sum + a.ms, 0)
                .toFixed(2)}{" "}
              ms. Đây là thời gian simulator, không phải benchmark Java và không
              gồm thời gian dừng/animation. Số nguyên input gồm cạnh và query;
              payload ≥{" "}
              {(
                (tests.reduce(
                  (n, t) => n + 2 * t.edges.length + t.queries.length,
                  0,
                ) *
                  4) /
                1024
              ).toFixed(1)}{" "}
              KiB, chưa tính overhead.
            </p>
          </div>
          <footer>
            <button onClick={() => setModal(null)}>Về debugger</button>
            <button className="gl-primary" disabled={batch} onClick={runAll}>
              {batch ? "Đang chạy…" : "Chạy cả bộ test"}
            </button>
          </footer>
        </GridDialog>
      )}
    </div>
  );
}
function TreeInput({
  problem,
  input,
  expected,
  onApply,
  onClose,
}: {
  problem: TreeProblem;
  input: string;
  expected: string;
  onApply: (i: string, e: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(input),
    [answer, setAnswer] = useState(expected),
    [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <GridDialog title="Input / Expected · bài cây" onClose={onClose}>
      <div className="gl-dialog-body">
        <p>
          <b>{TREE_PROBLEMS[problem].title}.</b>{" "}
          {TREE_PROBLEMS[problem].question}
        </p>
        <pre>{TREE_PROBLEMS[problem].format}</pre>
        <p>
          1 ≤ T ≤ 10; 1 ≤ N ≤ 10000
          {problem === "depth" ? "; 1 ≤ Q ≤ 10000" : ""}. Giữ hướng u → v. Không
          yêu cầu ID cha nhỏ hơn con hoặc cạnh nhập theo tầng.
        </p>
        <label className="tl-file-input">
          Đọc file input .txt
          <input
            aria-label="Đọc file input bài cây"
            type="file"
            accept=".txt,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const value = await file.text();
                if (mounted.current) {
                  setText(value);
                  setError("");
                }
              } catch {
                if (mounted.current) setError("Không đọc được file input.");
              }
            }}
          />
        </label>
        <div className="pl-input-columns">
          <label>
            Input · System.in
            <textarea
              aria-label="Input bài cây"
              wrap="off"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label>
            Expected · có dấu hai chấm
            <textarea
              aria-label="Expected bài cây"
              wrap="off"
              spellCheck={false}
              value={answer}
              placeholder={problem === "leaves" ? "#1: 3" : "#1: 0 2 1"}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <small>
              Để trống để dùng oracle độc lập. Chương trình sẽ tự tính Actual.
            </small>
          </label>
        </div>
        {error && (
          <p role="alert" className="gl-error">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button
          onClick={() => {
            setText(TREE_SAMPLES[problem].input);
            setAnswer(TREE_SAMPLES[problem].expected);
            setError("");
          }}
        >
          Nạp mẫu PDF
        </button>
        <button
          className="gl-primary"
          onClick={() => {
            try {
              const cases = parseTreeInput(text, problem);
              treeExpected(answer, cases, problem);
              onApply(text, answer);
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
function TreeSession({
  run,
  jump,
  focusQuery,
  expected,
  display,
  onDisplay,
  width,
  onWidth,
  height,
  onHeight,
  suspended,
  onComplete,
  onNode,
  onQuery,
  onDetail,
}: {
  run: TreeRun;
  jump: Config["jump"];
  focusQuery: number;
  expected: readonly number[];
  display: GridDisplay;
  onDisplay: (p: Partial<GridDisplay>) => void;
  width: number;
  onWidth: (w: number) => void;
  height: number;
  onHeight: (h: number) => void;
  suspended: boolean;
  onComplete: (i: number, a: Actual) => void;
  onNode: (id: number) => void;
  onQuery: (i: number) => void;
  onDetail: (d: boolean) => void;
}) {
  const start =
    jump === "query"
      ? Math.max(
          0,
          run.steps.findIndex(
            (s) => s.marker === "queryX" && s.scene.queryIndex === focusQuery,
          ),
        )
      : jump === "node"
        ? Math.max(
            0,
            run.steps.findIndex(
              (s) =>
                s.scene.phase !== "input" && s.scene.current === run.focusNode,
            ),
          )
        : 0;
  const { state, act, epoch, duration } = usePlayback(run.steps.length, start),
    step = run.steps[state.index],
    scene = step.scene;
  const [tab, setTab] = useState("visual"),
    [breakpoints, setBreakpoints] = useState<number[]>([]),
    [nodeId, setNodeId] = useState(run.focusNode),
    [queryId, setQueryId] = useState(focusQuery + 1);
  const workspace = useRef<HTMLDivElement>(null),
    right = useRef<HTMLDivElement>(null),
    drag = useRef(false),
    heightDrag = useRef(false),
    last = useRef(step);
  const previous = useMemo(() => {
    const p = last.current;
    last.current = step;
    return p;
  }, [step]);
  useEffect(() => {
    if (suspended) act({ type: "pause" });
  }, [suspended, act]);
  useEffect(() => {
    if (state.playing && breakpoints.includes(step.activeLines[0]))
      act({ type: "pause" });
  }, [state.index, state.playing, breakpoints, step.activeLines, act]);
  useEffect(() => {
    if (scene.output)
      onComplete(run.caseIndex, {
        text: scene.output,
        ms: run.generateMs,
        visits: run.solution.metrics.visits,
        mode: "Debug replay (tạo trace)",
      });
  }, [scene.output, onComplete, run]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        suspended ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target instanceof Element &&
          e.target.closest(
            "input,textarea,select,button,summary,[role=separator],[role=button],[contenteditable=true]",
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
      } else if (e.key.toLowerCase() === "r") act({ type: "restart" });
      else if (e.key === "Escape") onDisplay({ presentation: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [suspended, act, onDisplay]);
  const status = state.animating
    ? "animating"
    : state.index === run.steps.length - 1
      ? "completed"
      : state.playing
        ? "playing"
        : "paused";
  const sourceFont = bound(
      Math.round((15 * display.scale) / 100) + display.codeOffset,
      13,
      30,
    ),
    baseFont = Math.round((15 * display.scale) / 100);
  const local = step.scopes[step.callStack[0].split("(")[0]] ?? {},
    line = run.code.text.split("\n")[step.activeLines[0] - 1]?.trim();
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="pl-session tl-session"
        data-step-marker={step.marker}
        data-playback-status={status}
      >
        <div className="pl-session-summary">
          <span>
            <b>{TREE_METHODS[run.method].title}</b> ·{" "}
            {run.detailed
              ? "Từng lệnh"
              : "Tổng quan · chọn node / query để xem đoạn"}
          </span>
          <label className="pl-detail-choice">
            <input
              type="checkbox"
              checked={run.detailed}
              disabled={run.test.n > 80 || run.test.queries.length > 80}
              onChange={(e) => onDetail(e.target.checked)}
            />
            Từng lệnh toàn bộ
          </label>
          <span>
            {run.steps.length.toLocaleString()} snapshot ·{" "}
            {run.operations.toLocaleString()} điểm debug
          </span>
        </div>
        <nav className="pl-mobile-tabs" aria-label="Panel bài cây">
          {[
            ["visual", "Mô phỏng"],
            ["code", "Java"],
            ["watch", "Variables"],
          ].map(([id, name]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className={`pl-workspace pl-tab-${tab}`} ref={workspace}>
          <div className="pl-left">
            <section className="pl-visual gl-panel">
              <TreeBoard
                key={epoch}
                run={run}
                step={step}
                duration={state.animating ? duration : 0}
                zoom={display.gridZoom / 100}
                onNode={onNode}
              />
              <div className="pl-logic">
                <div className="pl-logic-title">
                  <span className="gl-live-dot" />
                  <b data-testid="tree-step-title">{step.title}</b>
                  <small>
                    L{step.activeLines[0]} · {status}
                  </small>
                </div>
                <p>{step.explanation}</p>
                <div className="tl-local-pills">
                  {["node", "child", "u", "v", "x", "distance", "i", "j"]
                    .filter((k) => local[k])
                    .slice(0, 5)
                    .map((k) => (
                      <span key={k}>
                        {k} = <b>{String(local[k].value)}</b>
                      </span>
                    ))}
                </div>
                <code>{line}</code>
                {step.omittedBefore > 0 && (
                  <small className="tl-collapsed">
                    Đã thu gọn {step.omittedBefore} điểm debug trước snapshot
                    này. Bộ đếm bên dưới vẫn phản ánh việc xử lý.
                  </small>
                )}
              </div>
            </section>
            <div className="pl-memory-row">
              <TreeMemory
                run={run}
                step={step}
                duration={state.animating ? duration : 0}
              />
              <TreeQueryResults
                run={run}
                step={step}
                expected={expected}
                onQuery={onQuery}
              />
            </div>
          </div>
          <div
            className="pl-width-handle"
            role="separator"
            tabIndex={0}
            aria-label="Đổi chiều rộng source code"
            aria-orientation="vertical"
            aria-valuenow={Math.round(width)}
            aria-valuemin={28}
            aria-valuemax={70}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
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
                setBreakpoints((old) =>
                  old.includes(line)
                    ? old.filter((x) => x !== line)
                    : [...old, line],
                )
              }
              fileName="Main.java"
              methodName={step.callStack[0]}
              viewKey={`${display.scale}-${display.codeOffset}-${width}-${height}-${display.wrapCode}-${tab}`}
              displayControls={
                <>
                  <button
                    aria-label="Giảm chữ Java"
                    disabled={sourceFont <= 13}
                    onClick={() =>
                      onDisplay({ codeOffset: sourceFont - 1 - baseFont })
                    }
                  >
                    A−
                  </button>
                  <button
                    aria-label="Tăng chữ Java"
                    disabled={sourceFont >= 30}
                    onClick={() =>
                      onDisplay({ codeOffset: sourceFont + 1 - baseFont })
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
              aria-valuenow={Math.round(height)}
              aria-valuemin={40}
              aria-valuemax={85}
              onKeyDown={(e) => {
                if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                  e.preventDefault();
                  onHeight(
                    bound(height + (e.key === "ArrowDown" ? 2 : -2), 40, 85),
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
        <div className="tl-focus-bar">
          <label>
            Node
            <input
              aria-label="ID nút cần phân tích"
              type="number"
              min="1"
              max={run.test.n}
              value={nodeId}
              onChange={(e) =>
                setNodeId(bound(Number(e.target.value), 1, run.test.n))
              }
            />
          </label>
          <button onClick={() => onNode(nodeId)}>Xem node</button>
          {run.problem === "depth" && (
            <>
              <label>
                Query
                <input
                  aria-label="Query cần phân tích"
                  type="number"
                  min="1"
                  max={run.test.queries.length}
                  value={queryId}
                  onChange={(e) =>
                    setQueryId(
                      bound(Number(e.target.value), 1, run.test.queries.length),
                    )
                  }
                />
              </label>
              <button onClick={() => onQuery(queryId - 1)}>Xem query</button>
            </>
          )}
          <span>Root 1 · d(root)=0 · input cạnh cha → con</span>
        </div>
        <footer className="pl-playback">
          <button
            aria-label="Restart bài cây"
            onClick={() => act({ type: "restart" })}
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Previous bài cây"
            disabled={state.animating || state.index === 0}
            onClick={() => act({ type: "previous" })}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="gl-primary"
            aria-label={state.playing ? "Pause bài cây" : "Play bài cây"}
            disabled={state.index === run.steps.length - 1}
            onClick={() => act({ type: "toggle" })}
          >
            {state.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            aria-label="Next bài cây"
            disabled={state.animating || state.index === run.steps.length - 1}
            onClick={() => act({ type: "next" })}
          >
            <ArrowRight size={16} />
          </button>
          <select
            aria-label="Tốc độ bài cây"
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
            aria-label="Timeline bài cây"
            type="range"
            min="0"
            max={run.steps.length - 1}
            value={state.index}
            onChange={(e) =>
              act({ type: "seek", index: Number(e.target.value) })
            }
          />
          <output data-testid="tree-step-count">
            {state.index + 1} / {run.steps.length}
          </output>
          <button
            onClick={() => act({ type: "seek", index: run.steps.length - 1 })}
          >
            Kết quả ↗
          </button>
        </footer>
        <div className="pl-telemetry">
          <span>
            {run.method === "parent-walk" ? "Bước về cha" : "Xử lý nút"}{" "}
            {scene.work.visits.toLocaleString()} · đọc cạnh{" "}
            {scene.work.edgeReads.toLocaleString()} · ghi{" "}
            {scene.work.writes.toLocaleString()}
          </span>
          <span>
            Push {scene.work.pushes.toLocaleString()} / Pop{" "}
            {scene.work.pops.toLocaleString()} · đỉnh {scene.work.peakFrontier}{" "}
            · query {scene.work.answered}/{run.test.queries.length}
          </span>
          <span>
            Tạo trace JS {run.generateMs.toFixed(1)} ms · {status}
          </span>
        </div>
      </div>
    </MotionConfig>
  );
}
