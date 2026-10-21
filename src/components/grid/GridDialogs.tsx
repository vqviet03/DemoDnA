"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Upload, X, Plus, Trash2 } from "lucide-react";
import { GridBoard } from "./GridBoard";
import {
  gridExample,
  parseExpected,
  parseGridInput,
  serializeGridInput,
} from "@/grid/input";
import {
  LIMITS,
  PROBLEMS,
  type GridCase,
  type GridProblem,
} from "@/grid/types";
export function GridDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      className="gl-dialog"
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Đóng popup">
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function InputDialog({
  input,
  expected,
  problem,
  onClose,
  onApply,
}: {
  input: string;
  expected: string;
  problem: GridProblem;
  onClose: () => void;
  onApply: (input: string, expected: string, file?: string) => void;
}) {
  const [text, setText] = useState(input),
    [output, setOutput] = useState(expected),
    [error, setError] = useState(""),
    [file, setFile] = useState<string>();
  const p = PROBLEMS[problem];
  return (
    <GridDialog title="Input / Expected · nhiều test case" onClose={onClose}>
      <div className="gl-dialog-body">
        <p>
          <b>{p.title}.</b> {p.legend}. {p.output}
        </p>
        <div className="gl-input-format">
          <code>
            T{"\n"}R C{p.hasPoints ? "\nsr sc tr tc" : ""}
            {"\n"}R dòng × C số nguyên{"\n"}… lặp phần test, không lặp T
          </code>
          <p>
            Chỉ số từ 0. Tọa độ chỉ có trong bài Robot. Reader nhận token cách
            nhau bằng khoảng trắng; dòng trống được bỏ qua. Giới hạn mô phỏng: T
            ≤ {LIMITS.cases}, R ≤ {LIMITS.rows}, C ≤ {LIMITS.cols}, tổng ≤{" "}
            {LIMITS.totalCells} ô.
          </p>
        </div>
        <div className="gl-input-columns">
          <label>
            Input · tương đương System.in
            <textarea
              aria-label="Grid input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFile(undefined);
              }}
              spellCheck={false}
            />
          </label>
          <label>
            Expected · một dòng / test
            <textarea
              aria-label="Grid expected"
              value={output}
              placeholder="Để trống: tính bằng bộ kiểm tra độc lập"
              onChange={(e) => setOutput(e.target.value)}
              spellCheck={false}
            />
            <small>
              Actual được tạo bởi thuật toán, chỉ xuất hiện khi debug đến
              println. Expected không điều khiển kết quả chạy.
            </small>
          </label>
        </div>
        <div className="gl-file-row">
          <label className="gl-button">
            <Upload size={14} /> Đọc file .txt
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 65536) {
                  setError("File tối đa 64 KiB.");
                  return;
                }
                setText(await f.text());
                setFile(f.name);
                setError("");
              }}
              hidden
            />
          </label>
          <span>{file ?? "Paste → System.in"}</span>
          <button
            onClick={() => {
              setText(serializeGridInput(gridExample(problem), problem));
              setOutput("");
              setFile(undefined);
            }}
          >
            Nạp mẫu 2 test
          </button>
        </div>
        <p>
          Java tải về chạy với <code>javac Main.java</code>, rồi{" "}
          <code>java Main input.txt</code> trên máy cá nhân; nộp bài dùng{" "}
          <code>java Main</code> đọc System.in. Thuật toán không đổi.
        </p>
        {error && (
          <p role="alert" className="gl-error">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button onClick={onClose}>Hủy</button>
        <button
          className="gl-primary"
          onClick={() => {
            try {
              const cases = parseGridInput(text, problem);
              parseExpected(output, cases.length);
              onApply(text, output, file);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Áp dụng & tạo replay
        </button>
      </footer>
    </GridDialog>
  );
}
export function MapDialog({
  cases,
  problem,
  onClose,
  onApply,
}: {
  cases: readonly GridCase[];
  problem: GridProblem;
  onClose: () => void;
  onApply: (input: string) => void;
}) {
  const [draft, setDraft] = useState<readonly GridCase[]>(cases),
    [selected, setSelected] = useState(0),
    [brush, setBrush] = useState("empty"),
    [error, setError] = useState("");
  const test = draft[selected],
    points = PROBLEMS[problem].hasPoints,
    islands = problem === "islands";
  function replace(next: GridCase) {
    setDraft((list) => list.map((item, i) => (i === selected ? next : item)));
  }
  function resize(rows: number, cols: number) {
    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(cols) ||
      rows < 1 ||
      rows > LIMITS.rows ||
      cols < 1 ||
      cols > LIMITS.cols
    )
      return;
    const start = {
        r: Math.min(rows - 1, test.start.r),
        c: Math.min(cols - 1, test.start.c),
      },
      goal = {
        r: Math.min(rows - 1, test.goal.r),
        c: Math.min(cols - 1, test.goal.c),
      };
    const cells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => test.cells[r]?.[c] ?? 0),
    );
    if (points) {
      cells[start.r][start.c] = 0;
      cells[goal.r][goal.c] = 0;
    }
    replace({ rows, cols, cells, start, goal });
  }
  function paint(r: number, c: number) {
    const cells = test.cells.map((row) => [...row]);
    if (brush === "start" || brush === "goal") {
      cells[r][c] = 0;
      replace({ ...test, cells, [brush]: { r, c } });
      return;
    }
    const value =
      brush === "wall" || brush === "land" ? 1 : brush === "item" ? 2 : 0;
    if (
      points &&
      value === 1 &&
      ((test.start.r === r && test.start.c === c) ||
        (test.goal.r === r && test.goal.c === c))
    ) {
      setError("Di chuyển S/G trước khi đặt tường vào ô này.");
      return;
    }
    cells[r][c] = value;
    replace({ ...test, cells });
    setError("");
  }
  return (
    <GridDialog title="Chỉnh bản đồ / test case" onClose={onClose}>
      <div className="gl-dialog-body">
        <div className="gl-map-controls">
          <label>
            Test
            <select
              aria-label="Bản đồ test"
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {draft.map((_, i) => (
                <option value={i} key={i}>
                  #{i + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            R
            <input
              aria-label="Số hàng"
              type="number"
              min="1"
              max={LIMITS.rows}
              value={test.rows}
              onChange={(e) => resize(Number(e.target.value), test.cols)}
            />
          </label>
          <label>
            C
            <input
              aria-label="Số cột"
              type="number"
              min="1"
              max={LIMITS.cols}
              value={test.cols}
              onChange={(e) => resize(test.rows, Number(e.target.value))}
            />
          </label>
          <button
            disabled={draft.length >= LIMITS.cases}
            onClick={() => {
              setDraft([
                ...draft,
                {
                  rows: 4,
                  cols: 5,
                  cells: Array.from(
                    { length: 4 },
                    () => Array(5).fill(0) as number[],
                  ),
                  start: { r: 0, c: 0 },
                  goal: { r: 3, c: 4 },
                },
              ]);
              setSelected(draft.length);
            }}
          >
            <Plus size={13} /> Test
          </button>
          <button
            disabled={draft.length === 1}
            onClick={() => {
              setDraft(draft.filter((_, i) => i !== selected));
              setSelected(0);
            }}
          >
            <Trash2 size={13} /> Xóa test
          </button>
        </div>
        <div className="gl-brushes" aria-label="Công cụ vẽ">
          {(islands
            ? [
                ["empty", "Nước · 0"],
                ["land", "Đất · 1"],
              ]
            : [
                ["empty", "Trống · 0"],
                ["wall", "Tường · 1"],
                ["item", "Vật phẩm · 2"],
                ...(points
                  ? [
                      ["start", "Robot · S"],
                      ["goal", "Đích · G"],
                    ]
                  : []),
              ]
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={brush === id}
              onClick={() => setBrush(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="gl-map-preview">
          <GridBoard
            test={test}
            problem={problem}
            onCell={paint}
            brush={brush}
          />
        </div>
        <p>
          Chọn công cụ rồi click ô. Mọi thay đổi được áp dụng cùng lúc để grid,
          input, code và debugger luôn khớp. Expected chuyển về bộ kiểm tra độc
          lập.
        </p>
        {error && (
          <p role="alert" className="gl-error">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button onClick={onClose}>Hủy</button>
        <button
          className="gl-primary"
          onClick={() => {
            try {
              const text = serializeGridInput(draft, problem);
              parseGridInput(text, problem);
              onApply(text);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Áp dụng bản đồ
        </button>
      </footer>
    </GridDialog>
  );
}
export function TheoryDialog({ onClose }: { onClose: () => void }) {
  return (
    <GridDialog title="Grid: từ ma trận đến đồ thị" onClose={onClose}>
      <div className="gl-dialog-body gl-theory">
        <p>
          <b>1. Duyệt dữ liệu.</b> Hai vòng lặp truy cập grid[r][c] lần lượt
          theo hàng hoặc cột. Không phải nhân vật đang di chuyển: vòng lặp có
          thể đọc ô tường. Zigzag đổi chiều ở hàng lẻ. Flatten sao chép vào
          int[] rồi dùng id / C và id % C để trở về tọa độ.
        </p>
        <p>
          <b>2. Đồ thị ngầm.</b> Mỗi ô đi được là một Vertex; hai ô chung cạnh
          tạo một Edge. Sinh tối đa 4 láng giềng từ DR/DC, không cần lưu riêng
          mọi cạnh. Kiểm tra biên trước khi đọc grid[nr][nc]. Ma trận grid lưu
          địa hình, <em>không phải adjacency matrix V×V</em>.
        </p>
        <p>
          <b>3. Queue và Stack (xem trước).</b> BFS lấy phần tử thêm sớm nhất;
          với cạnh cùng trọng số, BFS tìm đường ngắn nhất. DFS iterative lấy
          phần tử thêm gần nhất để đi sâu; không đảm bảo đường ngắn nhất. Stack
          ở đây là Deque do chương trình tạo, không phải recursive Call Stack.
          Đánh dấu seen trước khi đưa vào frontier để tránh thêm trùng.
        </p>
        <p>
          <b>4. Độ phức tạp.</b> Quét đủ ma trận: O(RC) thời gian, O(1) bộ nhớ
          phụ; flatten thêm O(RC) bộ nhớ và một lượt sao chép. BFS/DFS grid:
          O(V+E) = O(RC), seen/frontier O(RC). Dừng sớm có thể giảm ô xử lý; vẫn
          phải đọc đầy đủ input trước khi gọi solve.
        </p>
        <p>
          <b>5. Đọc và kiểm tra.</b> BufferedReader đọc dòng, StringTokenizer
          tách token, Integer.parseInt chuyển số. Dòng đầu T, mỗi test có kích
          thước, tọa độ nếu bài cần, rồi ma trận. Main sở hữu grid; solve/flood
          sở hữu biến cục bộ. Biến mất khỏi Watch sau khi return; ảnh bộ nhớ cũ
          được giữ để xem lại.
        </p>
        <p>
          <b>Buổi 2:</b> bắt đầu với kiểm kê / tìm vật phẩm và vòng lặp. BFS/DFS
          chỉ giới thiệu vai trò Queue/Stack để chuẩn bị buổi tiếp theo. Trang
          này là step replay của Java, không chạy JVM trong trình duyệt. Tài
          liệu Syllabus và slide chưa được đính kèm để đối chiếu nội dung gốc.
        </p>
      </div>
      <footer>
        <button className="gl-primary" onClick={onClose}>
          Đã hiểu
        </button>
      </footer>
    </GridDialog>
  );
}
