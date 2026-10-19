import { java, recorder } from "@/engine/steps";
import type { Edge, GraphState, LessonRun } from "@/engine/types";
export const COURSES = [
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "API",
  "Git",
  "Final Project",
] as const;
export const DEPENDENCIES: readonly Edge[] = [
  ["HTML", "CSS"],
  ["HTML", "JavaScript"],
  ["CSS", "React"],
  ["JavaScript", "React"],
  ["JavaScript", "API"],
  ["React", "Final Project"],
  ["API", "Final Project"],
  ["Git", "Final Project"],
].map(([from, to]) => ({ id: `${from}-${to}`, from, to }));
export function graphRun(cyclic = false): LessonRun {
  const edges = [
    ...DEPENDENCIES,
    ...(cyclic
      ? [{ id: "Final Project-HTML", from: "Final Project", to: "HTML" }]
      : []),
  ];
  const adjacency = Object.fromEntries(
    COURSES.map((n) => [n, edges.filter((e) => e.from === n).map((e) => e.to)]),
  );
  let degrees: Record<string, number> = Object.fromEntries(
    COURSES.map((n) => [n, 0]),
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
    Map<String, List<String>> graph = new LinkedHashMap<>();
${COURSES.map((n) => `    graph.put("${n}", List.of(${adjacency[n].map((v) => `"${v}"`).join(", ")}));`).join("\n")}
    Map<String, Integer> degree = new LinkedHashMap<>();
    graph.keySet().forEach(v -> degree.put(v, 0));
    for (List<String> neighbors : graph.values())
      for (String v : neighbors) degree.put(v, degree.get(v) + 1); // @init
    Queue<String> ready = new ArrayDeque<>();
    for (String v : graph.keySet()) {
      if (degree.get(v) == 0) ready.offer(v); // @ready
    }
    List<String> order = new ArrayList<>();
    while (!ready.isEmpty()) { // @loop
      String current = ready.poll(); // @poll
      order.add(current); // @visit
      for (String next : graph.get(current)) { // @edge
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
    nodes: COURSES,
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
    total: COURSES.length,
    ...(next ? { "degree[next]": degrees[next] } : {}),
  });
  rec.add(
    state(),
    "init",
    "Tính in-degree từ toàn bộ cạnh",
    `React có 2 tiên quyết; Final Project có 3. ${cyclic ? "Có thêm cạnh Final Project → HTML để kiểm tra chu trình." : "HTML và Git không có điều kiện tiên quyết."}`,
    vars(),
  );
  for (const n of COURSES) {
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
    `${order.length}/${COURSES.length} môn đã xử lý. So sánh số node hoàn thành với tổng số node.`,
    vars(),
  );
  cycle = order.length < COURSES.length;
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
