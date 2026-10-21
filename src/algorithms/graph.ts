import { java, recorder } from "@/engine/steps";
import type { Edge, GraphState, LessonRun } from "@/engine/types";
// Numeric vertex labels; IDs stay strings inside the replay engine.
export const GRAPH_NODES = ["1", "2", "3", "4", "5", "6", "7"] as const;
export const GRAPH_START = GRAPH_NODES[0];
export const GRAPH_GOAL = GRAPH_NODES[6];
export const GRAPH_EDGES: readonly Edge[] = [
  ["1", "2"],
  ["1", "3"],
  ["2", "4"],
  ["3", "4"],
  ["3", "5"],
  ["6", "7"],
  ["4", "7"],
  ["5", "7"],
].map(([from, to]) => ({ id: `${from}-${to}`, from, to }));
export function graphKeyType(nodes: readonly string[]): "Integer" | "String" {
  return nodes.every(
    (node) => /^(0|[1-9]\d*)$/.test(node) && Number(node) <= 2147483647,
  )
    ? "Integer"
    : "String";
}
export function graphRun(cyclic = false): LessonRun {
  const edges = [
    ...GRAPH_EDGES,
    ...(cyclic ? [{ id: "7-1", from: "7", to: "1" }] : []),
  ];
  const adjacency = Object.fromEntries(
    GRAPH_NODES.map((n) => [
      n,
      edges.filter((e) => e.from === n).map((e) => e.to),
    ]),
  );
  let degrees: Record<string, number> = Object.fromEntries(
    GRAPH_NODES.map((n) => [n, 0]),
  );
  // The first snapshot is taken after counting every incoming edge.
  for (const edge of edges) degrees[edge.to]++;
  let ready: string[] = [];
  let order: string[] = [];
  let current: string | null = null;
  let processedEdges: string[] = [];
  let cycle = false;
  const code = java(`import java.util.*;
public class Demo {
  public static void main(String[] args) {
    Map<Integer, List<Integer>> graph = new LinkedHashMap<>();
${GRAPH_NODES.map((n) => `    graph.put(${n}, List.of(${adjacency[n].join(", ")}));`).join("\n")}
    Map<Integer, Integer> degree = new LinkedHashMap<>();
    graph.keySet().forEach(v -> degree.put(v, 0));
    for (List<Integer> neighbors : graph.values())
      for (Integer v : neighbors) degree.put(v, degree.get(v) + 1); // @init
    Queue<Integer> ready = new ArrayDeque<>();
    for (Integer v : graph.keySet()) {
      if (degree.get(v) == 0) ready.offer(v); // @ready
    }
    List<Integer> order = new ArrayList<>();
    while (!ready.isEmpty()) { // @loop
      Integer current = ready.poll(); // @poll
      order.add(current); // @visit
      for (Integer next : graph.get(current)) { // @edge
        degree.put(next, degree.get(next) - 1); // @decrement
        if (degree.get(next) == 0) ready.offer(next); // @unlock
      }
    }
    if (order.size() < graph.size()) { // @check
      System.out.println("Cycle detected"); // @cycle
    } else {
      System.out.println(order); // @print
    }
  }
}`);
  const rec = recorder(code);
  const state = (): GraphState => ({
    kind: "graph",
    nodes: GRAPH_NODES,
    edges,
    degrees,
    ready,
    order,
    current,
    processedEdges,
    cycle,
  });
  const vars = (next: string | null = null) => ({
    current,
    next,
    "ready.size": ready.length,
    processed: order.length,
    total: GRAPH_NODES.length,
    ...(next ? { "degree[next]": degrees[next] } : {}),
  });
  rec.add(
    state(),
    "init",
    "Tính in-degree từ toàn bộ cạnh",
    `Đỉnh 4 có 2 cạnh vào; đỉnh 7 có 3. ${cyclic ? "Có thêm cạnh 7 → 1 để kiểm tra chu trình." : "Đỉnh 1 và 6 có in-degree = 0."}`,
    vars(),
  );
  for (const n of GRAPH_NODES) {
    if (degrees[n] === 0) {
      ready = [...ready, n];
      rec.add(
        state(),
        "ready",
        `Mở khóa ${n}`,
        `${n} có in-degree = 0; đưa vào cuối Ready Queue.`,
        vars(n),
        [n],
        [{ kind: "insert", ids: [n] }],
      );
    }
  }
  while (ready.length) {
    current = ready[0];
    ready = ready.slice(1);
    rec.add(
      state(),
      "poll",
      `Lấy ${current} từ Ready Queue`,
      "Kahn chỉ lấy các môn đã hoàn tất tất cả tiên quyết.",
      vars(),
      [current],
      [{ kind: "move", ids: [current] }],
    );
    order = [...order, current];
    rec.add(
      state(),
      "visit",
      `Hoàn thành ${current}`,
      `Completed Order: ${order.join(" → ")}.`,
      vars(),
      [current],
      [{ kind: "visit", ids: [current] }],
    );
    for (const edge of edges.filter((e) => e.from === current)) {
      rec.add(
        state(),
        "edge",
        `Duyệt ${edge.from} → ${edge.to}`,
        "Đi theo một cạnh có hướng, chuẩn bị gỡ một điều kiện tiên quyết.",
        vars(edge.to),
        [edge.id, edge.to],
        [{ kind: "edge", ids: [edge.id] }],
      );
      degrees = { ...degrees, [edge.to]: degrees[edge.to] - 1 };
      processedEdges = [...processedEdges, edge.id];
      rec.add(
        state(),
        "decrement",
        `${edge.to}: in-degree → ${degrees[edge.to]}`,
        degrees[edge.to] === 0
          ? "Mọi tiên quyết đã xong; môn này sẵn sàng được mở khóa."
          : `Còn ${degrees[edge.to]} tiên quyết chưa hoàn tất.`,
        vars(edge.to),
        [edge.id, edge.to],
        [{ kind: "edge", ids: [edge.id] }],
      );
      if (degrees[edge.to] === 0) {
        ready = [...ready, edge.to];
        rec.add(
          state(),
          "unlock",
          `Offer ${edge.to} vào Ready Queue`,
          "Đưa vào cuối queue. Không có môn nào được đưa vào hai lần.",
          vars(edge.to),
          [edge.to],
          [{ kind: "insert", ids: [edge.to] }],
        );
      }
    }
  }
  current = null;
  rec.add(
    state(),
    "check",
    "Kiểm tra kết quả",
    `${order.length}/${GRAPH_NODES.length} môn đã xử lý. So sánh số node hoàn thành với tổng số node.`,
    vars(),
  );
  cycle = order.length < GRAPH_NODES.length;
  const result = cycle ? "Cycle detected" : `[${order.join(", ")}]`;
  rec.add(
    state(),
    cycle ? "cycle" : "print",
    cycle ? "Phát hiện chu trình" : "Lộ trình học hợp lệ",
    cycle
      ? "Ready Queue đã rỗng nhưng vẫn còn môn chưa hoàn thành. Cần gỡ vòng phụ thuộc."
      : "Mỗi tiên quyết luôn xuất hiện trước môn phụ thuộc trong kết quả.",
    vars(),
    order,
    [],
    result,
  );
  return {
    key: `graph-${cyclic}`,
    code,
    steps: rec.steps,
    operation: cyclic ? "cycle" : "kahn",
    complexity: "O(V + E)",
    expectedOutput: result,
  };
}

export type GraphOperation = "load" | "dfs" | "bfs";
export interface GraphInput {
  readonly nodes: readonly string[];
  readonly edges: readonly Edge[];
}
export const GRAPH_INPUT = GRAPH_EDGES.map((e) => `${e.from}>${e.to}`).join(
  ", ",
);
export function parseGraphInput(input: string): GraphInput {
  const nodes: string[] = [],
    edges: Edge[] = [];
  const add = (name: string) => {
    if (!/^[\p{L}\p{N}_ ]{1,20}$/u.test(name))
      throw new RangeError(
        "Tên node cần 1–20 chữ/số/khoảng trắng; dùng 1>2 cho cạnh.",
      );
    if (!nodes.includes(name)) nodes.push(name);
  };
  for (const token of input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const parts = token.split(">").map((s) => s.trim());
    if (parts.length > 2)
      throw new RangeError(
        "Nhập từng cạnh u>v, phân cách bằng dấu phẩy; node riêng biểu diễn đỉnh cô lập.",
      );
    parts.forEach(add);
    if (
      parts.length === 2 &&
      !edges.some((e) => e.from === parts[0] && e.to === parts[1])
    )
      edges.push({
        id: `${parts[0]}-${parts[1]}`,
        from: parts[0],
        to: parts[1],
      });
  }
  if (!nodes.length || nodes.length > 12 || edges.length > 24)
    throw new RangeError("Graph cần 1–12 node và tối đa 24 cạnh.");
  return { nodes, edges };
}
export function adjacencyMatrix(
  state: Pick<GraphState, "nodes" | "edges">,
): readonly (readonly number[])[] {
  return state.nodes.map((from) =>
    state.nodes.map((to) =>
      Number(state.edges.some((e) => e.from === from && e.to === to)),
    ),
  );
}
export function traversalRun(
  operation: GraphOperation,
  seed?: GraphState,
  representation: "list" | "matrix" = "list",
  input: GraphInput = { nodes: GRAPH_NODES, edges: GRAPH_EDGES },
  startArg?: string,
  goalArg?: string,
): LessonRun {
  const nodes = [
    ...(operation === "load" ? input.nodes : (seed?.nodes ?? GRAPH_NODES)),
  ];
  const inputEdges = [
    ...(operation === "load" ? input.edges : (seed?.edges ?? GRAPH_EDGES)),
  ];
  const start = startArg ?? nodes[0],
    goal = goalArg ?? nodes.at(-1)!;
  if (!nodes.includes(start) || !nodes.includes(goal))
    throw new RangeError(
      "Node bắt đầu và node đích phải tồn tại trong dữ liệu Graph hiện tại.",
    );
  let edges: Edge[] = operation === "load" ? [] : [...inputEdges],
    ready: string[] = [],
    order: string[] = [],
    current: string | null = null,
    processedEdges: string[] = [],
    visited: string[] = [],
    parents: Record<string, string | null> = {},
    path: string[] = [],
    stack: string[] = [],
    returning = false,
    loaded: string[] = operation === "load" ? [] : [...nodes];
  let activeCell: readonly [string, string] | undefined;
  const labelType = graphKeyType(nodes);
  const literal = (s: string) =>
    labelType === "Integer" ? s : JSON.stringify(s);
  const setup =
    representation === "list"
      ? `    Map<${labelType}, List<${labelType}>> graph = new LinkedHashMap<>();
    for (${labelType} name : names) graph.put(name, new ArrayList<>()); // @vertex
    for (int[] edge : inputEdges) {
      graph.get(names.get(edge[0])).add(names.get(edge[1])); // @loadEdge
    }`
      : `    int[][] graph = new int[names.size()][names.size()]; // @vertex
    for (int[] edge : inputEdges) {
      graph[edge[0]][edge[1]] = 1; // @loadEdge
    }`;
  const type =
    representation === "list"
      ? `Map<${labelType}, List<${labelType}>>`
      : "int[][]";
  const neighbors =
    representation === "list"
      ? `    return graph.get(node);`
      : `    List<${labelType}> result = new ArrayList<>();
    int row = names.indexOf(node);
    for (int col = 0; col < names.size(); col++)
      if (graph[row][col] == 1) result.add(names.get(col));
    return result;`;
  const helpers =
    operation === "dfs"
      ? `  static void dfs(${labelType} current, ${type} graph, List<${labelType}> names,
      Set<${labelType}> visited, List<${labelType}> order, Map<${labelType},${labelType}> parent) {
    visited.add(current); // @visit
    order.add(current); // @order
    for (${labelType} next : neighbors(graph, names, current)) { // @edge
      if (!visited.contains(next)) { // @check
        parent.put(next, current); // @parent
        dfs(next, graph, names, visited, order, parent); // @recurse
      }
    }
    // Lời gọi trả về: bỏ frame hiện tại khỏi call stack.
    return; // @backtrack
  }`
      : "";
  const body =
    operation === "load"
      ? `    System.out.println(${representation === "list" ? "graph" : "Arrays.deepToString(graph)"}); // @print`
      : operation === "dfs"
        ? `    Set<${labelType}> visited = new LinkedHashSet<>();
    List<${labelType}> order = new ArrayList<>();
    Map<${labelType},${labelType}> parent = new LinkedHashMap<>();
    parent.put(${literal(start)}, null); // @start
    dfs(${literal(start)}, graph, names, visited, order, parent);
    System.out.println(order); // @print`
        : `    Set<${labelType}> visited = new LinkedHashSet<>();
    Queue<${labelType}> queue = new ArrayDeque<>();
    List<${labelType}> order = new ArrayList<>();
    Map<${labelType},${labelType}> parent = new LinkedHashMap<>();
    visited.add(${literal(start)}); parent.put(${literal(start)}, null);
    queue.offer(${literal(start)}); // @start
    while (!queue.isEmpty()) {
      ${labelType} current = queue.poll(); // @poll
      order.add(current); // @order
      for (${labelType} next : neighbors(graph, names, current)) { // @edge
        if (visited.add(next)) { // @check
          parent.put(next, current); // @parent
          queue.offer(next); // @offer
        }
      }
    }
    List<${labelType}> path = new ArrayList<>();
    if (visited.contains(${literal(goal)})) { // @goal
      for (${labelType} v = ${literal(goal)}; v != null; v = parent.get(v)) {
        path.add(0, v); // @trace
      }
    }
    System.out.println(order); // @printOrder
    System.out.println("Path: " + path); // @print`;
  const code = java(`import java.util.*;
// Duyệt liên thông từ một đỉnh; thứ tự này không phải topological order.
public class Demo {
  static List<${labelType}> neighbors(${type} graph, List<${labelType}> names, ${labelType} node) {
${neighbors}
  }
${helpers}
  public static void main(String[] args) {
    List<${labelType}> names = List.of(${nodes.map(literal).join(", ")}); // @init
    int[][] inputEdges = {${inputEdges.map((e) => `{${nodes.indexOf(e.from)},${nodes.indexOf(e.to)}}`).join(",")}};
${setup}
${body}
  }
}`);
  const rec = recorder(code);
  const state = (): GraphState => ({
    kind: "graph",
    nodes,
    edges,
    degrees: Object.fromEntries(
      nodes.map((n) => [n, edges.filter((e) => e.to === n).length]),
    ),
    ready,
    order,
    current,
    processedEdges,
    cycle: false,
    algorithm: operation,
    representation,
    visited,
    parents,
    path,
    stack,
    returning,
    loaded,
    inputEdges,
    goal,
    activeCell,
  });
  const keyValue = (value: string | null) =>
    value === null ? null : labelType === "Integer" ? Number(value) : value;
  const keyValues = (values: readonly string[]) =>
    values.map((value) => (labelType === "Integer" ? Number(value) : value));
  const vars = (next: string | null = null) => ({
    current: keyValue(current),
    next: keyValue(next),
    start: keyValue(start),
    goal: keyValue(goal),
    visited: keyValues(visited),
    frontier: keyValues(operation === "dfs" ? stack : ready),
    order: keyValues(order),
    path: keyValues(path),
  });
  rec.add(
    state(),
    "init",
    operation === "load" ? "Đọc dữ liệu Graph" : "Graph dùng chung dữ liệu",
    operation === "load"
      ? `${nodes.length} đỉnh, ${inputEdges.length} cạnh có hướng. Sẽ ghi từng cạnh vào ${representation === "list" ? "danh sách kề" : "ma trận kề"}.`
      : `Giữ nguyên ${nodes.length} đỉnh, ${edges.length} cạnh. Duyệt từ ${start}; đích truy vết là ${goal}.`,
    vars(),
  );
  const adjacency = (n: string) =>
    representation === "list"
      ? edges.filter((e) => e.from === n).map((e) => e.to)
      : nodes.filter((to) => edges.some((e) => e.from === n && e.to === to));
  if (operation === "load") {
    if (representation === "list")
      for (const n of nodes) {
        loaded = [...loaded, n];
        current = n;
        rec.add(
          state(),
          "vertex",
          `Tạo danh sách rỗng cho ${n}`,
          `graph.put("${n}", new ArrayList<>()); đỉnh đã lưu, chưa có cạnh đi ra.`,
          vars(),
          [n],
          [{ kind: "insert", ids: [n] }],
        );
      }
    else {
      loaded = [...nodes];
      rec.add(
        state(),
        "vertex",
        `Cấp phát ma trận ${nodes.length} × ${nodes.length}`,
        "Mỗi hàng là đỉnh nguồn, mỗi cột là đỉnh đích. Giá trị mặc định 0: chưa có cạnh.",
        vars(),
      );
    }
    for (const e of inputEdges) {
      current = e.from;
      activeCell = [e.from, e.to];
      edges = [...edges, e];
      rec.add(
        state(),
        "loadEdge",
        `Lưu cạnh ${e.from} → ${e.to}`,
        representation === "list"
          ? `Thêm "${e.to}" vào graph.get("${e.from}"). Không tự thêm cạnh ngược.`
          : `graph[${nodes.indexOf(e.from)}][${nodes.indexOf(e.to)}] = 1. Ô hàng ${e.from}, cột ${e.to} sáng lên; ô ngược vẫn giữ nguyên.`,
        { ...vars(e.to), row: nodes.indexOf(e.from), col: nodes.indexOf(e.to) },
        [e.id, e.from, e.to],
        [{ kind: "edge", ids: [e.id] }],
      );
    }
    current = null;
    activeCell = undefined;
    const result =
      representation === "list"
        ? `{${nodes.map((n) => `${n}=[${adjacency(n).join(", ")}]`).join(", ")}}`
        : `[${adjacencyMatrix(state())
            .map((row) => `[${row.join(", ")}]`)
            .join(", ")}]`;
    rec.add(
      state(),
      "print",
      "Đã nạp xong Graph",
      "Các cạnh và node này sẽ dùng chung cho DFS, BFS và các thao tác tiếp theo. Đổi cách xem không làm thay đổi Graph.",
      vars(),
      [],
      [],
      result,
    );
    return {
      key: `graph-load-${representation}`,
      code,
      steps: rec.steps,
      operation,
      complexity:
        representation === "list" ? "O(V + E) bộ nhớ" : "O(V²) bộ nhớ",
      expectedOutput: result,
    };
  }
  parents = { [start]: null };
  if (operation === "dfs") {
    rec.add(
      state(),
      "start",
      `Bắt đầu DFS tại ${start}`,
      "Đánh dấu khi vào hàm, duyệt sâu một nhánh, rồi trả về cha khi hết láng giềng.",
      vars(),
      [start],
    );
    const dfs = (id: string) => {
      current = id;
      stack = [...stack, id];
      path = [...stack];
      returning = false;
      visited = [...visited, id];
      rec.add(
        state(),
        "visit",
        `Vào DFS(${id})`,
        "Đánh dấu visited ngay khi vào hàm để không đệ quy vô hạn trên cạnh ngược hoặc chu trình.",
        vars(),
        [id],
        [{ kind: "visit", ids: [id] }],
        undefined,
        undefined,
        [...stack].reverse().map((n) => `dfs(${n})`),
      );
      order = [...order, id];
      rec.add(
        state(),
        "order",
        `Ghi ${id} vào thứ tự duyệt`,
        `order = [${order.join(", ")}]. Đây là thứ tự khám phá, không bảo đảm thứ tự tiên quyết.`,
        vars(),
        [id],
      );
      for (const next of adjacency(id)) {
        current = id;
        returning = false;
        const edge = edges.find((e) => e.from === id && e.to === next)!;
        activeCell = [id, next];
        processedEdges = [...processedEdges, edge.id];
        rec.add(
          state(),
          "edge",
          `Xét cạnh ${id} → ${next}`,
          `Đọc láng giềng từ ${representation === "list" ? "list của " + id : "hàng của " + id + " trong matrix"}.`,
          vars(next),
          [edge.id],
          [{ kind: "edge", ids: [edge.id] }],
        );
        rec.add(
          state(),
          "check",
          visited.includes(next)
            ? `Bỏ qua ${next} đã thăm`
            : `${next} chưa được thăm`,
          visited.includes(next)
            ? "Visited đã chứa node; không gọi DFS lần nữa. Đây không phải phép kiểm tra chu trình đầy đủ."
            : "Có thể đi sâu theo cạnh này; trước tiên ghi parent.",
          vars(next),
          [next],
        );
        if (!visited.includes(next)) {
          parents = { ...parents, [next]: id };
          rec.add(
            state(),
            "parent",
            `parent[${next}] = ${id}`,
            "Ghi node cha lần đầu khám phá; reference parent dùng để truy vết đường đi.",
            vars(next),
            [edge.id],
          );
          rec.add(
            state(),
            "recurse",
            `Gọi DFS(${next})`,
            "Tạm dừng frame hiện tại trên call stack rồi đi vào lời gọi con.",
            vars(next),
            [next],
          );
          dfs(next);
        }
      }
      stack = stack.slice(0, -1);
      path = [...stack];
      current = stack.at(-1) ?? null;
      returning = true;
      activeCell = undefined;
      rec.add(
        state(),
        "backtrack",
        `Quay lui ${id} → ${current ?? "kết thúc"}`,
        "Đã xét hết các cạnh đi ra. Pop frame DFS khỏi call stack; node vẫn thuộc visited và vẫn nằm trong graph.",
        vars(),
        current ? [id, current] : [id],
        [{ kind: "reference", ids: [id] }],
        undefined,
        `DFS(${id}) hoàn tất. Quay lại frame cha để xét láng giềng tiếp theo; không gỡ visited và không xóa node.`,
        [...stack].reverse().map((n) => `dfs(${n})`),
      );
    };
    dfs(start);
  } else {
    visited = [start];
    ready = [start];
    rec.add(
      state(),
      "start",
      `Offer ${start} vào queue`,
      "Đánh dấu visited ngay khi enqueue để mỗi node chỉ vào queue một lần.",
      vars(),
      [start],
      [{ kind: "insert", ids: [start] }],
    );
    while (ready.length) {
      current = ready[0];
      ready = ready.slice(1);
      const id = current;
      rec.add(
        state(),
        "poll",
        `Poll ${id}`,
        "Lấy phần tử ở FRONT. BFS xử lý lần lượt theo khoảng cách số cạnh từ start.",
        vars(),
        [id],
        [{ kind: "move", ids: [id] }],
      );
      order = [...order, id];
      rec.add(
        state(),
        "order",
        `Thăm ${id}`,
        `order = [${order.join(", ")}].`,
        vars(),
        [id],
        [{ kind: "visit", ids: [id] }],
      );
      for (const next of adjacency(id)) {
        const edge = edges.find((e) => e.from === id && e.to === next)!;
        activeCell = [id, next];
        processedEdges = [...processedEdges, edge.id];
        rec.add(
          state(),
          "edge",
          `Xét cạnh ${id} → ${next}`,
          "Kiểm tra xem node đích đã từng được đưa vào queue chưa.",
          vars(next),
          [edge.id],
          [{ kind: "edge", ids: [edge.id] }],
        );
        const seen = visited.includes(next);
        if (!seen) visited = [...visited, next];
        rec.add(
          state(),
          "check",
          seen ? `${next} đã được khám phá` : `Đánh dấu ${next}`,
          seen
            ? "visited.add(next) trả false; không ghi đè parent hay enqueue lại."
            : "visited.add(next) trả true; đây là lần khám phá đầu, đường ngắn nhất theo số cạnh.",
          vars(next),
          [next],
        );
        if (!seen) {
          parents = { ...parents, [next]: id };
          rec.add(
            state(),
            "parent",
            `parent[${next}] = ${id}`,
            "Lưu cha ở lần khám phá đầu tiên để dựng lại đường đi ngắn nhất.",
            vars(next),
            [edge.id],
          );
          ready = [...ready, next];
          rec.add(
            state(),
            "offer",
            `Offer ${next} vào REAR`,
            `Queue: [${ready.join(", ")}].`,
            vars(next),
            [next],
            [{ kind: "insert", ids: [next] }],
          );
        }
      }
    }
    current = null;
    activeCell = undefined;
    returning = true;
    rec.add(
      state(),
      "goal",
      visited.includes(goal) ? `Truy vết từ ${goal}` : `Không tới được ${goal}`,
      visited.includes(goal)
        ? "BFS dùng queue, không quay lui đệ quy. Sau duyệt, lần ngược parent để dựng đường đi."
        : "Không tồn tại đường có hướng từ start tới goal. Kết quả path là danh sách rỗng.",
      vars(),
    );
    if (visited.includes(goal)) {
      let v: string | null = goal;
      while (v !== null) {
        path = [v, ...path];
        current = v;
        rec.add(
          state(),
          "trace",
          `Truy vết ${v} → ${parents[v] ?? "start"}`,
          `Thêm ${v} vào đầu path. Đi ngược parent, không duyệt ngược các cạnh của graph.`,
          vars(),
          [v],
          [{ kind: "reference", ids: [v] }],
        );
        v = parents[v];
      }
    }
    rec.add(
      state(),
      "printOrder",
      "Kết quả BFS",
      `[${order.join(", ")}]`,
      vars(),
      [],
      [],
      `[${order.join(", ")}]`,
    );
  }
  current = null;
  activeCell = undefined;
  returning = false;
  const result =
    operation === "dfs"
      ? `[${order.join(", ")}]`
      : `Path: [${path.join(", ")}]`;
  rec.add(
    state(),
    "print",
    operation === "dfs" ? "DFS hoàn tất" : "Đường đi ngắn nhất theo số cạnh",
    operation === "dfs"
      ? `Đã thăm ${order.length}/${nodes.length} node từ ${start}. Đỉnh không tới được vẫn giữ nguyên; visited chống lặp trên chu trình.`
      : path.length
        ? path.join(" → ")
        : "Không có đường đi tới đích.",
    vars(),
    path,
    [],
    result,
  );
  return {
    key: `graph-${operation}-${representation}-${start}-${goal}`,
    code,
    steps: rec.steps,
    operation,
    complexity: representation === "list" ? "O(V + E)" : "O(V²)",
    expectedOutput:
      operation === "dfs" ? result : `[${order.join(", ")}]\n${result}`,
  };
}
