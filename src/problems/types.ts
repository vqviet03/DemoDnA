import type { JavaSource } from "@/engine/types";
import type { Matrix, Scope } from "@/grid/types";
export type ProblemId = "coloring" | "origami";
export type MethodId =
  "mask" | "dfs" | "subset" | "fold" | "mapping" | "layers";
export interface ProblemCase {
  readonly rows: number;
  readonly cols: number;
  readonly parts: number;
  readonly cells: Matrix<number>;
}
export interface ProblemSpec {
  title: string;
  subtitle: string;
  methods: readonly MethodId[];
  format: string;
  constraints: string;
  question: string;
}
export const PROBLEMS: Record<ProblemId, ProblemSpec> = {
  coloring: {
    title: "Tô màu ô",
    subtitle: "Bốn ô kề · chọn dấu ±",
    methods: ["mask", "dfs", "subset"],
    format: "T\nN M\nN dòng × M số nguyên",
    constraints: "5 ≤ N, M ≤ 50 · −20 ≤ a[r][c] ≤ 20",
    question:
      "Tô một ô nếu có thể gán dấu + hoặc − cho TẤT CẢ các ô kề hợp lệ để tổng bằng giá trị ô đó. Không xét ô chéo, không đi xuyên biên; dấu trừ được phép ở số đầu tiên.",
  },
  origami: {
    title: "Origami",
    subtitle: "Gấp nếp bậc thang · cộng các lớp",
    methods: ["fold", "mapping", "layers"],
    format: "T\nN M\nN dòng × N số nguyên",
    constraints: "1 ≤ N ≤ 100 · M chia hết N · 1 ≤ a[r][c] ≤ 100",
    question:
      "Chia N cột thành M dải bằng nhau, mỗi dải rộng K = N/M. Gấp luân phiên để giấy còn N × K; cộng các số chồng lên nhau và tìm tổng lớn nhất. Không gấp theo hàng.",
  },
};
export const METHODS: Record<
  MethodId,
  { title: string; idea: string; time: string; space: string }
> = {
  mask: {
    title: "Bitmask · thử dấu ±",
    idea: "Mỗi bit chọn một dấu. Có tối đa 4 ô kề nên chỉ cần thử nhiều nhất 16 cách.",
    time: "O(NM · 2⁴ · 4)",
    space: "O(4) phụ",
  },
  dfs: {
    title: "DFS · đệ quy chọn dấu",
    idea: "Mỗi tầng chọn + hoặc − cho một số. Tìm được tổng đúng thì return true ngược qua Call Stack.",
    time: "O(NM · 2⁴)",
    space: "O(4) Call Stack",
  },
  subset: {
    title: "Subset Sum · biến đổi tổng",
    idea: "target = 2 × tổng nhóm mang dấu + − tổng tất cả. Nếu target + total lẻ, loại ngay; số âm vẫn được giữ nguyên.",
    time: "O(NM · 2⁴ · 4)",
    space: "O(4) phụ",
  },
  fold: {
    title: "Mô phỏng từng lần gấp",
    idea: "Gấp chồng giấy từ phải sang trái. Lật ma trận đang giữ, rồi cộng vào dải liền trái. Mỗi lần lật tương ứng một animation gấp thực.",
    time: "O(N²)",
    space: "O(N · K) phụ",
  },
  mapping: {
    title: "Ánh xạ cột · một lượt",
    idea: "Dải chẵn giữ chiều cột; dải lẻ đảo cột. Cộng từng ô nguồn vào đúng vị trí sau gấp.",
    time: "O(N²)",
    space: "O(N · K) phụ",
  },
  layers: {
    title: "Gom theo ô · duyệt các lớp",
    idea: "Với mỗi ô đích, tìm lần lượt ô nguồn ở từng dải. Tách rõ vị trí đích và lớp giấy đang góp số.",
    time: "O(N²)",
    space: "O(N · K) phụ",
  },
};
export interface Neighbor {
  readonly r: number;
  readonly c: number;
  readonly value: number;
}
export interface ProblemStep {
  readonly id: string;
  readonly marker: string;
  readonly activeLines: readonly number[];
  readonly title: string;
  readonly explanation: string;
  readonly scopes: Readonly<Record<string, Scope>>;
  readonly callStack: readonly string[];
  readonly current: readonly [number, number] | null;
  readonly target: readonly [number, number] | null;
  readonly neighbors: readonly Neighbor[];
  readonly signs: readonly number[];
  readonly sum: number | null;
  readonly results: Matrix<number>;
  readonly marks: Matrix<number>;
  readonly folded: number;
  readonly foldFrom: number | null;
  readonly answer: number;
  readonly output: string | null;
  readonly phase: "input" | "solve" | "output";
  readonly tick: number;
  readonly detail: boolean;
}
export interface ProblemRun {
  readonly problem: ProblemId;
  readonly method: MethodId;
  readonly test: ProblemCase;
  readonly caseIndex: number;
  readonly code: JavaSource;
  readonly steps: readonly ProblemStep[];
  readonly operations: number;
  readonly generateMs: number;
  readonly answer: number;
  readonly result: Matrix<number>;
  readonly marks: Matrix<number>;
  readonly detailed: boolean;
  readonly focus: readonly [number, number] | null;
}
export interface SolveResult {
  readonly answer: number;
  readonly result: Matrix<number>;
  readonly marks: Matrix<number>;
  readonly operations: number;
}
