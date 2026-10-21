import {
  TREE_PROBLEMS,
  type TreeCase,
  type TreeMark,
  type TreeMethod,
  type TreeMetrics,
  type TreeProblem,
  type TreeSolution,
} from "./types";
export type Scalar = number | string | boolean | null;
export type Frame = "main" | "solve" | "buildChildren";
export type Ref =
  | "edges"
  | "edge"
  | "queries"
  | "answer"
  | "degree"
  | "parent"
  | "depth"
  | "children"
  | "parents"
  | "work"
  | "path";
export interface TreeMachine {
  phase: "input" | "build" | "solve" | "query" | "output";
  main: Record<string, Scalar>;
  local: Record<string, Scalar>;
  helper: Record<string, Scalar>;
  frame: Frame;
  mainRefs: Set<Ref>;
  solveRefs: Set<Ref>;
  helperRefs: Set<Ref>;
  edge: number[];
  rawEdges: number[][];
  inputQueries: number[];
  children: number[][];
  parent: number[];
  degree: number[];
  depth: number[];
  parents: Set<number>;
  work: number[];
  head: number;
  frontierKind: "queue" | "stack" | "path" | null;
  marks: TreeMark[];
  answer: number[];
  answerReady: boolean[];
  queryIndex: number;
  queryNode: number | null;
  current: number | null;
  neighbor: number | null;
  activeEdge: readonly [number, number] | null;
  loadedEdges: number;
  representedEdges: number;
  loadedQueries: number;
  inputPart: "edges" | "queries" | "ready";
  leafCount: number;
  output: string | null;
  metrics: { -readonly [K in keyof TreeMetrics]: TreeMetrics[K] };
}
export type TreeEmit = (
  marker: string,
  title: string,
  explanation: string,
  category?: "setup" | "input" | "edge" | "node" | "query",
  force?: boolean,
) => void;
export function newMachine(
  test: TreeCase,
  tests: number,
  tc: number,
): TreeMachine {
  return {
    phase: "input",
    main: { tests, tc: tc + 1 },
    local: {},
    helper: {},
    frame: "main",
    mainRefs: new Set(),
    solveRefs: new Set(),
    helperRefs: new Set(),
    edge: [],
    rawEdges: [],
    inputQueries: [],
    children: [],
    parent: [],
    degree: [],
    depth: [],
    parents: new Set(),
    work: [],
    head: 0,
    frontierKind: null,
    marks: Array<TreeMark>(test.n + 1).fill("unseen"),
    answer: [],
    answerReady: [],
    queryIndex: -1,
    queryNode: null,
    current: null,
    neighbor: null,
    activeEdge: null,
    loadedEdges: 0,
    representedEdges: 0,
    loadedQueries: 0,
    inputPart: "edges",
    leafCount: 0,
    output: null,
    metrics: {
      edgeReads: 0,
      visits: 0,
      pushes: 0,
      pops: 0,
      writes: 0,
      answered: 0,
      peakFrontier: 0,
    },
  };
}
export function frontierSize(s: TreeMachine): number {
  return s.work.length - (s.frontierKind === "queue" ? s.head : 0);
}
export function frontierValues(s: TreeMachine, limit = Infinity): number[] {
  return s.frontierKind === "queue"
    ? s.work.slice(s.head, s.head + limit)
    : s.work.slice(Math.max(0, s.work.length - limit)).reverse();
}
export function executeTree(
  test: TreeCase,
  problem: TreeProblem,
  method: TreeMethod,
  s: TreeMachine,
  emit?: TreeEmit,
  options: { detailed?: boolean; focusQuery?: number } = {},
): TreeSolution {
  if (!TREE_PROBLEMS[problem].methods.includes(method))
    throw new Error("Cách giải không thuộc bài toán.");
  const n = test.n,
    q = test.queries.length,
    l = s.local,
    m = s.main;
  const caseNumber = m.tc;
  delete m.tc;
  const node = (value: number | null, neighbor: number | null = null) => {
    s.current = value;
    s.neighbor = neighbor;
    s.activeEdge =
      value !== null && neighbor !== null ? [value, neighbor] : null;
  };
  const push = (v: number) => {
    s.work.push(v);
    s.marks[v] = "pending";
    s.metrics.pushes++;
    s.metrics.peakFrontier = Math.max(s.metrics.peakFrontier, frontierSize(s));
  };
  const pop = () => {
    const v = s.frontierKind === "queue" ? s.work[s.head++] : s.work.pop()!;
    s.metrics.pops++;
    return v;
  };
  emit?.(
    "tests",
    "Đọc T",
    "nextInt dùng BufferedReader + StringTokenizer; helper được thu gọn.",
    "setup",
    true,
  );
  m.tc = caseNumber;
  emit?.(
    "testLoop",
    `Test #${m.tc}`,
    "Timeline chỉ replay testcase đang chọn; các test khác xem bằng bộ chọn Test.",
    "setup",
    true,
  );
  m.n = n;
  emit?.(
    "n",
    "Đọc N",
    `Cây có ${n} nút, nhãn 1…${n}; root = 1.`,
    "setup",
    true,
  );
  if (problem === "depth") {
    m.q = q;
    emit?.(
      "queryCount",
      "Đọc Q",
      `Có ${q} truy vấn; kết quả phải giữ đúng thứ tự input.`,
      "setup",
      true,
    );
  }
  s.rawEdges = Array.from({ length: n - 1 }, () => [0, 0]);
  s.mainRefs.add("edges");
  emit?.(
    "edgesNew",
    "Cấp phát danh sách cạnh",
    `int[${n - 1}][2], ban đầu mọi ô bằng 0.`,
    "setup",
    true,
  );
  for (let i = 0; i < n - 1; i++) {
    const [u, v] = test.edges[i];
    delete m.u;
    delete m.v;
    m.i = i;
    node(null);
    emit?.(
      "edgeLoop",
      `Cạnh input ${i + 1}/${n - 1}`,
      "u là cha, v là con; không tự thêm cạnh ngược.",
      "input",
    );
    m.u = u;
    node(u);
    emit?.(
      "readU",
      `Đọc cha u = ${u}`,
      "Chưa lưu cạnh vì còn phải đọc v.",
      "input",
    );
    m.v = v;
    node(u, v);
    emit?.(
      "readV",
      `Đọc con v = ${v}`,
      "Cặp u v mô tả quan hệ cha → con.",
      "input",
    );
    s.rawEdges[i][0] = u;
    emit?.(
      "storeU",
      `edges[${i}][0] = ${u}`,
      "Lưu đầu cha; cột con vẫn chưa được gán.",
      "input",
    );
    s.rawEdges[i][1] = v;
    s.loadedEdges = i + 1;
    emit?.(
      "storeV",
      `Lưu cạnh ${u} → ${v}`,
      "Cạnh liền trong hình đã có đủ hai đầu trong edges[][].",
      "input",
    );
  }
  delete m.i;
  delete m.u;
  delete m.v;
  node(null);
  if (problem === "depth") {
    s.inputPart = "queries";
    s.inputQueries = Array<number>(q).fill(0);
    s.mainRefs.add("queries");
    emit?.(
      "queriesNew",
      "Cấp phát queries[]",
      `Mảng int[${q}] chứa các nút cần hỏi, chưa phải kết quả.`,
      "setup",
      true,
    );
    for (let i = 0; i < q; i++) {
      m.i = i;
      s.queryIndex = i;
      s.queryNode = test.queries[i];
      emit?.(
        "queryReadLoop",
        `Đọc truy vấn ${i + 1}/${q}`,
        "Mỗi truy vấn là một ID x.",
        "input",
      );
      s.inputQueries[i] = test.queries[i];
      s.loadedQueries = i + 1;
      node(test.queries[i]);
      emit?.(
        "readQuery",
        `queries[${i}] = ${test.queries[i]}`,
        "Chỉ lưu input, chưa tính độ sâu.",
        "input",
      );
    }
    delete m.i;
    s.queryIndex = -1;
    s.queryNode = null;
    node(null);
  }
  s.inputPart = "ready";
  emit?.(
    "solveCall",
    "Gọi solve",
    "edges và queries được truyền bằng reference; solve có scope riêng.",
    "setup",
    true,
  );
  s.phase = "solve";
  s.frame = "solve";
  l.n = n;
  const makeParent = () => {
    s.parent = Array<number>(n + 1).fill(0);
    s.solveRefs.add("parent");
    emit?.(
      "parentNew",
      "Cấp phát parent[]",
      "ID 0 không dùng; parent[1] = 0 vì root không có cha.",
      "setup",
      true,
    );
    for (const [u, v] of test.edges) {
      s.edge = [u, v];
      s.solveRefs.add("edge");
      delete l.u;
      delete l.v;
      node(u, v);
      emit?.("parentEdgeLoop", "Xét một cạnh input", `${u} → ${v}.`, "edge");
      l.u = u;
      emit?.("parentU", "Đọc ID cha", `u = ${u}.`, "edge");
      l.v = v;
      emit?.("parentV", "Đọc ID con", `v = ${v}.`, "edge");
      s.parent[v] = u;
      s.representedEdges++;
      s.metrics.edgeReads++;
      s.metrics.writes++;
      emit?.(
        "parentSet",
        `parent[${v}] = ${u}`,
        "Mỗi nút khác root có đúng một cha. Cạnh có thể nhập theo bất kỳ thứ tự nào.",
        "edge",
      );
    }
    s.solveRefs.delete("edge");
    delete l.u;
    delete l.v;
    node(null);
  };
  const makeDepth = () => {
    s.depth = Array<number>(n + 1).fill(0);
    s.solveRefs.add("depth");
    emit?.(
      "depthNew",
      "Cấp phát depth[]",
      "Mảng int mới chứa số 0; chưa dùng những số này làm đáp án.",
      "setup",
      true,
    );
    s.depth.fill(-1);
    s.metrics.writes += n + 1;
    emit?.(
      "fillDepth",
      "Đánh dấu chưa biết = −1",
      "Arrays.fill được thu gọn thành một lệnh Java.",
      "setup",
      true,
    );
    s.depth[1] = 0;
    s.metrics.writes++;
    emit?.(
      "rootDepth",
      "depth[1] = 0",
      "Độ sâu là số cạnh từ root, nên root có độ sâu 0.",
      "setup",
      true,
    );
  };
  const makeAnswer = () => {
    s.answer = Array<number>(q).fill(0);
    s.answerReady = Array<boolean>(q).fill(false);
    s.solveRefs.add("answer");
    emit?.(
      "answerNew",
      "Cấp phát answer[]",
      "Các số 0 mặc định chưa phải đáp án đã tính. Bảng query dùng trạng thái chờ riêng.",
      "setup",
      true,
    );
  };
  const buildChildren = () => {
    s.phase = "build";
    emit?.(
      "buildCall",
      "Gọi buildChildren",
      "Tạo Adjacency List từ Edge List; thứ tự con theo input.",
      "setup",
      true,
    );
    s.frame = "buildChildren";
    s.helper = { n };
    s.children = [];
    s.helperRefs.add("children");
    emit?.(
      "childrenNew",
      "Tạo danh sách ngoài",
      "List<List<Integer>> gồm một list con cho mỗi ID.",
      "setup",
      true,
    );
    for (let id = 0; id <= n; id++) {
      s.helper.id = id;
      emit?.(
        "childListLoop",
        `Chuẩn bị list cho ID ${id}`,
        "Phải cấp phát từng list con trước khi add cạnh.",
        "node",
      );
      s.children.push([]);
      emit?.(
        "childListNew",
        `children[${id}] = []`,
        id === 0 ? "ID 0 không sử dụng." : "List con đang rỗng.",
        "node",
      );
    }
    delete s.helper.id;
    for (const [u, v] of test.edges) {
      s.edge = [u, v];
      s.helperRefs.add("edge");
      delete s.helper.u;
      delete s.helper.v;
      node(u, v);
      emit?.("buildEdgeLoop", "Đọc cạnh để dựng list", `${u} → ${v}.`, "edge");
      s.helper.u = u;
      emit?.("buildU", "Lấy cha", `u = ${u}.`, "edge");
      s.helper.v = v;
      emit?.("buildV", "Lấy con", `v = ${v}.`, "edge");
      s.children[u].push(v);
      s.representedEdges++;
      s.metrics.edgeReads++;
      s.metrics.writes++;
      emit?.(
        "link",
        `children[${u}].add(${v})`,
        "Chỉ lưu con của u. Cây này không phải BST và có thể có nhiều hơn hai con.",
        "edge",
      );
    }
    s.helperRefs.delete("edge");
    delete s.helper.u;
    delete s.helper.v;
    node(null);
    emit?.(
      "childrenReturn",
      "Trả children",
      "Kết thúc frame buildChildren.",
      "setup",
      true,
    );
    s.frame = "solve";
    s.helperRefs.clear();
    s.solveRefs.add("children");
    s.phase = "solve";
    emit?.(
      "buildCall",
      "Gán children trong solve",
      "Caller nhận reference tới danh sách vừa dựng.",
      "setup",
      true,
    );
  };
  if (method === "degree") {
    s.degree = Array<number>(n + 1).fill(0);
    s.solveRefs.add("degree");
    emit?.(
      "degreeNew",
      "Cấp phát số con degree[]",
      "Mỗi cạnh chỉ tăng degree của cha, không tăng degree của con.",
      "setup",
      true,
    );
    for (const [u, v] of test.edges) {
      s.edge = [u, v];
      s.solveRefs.add("edge");
      delete l.u;
      delete l.v;
      node(u, v);
      emit?.("degreeEdgeLoop", "Xét cạnh cha–con", `${u} → ${v}.`, "edge");
      l.u = u;
      emit?.("degreeU", "Đọc cha u", `u = ${u}.`, "edge");
      s.degree[u]++;
      s.representedEdges++;
      s.metrics.edgeReads++;
      s.metrics.writes++;
      emit?.(
        "degreeInc",
        `degree[${u}] = ${s.degree[u]}`,
        "Đếm số con, không phải bậc vô hướng.",
        "edge",
      );
    }
    s.solveRefs.delete("edge");
    delete l.u;
    node(null);
    l.count = 0;
    emit?.("countInit", "count = 0", "Chuẩn bị quét tất cả ID.", "setup", true);
    for (let id = 1; id <= n; id++) {
      l.node = id;
      node(id);
      s.metrics.visits++;
      emit?.(
        "nodeLoop",
        `Xét node ${id}`,
        `degree[${id}] = ${s.degree[id]}.`,
        "node",
      );
      emit?.(
        "isLeaf",
        s.degree[id] === 0 ? "Không có con → leaf" : "Có con → không là leaf",
        `${s.degree[id]} == 0 → ${s.degree[id] === 0}.`,
        "node",
      );
      if (s.degree[id] === 0) {
        s.leafCount++;
        l.count = s.leafCount;
        s.marks[id] = "leaf";
        emit?.(
          "leafInc",
          `count = ${s.leafCount}`,
          "Chỉ tăng kết quả ở dòng count++.",
          "node",
        );
      } else s.marks[id] = "done";
    }
    delete l.node;
    node(null);
    emit?.("return", "Trả số nút lá", `count = ${s.leafCount}.`, "setup", true);
  } else if (method === "parents-set") {
    s.solveRefs.add("parents");
    emit?.(
      "setNew",
      "Tạo Set các nút cha",
      "HashSet chỉ giữ mỗi ID một lần.",
      "setup",
      true,
    );
    for (const [u, v] of test.edges) {
      s.edge = [u, v];
      s.solveRefs.add("edge");
      delete l.u;
      delete l.v;
      node(u, v);
      emit?.("setEdgeLoop", "Xét một cạnh", `${u} → ${v}.`, "edge");
      l.u = u;
      emit?.("setParent", "Đọc ID cha", `u = ${u}.`, "edge");
      const existed = s.parents.has(u);
      s.parents.add(u);
      s.metrics.edgeReads++;
      s.metrics.writes += existed ? 0 : 1;
      s.representedEdges++;
      emit?.(
        "setAdd",
        existed ? `Cha ${u} đã có trong Set` : `Thêm cha ${u}`,
        `parents.size() = ${s.parents.size}. Không tăng size khi cha bị lặp.`,
        "edge",
      );
    }
    s.solveRefs.delete("edge");
    delete l.u;
    s.leafCount = n - s.parents.size;
    for (let id = 1; id <= n; id++)
      s.marks[id] = s.parents.has(id) ? "done" : "leaf";
    node(null);
    emit?.(
      "setReturn",
      `N − parents.size() = ${s.leafCount}`,
      "Nút không từng xuất hiện ở vị trí cha chính là leaf. Không cần duyệt từ root.",
      "setup",
      true,
    );
  } else if (
    ["leaf-bfs", "leaf-dfs", "depth-bfs", "depth-dfs"].includes(method)
  ) {
    buildChildren();
    if (problem === "depth") makeDepth();
    const dfs = method.endsWith("dfs");
    s.frontierKind = dfs ? "stack" : "queue";
    s.solveRefs.add("work");
    emit?.(
      "dequeNew",
      dfs ? "Tạo Stack LIFO" : "Tạo Queue FIFO",
      "Dùng Deque<Integer> với ArrayDeque, không dùng java.util.Stack.",
      "setup",
      true,
    );
    push(1);
    node(1);
    emit?.(
      "enqueueRoot",
      dfs ? "Push root 1" : "Offer root 1",
      "Chỉ bắt đầu từ root vì cây hợp lệ, mọi nút đi tới được từ root.",
      "setup",
      true,
    );
    if (problem === "leaves") {
      l.count = 0;
      emit?.("countInit", "count = 0", "Chưa xử lý leaf nào.", "setup", true);
    }
    while (frontierSize(s) > 0) {
      emit?.(
        "workCheck",
        "Kiểm tra bộ nhớ chờ",
        `${frontierSize(s)} nút đang chờ.`,
        "node",
      );
      const id = pop();
      l.node = id;
      node(id);
      s.metrics.visits++;
      emit?.(
        "pop",
        `${dfs ? "Pop TOP" : "Poll FRONT"} → ${id}`,
        dfs
          ? "Nút được thêm gần nhất ra trước."
          : "Nút được thêm sớm nhất ra trước.",
        "node",
      );
      if (problem === "leaves") {
        emit?.(
          "isLeaf",
          s.children[id].length === 0 ? "Danh sách con rỗng" : "Nút còn con",
          `children[${id}].size() = ${s.children[id].length}.`,
          "node",
        );
        if (!s.children[id].length) {
          s.leafCount++;
          l.count = s.leafCount;
          s.marks[id] = "leaf";
          emit?.(
            "leafInc",
            `count = ${s.leafCount}`,
            "Leaf là nút không có con, kể cả root khi N=1.",
            "node",
          );
        }
      }
      const children = dfs ? [...s.children[id]].reverse() : s.children[id];
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        node(id, child);
        if (dfs) {
          delete l.child;
          l.j = children.length - 1 - j;
        } else l.child = child;
        emit?.(
          "childLoop",
          "Xét một nút con",
          `${id} → ${child}; ${dfs ? "đẩy ngược thứ tự để pop theo thứ tự input" : "giữ thứ tự input"}.`,
          "edge",
        );
        if (dfs) {
          l.child = child;
          emit?.(
            "childSelect",
            `child = ${child}`,
            "Lấy ID con ở chỉ số j.",
            "edge",
          );
        }
        if (problem === "depth") {
          s.depth[child] = s.depth[id] + 1;
          s.metrics.writes++;
          emit?.(
            "depthWrite",
            `depth[${child}] = ${s.depth[child]}`,
            `${s.depth[id]} + 1; thêm đúng một cạnh từ cha xuống con.`,
            "edge",
          );
        }
        push(child);
        emit?.(
          "push",
          `${dfs ? "Push" : "Offer"} ${child}`,
          "Đưa nút con vào bộ nhớ chờ, chưa pop/xử lý ngay.",
          "edge",
        );
      }
      delete l.j;
      delete l.child;
      delete l.node;
      if (s.marks[id] !== "leaf") s.marks[id] = "done";
      node(id);
    }
    emit?.(
      "workCheck",
      "Bộ nhớ chờ đã rỗng",
      "Kết thúc lượt duyệt cây.",
      "setup",
      true,
    );
    node(null);
    if (problem === "leaves")
      emit?.(
        "return",
        "Trả số nút lá",
        `count = ${s.leafCount}.`,
        "setup",
        true,
      );
    else {
      makeAnswer();
      for (let i = 0; i < q; i++) {
        s.phase = "query";
        s.queryIndex = i;
        s.queryNode = test.queries[i];
        l.i = i;
        emit?.(
          "queryLoop",
          `Truy vấn ${i + 1}/${q}`,
          "Độ sâu của mọi nút đã được tính sẵn.",
          "query",
        );
        const x = test.queries[i];
        l.x = x;
        node(x);
        emit?.("queryX", `x = ${x}`, "Đọc ID truy vấn.", "query");
        s.answer[i] = s.depth[x];
        s.answerReady[i] = true;
        s.metrics.answered++;
        s.metrics.writes++;
        emit?.(
          "answerWrite",
          `answer[${i}] = ${s.answer[i]}`,
          "Mỗi truy vấn chỉ đọc depth[x], O(1).",
          "query",
        );
        delete l.x;
      }
      delete l.i;
      node(null);
      emit?.(
        "return",
        "Trả mảng kết quả",
        "Giữ nguyên thứ tự queries[].",
        "setup",
        true,
      );
    }
  } else {
    makeParent();
    if (method === "memo-depth") makeDepth();
    makeAnswer();
    for (let i = 0; i < q; i++) {
      s.phase = "query";
      s.queryIndex = i;
      s.queryNode = test.queries[i];
      l.i = i;
      emit?.(
        "queryLoop",
        `Truy vấn ${i + 1}/${q}`,
        "Không được giả sử ID nhỏ hơn luôn là cha.",
        "query",
      );
      const x = test.queries[i];
      l.x = x;
      node(x);
      emit?.("queryX", `x = ${x}`, "Mục tiêu là độ sâu của x.", "query");
      const log =
        options.detailed !== false || i === (options.focusQuery ?? 0)
          ? emit
          : undefined;
      let id = x;
      l.node = id;
      if (method === "parent-walk") {
        log?.(
          "walkStart",
          `node = ${x}`,
          "Bắt đầu đi ngược từ nút được hỏi.",
          "node",
        );
        let distance = 0;
        l.distance = 0;
        log?.("walkZero", "distance = 0", "Chưa đi qua cạnh nào.", "node");
        while (id !== 1) {
          log?.(
            "walkCheck",
            "node chưa phải root",
            `${id} != 1 → true.`,
            "node",
          );
          const child = id;
          id = s.parent[id];
          l.node = id;
          node(id, child);
          s.metrics.visits++;
          s.marks[child] = "done";
          log?.(
            "walkParent",
            `Về cha ${id}`,
            `parent[${child}] = ${id}.`,
            "node",
          );
          distance++;
          l.distance = distance;
          log?.(
            "walkInc",
            `distance = ${distance}`,
            "Mỗi lần về cha đi qua đúng một cạnh.",
            "node",
          );
        }
        log?.(
          "walkCheck",
          "Đã về root 1",
          "Dừng trước parent[1], không đi tiếp tới ID 0.",
          "node",
        );
        s.answer[i] = distance;
      } else {
        log?.("memoNode", `node = ${x}`, "Tìm tổ tiên đã biết độ sâu.", "node");
        s.work = [];
        s.head = 0;
        s.frontierKind = "path";
        s.solveRefs.add("path");
        log?.(
          "memoPathNew",
          "Tạo Stack đường đi",
          "Chỉ lưu các nút có depth = −1.",
          "node",
        );
        while (s.depth[id] === -1) {
          log?.(
            "memoUnknown",
            `${id} chưa biết depth`,
            "Đi tới cha, lưu nút để xử lý khi quay lại.",
            "node",
          );
          push(id);
          s.metrics.visits++;
          log?.(
            "memoPush",
            `Push ${id}`,
            "Chưa gán depth khi chưa biết depth của cha.",
            "node",
          );
          const child = id;
          id = s.parent[id];
          l.node = id;
          node(id, child);
          log?.(
            "memoParent",
            `Về cha ${id}`,
            `parent[${child}] = ${id}.`,
            "node",
          );
        }
        log?.(
          "memoUnknown",
          `Đã biết depth[${id}] = ${s.depth[id]}`,
          "Dùng giá trị đã ghi nhớ, không đi lại tới root.",
          "node",
        );
        while (frontierSize(s) > 0) {
          log?.(
            "memoUnwind",
            "Stack còn nút cần điền depth",
            "Pop từ nút gần tổ tiên đã biết nhất.",
            "node",
          );
          id = pop();
          l.node = id;
          node(id, s.parent[id]);
          s.activeEdge = [s.parent[id], id];
          log?.(
            "memoPop",
            `Pop ${id}`,
            "Cha đã biết depth tại thời điểm này.",
            "node",
          );
          s.depth[id] = s.depth[s.parent[id]] + 1;
          s.metrics.writes++;
          s.marks[id] = "done";
          log?.(
            "memoDepth",
            `depth[${id}] = ${s.depth[id]}`,
            `depth[${s.parent[id]}] + 1. Mỗi nút chỉ điền một lần.`,
            "node",
          );
        }
        log?.(
          "memoUnwind",
          "Stack rỗng",
          "Đã điền xong toàn bộ đoạn chưa biết.",
          "node",
        );
        s.answer[i] = s.depth[x];
      }
      s.answerReady[i] = true;
      s.metrics.answered++;
      s.metrics.writes++;
      emit?.(
        "answerWrite",
        `answer[${i}] = ${s.answer[i]}`,
        method === "parent-walk"
          ? "Kết quả bằng số cạnh vừa đi. Các truy vấn sau sẽ đi lại đường này."
          : "Dùng depth[x]; các truy vấn lặp dùng lại kết quả.",
        "query",
      );
      delete l.x;
      delete l.node;
      delete l.distance;
      s.solveRefs.delete("path");
      s.frontierKind = null;
      s.work = [];
      node(null);
    }
    delete l.i;
    emit?.(
      "return",
      "Trả mảng kết quả",
      "Thứ tự kết quả khớp thứ tự các truy vấn input.",
      "setup",
      true,
    );
  }
  const values = problem === "leaves" ? [s.leafCount] : [...s.answer];
  s.frame = "main";
  s.phase = "output";
  s.current = null;
  s.neighbor = null;
  s.activeEdge = null;
  if (problem === "leaves") m.answer = s.leafCount;
  else s.mainRefs.add("answer");
  emit?.(
    "solveCall",
    "solve trả kết quả cho main",
    "Biến local của solve không còn trên Call Stack.",
    "setup",
    true,
  );
  if (problem === "depth") {
    m.line = `#${m.tc}:`;
    emit?.(
      "outputInit",
      "Tạo tiền tố output",
      `line = ${m.line}. Dấu hai chấm là bắt buộc theo PDF.`,
      "setup",
      true,
    );
    for (const value of values) {
      m.value = value;
      emit?.(
        "outputLoop",
        "Lấy một đáp án",
        "Giữ nguyên thứ tự, không sắp xếp kết quả.",
        "query",
      );
      m.line += ` ${value}`;
      emit?.(
        "outputAppend",
        `Nối ${value} vào output`,
        "Chưa ghi ra console cho đến println.",
        "query",
      );
    }
    delete m.value;
  }
  s.output = `#${m.tc}: ${values.join(" ")}`;
  emit?.(
    "print",
    "In kết quả",
    `System.out.println → ${s.output.length > 130 ? s.output.slice(0, 130) + "…" : s.output}`,
    "setup",
    true,
  );
  return { values, metrics: { ...s.metrics }, depth: [...s.depth] };
}
export function solveTree(
  test: TreeCase,
  problem: TreeProblem,
  method: TreeMethod,
): TreeSolution {
  return executeTree(test, problem, method, newMachine(test, 1, 0));
}
