import type { JavaSource } from "@/engine/types";
import type { Scope } from "@/grid/types";
export type TreeProblem = "leaves" | "depth";
export type TreeMethod =
  | "degree"
  | "parents-set"
  | "leaf-bfs"
  | "leaf-dfs"
  | "parent-walk"
  | "depth-bfs"
  | "depth-dfs"
  | "memo-depth";
export interface TreeCase {
  readonly n: number;
  readonly edges: readonly (readonly [number, number])[];
  readonly queries: readonly number[];
}
export const TREE_PROBLEMS: Record<
  TreeProblem,
  {
    title: string;
    tab: string;
    methods: readonly TreeMethod[];
    question: string;
    format: string;
    pdfPage: number;
  }
> = {
  leaves: {
    title: "Bài 9 · Đếm số nút lá",
    tab: "09 · Đếm nút lá",
    methods: ["degree", "parents-set", "leaf-bfs", "leaf-dfs"],
    question:
      "Cây có gốc tại 1. Mỗi cạnh u v có hướng cha → con. Đếm nút không có con; cây một nút có một nút lá. Root có một con không phải nút lá.",
    format: "T\nN\nN−1 dòng u v (u là cha của v)",
    pdfPage: 1,
  },
  depth: {
    title: "Bài 10 · Tìm độ sâu của một nút",
    tab: "10 · Độ sâu nút",
    methods: ["parent-walk", "depth-bfs", "depth-dfs", "memo-depth"],
    question:
      "Độ sâu là số cạnh từ root 1 tới nút x, không phải số nút trên đường đi. depth[1] = 0. Trả lời Q truy vấn, giữ đúng thứ tự input.",
    format: "T\nN Q\nN−1 dòng u v\nQ dòng x",
    pdfPage: 3,
  },
};
export const TREE_METHODS: Record<
  TreeMethod,
  { title: string; idea: string; time: string; space: string }
> = {
  degree: {
    title: "Đếm số con · out-degree",
    idea: "Mỗi cạnh u → v tăng số con của u. Quét ID 1…N; số con bằng 0 thì là leaf. Không cần duyệt cây.",
    time: "O(N)",
    space: "O(N)",
  },
  "parents-set": {
    title: "HashSet các nút cha",
    idea: "Lưu những ID xuất hiện ở vị trí cha vào Set. Mỗi nút còn lại là leaf: N − số nút cha khác nhau. Không đếm lặp một cha có nhiều con.",
    time: "O(N) kỳ vọng",
    space: "O(N)",
  },
  "leaf-bfs": {
    title: "BFS · Queue FIFO",
    idea: "Từ root, lấy nút ở FRONT. Nếu danh sách con rỗng, tăng số leaf; đưa từng con vào REAR. Duyệt theo từng tầng.",
    time: "O(N)",
    space: "O(N)",
  },
  "leaf-dfs": {
    title: "DFS iterative · Stack LIFO",
    idea: "Pop nút ở TOP rồi push các con theo thứ tự đảo. Đi sâu trước; Stack do chương trình quản lý, tránh đệ quy sâu 10.000 tầng.",
    time: "O(N)",
    space: "O(N)",
  },
  "parent-walk": {
    title: "Lần theo parent · từng truy vấn",
    idea: "Lưu parent[v] = u. Từ x đi ngược tới root, mỗi cạnh tăng độ sâu 1. Dễ hiểu nhưng lặp lại công việc khi có nhiều truy vấn.",
    time: "O(N + Q·H)",
    space: "O(N + Q)",
  },
  "depth-bfs": {
    title: "BFS · tính sẵn depth[]",
    idea: "Gán depth[root] = 0. Khi xét con v của u, gán depth[v] = depth[u] + 1. Sau một lượt BFS, mỗi truy vấn chỉ đọc một ô.",
    time: "O(N + Q)",
    space: "O(N + Q)",
  },
  "depth-dfs": {
    title: "DFS iterative · tính sẵn depth[]",
    idea: "Dùng Stack để đi sâu. Độ sâu con được gán trước khi push. Kết quả giống BFS dù thứ tự thăm khác nhau.",
    time: "O(N + Q)",
    space: "O(N + Q)",
  },
  "memo-depth": {
    title: "Parent + ghi nhớ độ sâu",
    idea: "Chỉ lần theo các cha chưa biết depth. Đẩy đường đi vào Stack, rồi pop từ gần tổ tiên đã biết để điền depth. Truy vấn lặp dùng lại kết quả.",
    time: "O(N + Q) tổng cộng",
    space: "O(N + Q)",
  },
};
export interface TreeMetrics {
  readonly edgeReads: number;
  readonly visits: number;
  readonly pushes: number;
  readonly pops: number;
  readonly writes: number;
  readonly answered: number;
  readonly peakFrontier: number;
}
export interface TreeSolution {
  readonly values: readonly number[];
  readonly metrics: TreeMetrics;
  readonly depth: readonly number[];
}
export type TreeMark = "unseen" | "pending" | "done" | "leaf";
export interface TreeNodeView {
  readonly id: number;
  readonly parent: number;
  readonly children: readonly number[];
  readonly childCount: number;
  readonly degree: number;
  readonly depth: number;
  readonly mark: TreeMark;
}
export interface TreeScene {
  readonly phase: "input" | "build" | "solve" | "query" | "output";
  readonly current: number | null;
  readonly neighbor: number | null;
  readonly activeEdge: readonly [number, number] | null;
  readonly edgeWindowStart: number;
  readonly edgeRows: readonly (readonly number[])[];
  readonly parentsPreview: readonly number[];
  readonly parentSetSize: number;
  readonly loadedEdges: number;
  readonly representedEdges: number;
  readonly inputPart: "edges" | "queries" | "ready";
  readonly queryIndex: number;
  readonly queryNode: number | null;
  readonly nodes: readonly TreeNodeView[];
  readonly frontier: readonly number[];
  readonly frontierSize: number;
  readonly frontierKind: "queue" | "stack" | "path" | null;
  readonly leafCount: number;
  readonly answersStart: number;
  readonly answersTotal: number;
  readonly answers: readonly (number | null)[];
  readonly output: string | null;
  readonly work: TreeMetrics;
  readonly loadedQueries: number;
}
export interface TreeStep {
  readonly id: string;
  readonly marker: string;
  readonly activeLines: readonly number[];
  readonly title: string;
  readonly explanation: string;
  readonly scopes: Readonly<Record<string, Scope>>;
  readonly callStack: readonly string[];
  readonly scene: TreeScene;
  readonly tick: number;
  readonly omittedBefore: number;
}
export interface TreeRun {
  readonly problem: TreeProblem;
  readonly method: TreeMethod;
  readonly test: TreeCase;
  readonly caseIndex: number;
  readonly tests: number;
  readonly code: JavaSource;
  readonly steps: readonly TreeStep[];
  readonly detailed: boolean;
  readonly focusNode: number;
  readonly solution: TreeSolution;
  readonly generateMs: number;
  readonly operations: number;
}
