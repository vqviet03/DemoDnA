import type { JavaSource } from "@/engine/types";
export type GridProblem = "collect" | "find" | "reach" | "shortest" | "islands";
export type GridAlgorithm =
  "row" | "column" | "snake" | "linear" | "bfs" | "dfs";
export type Matrix<T> = readonly (readonly T[])[];
export interface Point {
  readonly r: number;
  readonly c: number;
}
export interface GridCase {
  readonly rows: number;
  readonly cols: number;
  readonly cells: Matrix<number>;
  readonly start: Point;
  readonly goal: Point;
}
export type CellStatus = "unseen" | "queued" | "done" | "path" | "skipped";
export type GridPhase =
  "input" | "scan" | "expand" | "trace" | "result" | "output";
export type WatchData =
  | string
  | number
  | boolean
  | null
  | readonly (number | string)[]
  | Matrix<number | boolean>;
export interface WatchValue {
  readonly type: string;
  readonly value: WatchData;
}
export type Scope = Readonly<Record<string, WatchValue>>;
export interface Counters {
  readonly inputReads: number;
  readonly cellReads: number;
  readonly writes: number;
  readonly checks: number;
  readonly discovered: number;
  readonly processed: number;
  readonly pushed: number;
  readonly popped: number;
  readonly peakFrontier: number;
  readonly peakBytes: number;
}
export interface GridMemory {
  readonly grid: Matrix<number>;
  readonly loaded: Matrix<boolean>;
  readonly seen: Matrix<boolean>;
  readonly dist: Matrix<number>;
  readonly parent: Matrix<number>;
  readonly flat: readonly number[];
  readonly frontier: readonly number[];
  readonly path: readonly number[];
  readonly seenAllocated: boolean;
  readonly distAllocated: boolean;
  readonly flatAllocated: boolean;
  readonly frontierAllocated: boolean;
  readonly privateActive: boolean;
}
export interface CaseReport {
  readonly caseIndex: number;
  readonly rows: number;
  readonly cols: number;
  readonly output: string;
  readonly steps: number;
  readonly inputSteps: number;
  readonly solveSteps: number;
  readonly resultAt: number;
  readonly counts: Counters;
}
export interface GridStep {
  readonly id: string;
  readonly activeLines: readonly number[];
  readonly marker: string;
  readonly title: string;
  readonly explanation: string;
  readonly caseIndex: number;
  readonly phase: GridPhase;
  readonly scopes: Readonly<Record<string, Scope>>;
  readonly callStack: readonly string[];
  readonly memory: GridMemory;
  readonly status: readonly CellStatus[];
  readonly current: Point | null;
  readonly neighbor: Point | null;
  readonly counts: Counters;
  readonly payloadBytes: number;
  readonly outputs: readonly string[];
  readonly reports: readonly CaseReport[];
  readonly inputCursor: {
    readonly line: number;
    readonly token: number;
    readonly consumed: number;
    readonly total: number;
  };
  readonly condition: string | null;
}
export interface GridRun {
  readonly code: JavaSource;
  readonly steps: readonly GridStep[];
  readonly cases: readonly GridCase[];
  readonly input: string;
  readonly problem: GridProblem;
  readonly algorithm: GridAlgorithm;
  readonly expected: readonly string[];
  readonly generateMs: number;
  readonly caseGenerateMs: readonly number[];
}
export const LIMITS = {
  cases: 8,
  rows: 12,
  cols: 16,
  totalCells: 512,
} as const;
export const ALGORITHMS: Record<GridAlgorithm, string> = {
  row: "Theo hàng · 2 vòng lặp",
  column: "Theo cột · 2 vòng lặp",
  snake: "Zigzag · hàng chẵn/lẻ",
  linear: "Mảng 1D · flatten",
  bfs: "BFS · Queue (xem trước)",
  dfs: "DFS iterative · Stack (xem trước)",
};
export const PROBLEMS: Record<
  GridProblem,
  {
    title: string;
    question: string;
    algorithms: readonly GridAlgorithm[];
    output: string;
    legend: string;
    hasPoints: boolean;
  }
> = {
  collect: {
    title: "Kiểm kê vật phẩm",
    question:
      "Đọc toàn bộ ma trận và đếm ô có vật phẩm (giá trị 2). Đây là truy cập dữ liệu, không phải nhân vật đi qua tường.",
    algorithms: ["row", "column", "snake", "linear"],
    output: "Một số nguyên: tổng số vật phẩm.",
    legend: "0 = ô trống, 1 = tường, 2 = vật phẩm",
    hasPoints: false,
  },
  find: {
    title: "Tìm vật phẩm đầu tiên",
    question:
      "Tìm ô 2 đầu tiên theo thứ tự duyệt đã chọn. Dừng ngay khi tìm thấy; kết quả có thể khác giữa duyệt hàng và cột.",
    algorithms: ["row", "column", "snake", "linear"],
    output: "r c (tọa độ từ 0), hoặc -1 -1 nếu không có.",
    legend: "0 = ô trống, 1 = tường, 2 = vật phẩm",
    hasPoints: false,
  },
  reach: {
    title: "Robot có tới đích không?",
    question:
      "Từ S, chỉ đi 4 hướng qua ô không phải tường. BFS/DFS trả YES/NO; đường DFS tìm được không nhất thiết ngắn nhất.",
    algorithms: ["bfs", "dfs"],
    output: "YES nếu tới được G, ngược lại NO.",
    legend: "0 = đường, 1 = tường, 2 = vật phẩm (đi qua được)",
    hasPoints: true,
  },
  shortest: {
    title: "Robot · đường đi ngắn nhất",
    question:
      "BFS dùng Queue FIFO để tìm ít bước đi nhất từ S đến G. Mỗi cạnh là một bước sang ô kề, mọi cạnh có trọng số 1.",
    algorithms: ["bfs"],
    output: "Số bước đi ngắn nhất; -1 nếu không có đường.",
    legend: "0 = đường, 1 = tường, 2 = vật phẩm (đi qua được)",
    hasPoints: true,
  },
  islands: {
    title: "Đếm các vùng đất",
    question:
      "Đếm các nhóm ô 1 nối nhau theo 4 hướng. Mỗi lần gặp một ô đất chưa thăm, tăng số vùng rồi đánh dấu toàn bộ vùng đó.",
    algorithms: ["bfs", "dfs"],
    output: "Một số nguyên: số thành phần liên thông của đất.",
    legend: "0 = nước, 1 = đất; không có S/G",
    hasPoints: false,
  },
};
