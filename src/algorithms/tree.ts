import { java, recorder } from "@/engine/steps";
import type { LessonRun, TreeNode, TreeState } from "@/engine/types";
export type TreeOperation =
  "search" | "inorder" | "insert" | "delete" | "levelorder";
const LESSONS: Record<number, string> = {
  10: "Biến & kiểu dữ liệu",
  20: "Toán tử Java",
  25: "Điều kiện",
  30: "Vòng lặp",
  40: "Phương thức",
  50: "Lập trình hướng đối tượng",
  60: "Collections",
  65: "Java Generics",
  68: "Iterator",
  70: "Exception handling",
  85: "Java Streams",
  90: "Concurrency",
};
export function initialTree(): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const key of [50, 30, 70, 20, 40, 60, 85, 10, 25, 65, 90]) {
    const node: TreeNode = {
      id: `t${key}`,
      key,
      lesson: LESSONS[key],
      left: null,
      right: null,
    };
    if (nodes.length) {
      let current = nodes[0];
      while (true) {
        const dir = key < current.key ? "left" : "right";
        if (!current[dir]) {
          nodes[nodes.findIndex((n) => n.id === current.id)] = {
            ...current,
            [dir]: node.id,
          };
          break;
        }
        current = nodes.find((n) => n.id === current[dir])!;
      }
    }
    nodes.push(node);
  }
  return nodes;
}
export function treeRun(
  operation: TreeOperation,
  searchTarget = 65,
): LessonRun {
  let nodes = initialTree();
  let path: string[] = [];
  let output: number[] = [];
  let frontier: string[] = [];
  let found: string | null = null;
  const target =
    operation === "insert" ? 68 : operation === "delete" ? 65 : searchTarget;
  const bodies: Record<TreeOperation, string> = {
    search: `    int target = ${target};
    Node current = root; // @start
    while (current != null) { // @loop
      int cmp = Integer.compare(target, current.key); // @compare
      if (cmp == 0) { // @equal
        System.out.println(current.lesson); // @found
        return;
      }
      current = cmp < 0 ? current.left : current.right; // @advance
    }
    System.out.println("Not found: " + target); // @missing`,
    inorder: `    List<Integer> result = new ArrayList<>(); // @start
    inorder(root, result);
    System.out.println(result); // @print`,
    levelorder: `    List<Integer> result = new ArrayList<>();
    Queue<Node> queue = new ArrayDeque<>();
    queue.offer(root); // @start
    while (!queue.isEmpty()) {
      Node current = queue.poll(); // @poll
      result.add(current.key); // @visit
      if (current.left != null) queue.offer(current.left); // @left
      if (current.right != null) queue.offer(current.right); // @right
    }
    System.out.println(result); // @print`,
    insert: `    int target = 68;
    Node current = root; // @start
    while (true) {
      boolean left = target < current.key; // @compare
      Node next = left ? current.left : current.right; // @next
      if (next == null) {
        Node added = new Node(target); // @allocate
        if (left) current.left = added; else current.right = added; // @insert
        break;
      }
      current = next; // @advance
    }
    List<Integer> result = new ArrayList<>();
    inorder(root, result);
    System.out.println(result); // @print`,
    delete: `    root = delete(root, 65); // @start
    List<Integer> result = new ArrayList<>();
    inorder(root, result);
    System.out.println(result); // @print`,
  };
  const helpers = `  static void inorder(Node node, List<Integer> out) {
    if (node == null) return; // @null
    inorder(node.left, out); // @recurseLeft
    out.add(node.key); // @visitInorder
    inorder(node.right, out); // @recurseRight
  }
  static Node delete(Node node, int key) {
    if (node == null) return null;
    if (key < node.key) node.left = delete(node.left, key); // @deleteLeft
    else if (key > node.key) node.right = delete(node.right, key); // @deleteRight
    else {
      if (node.left == null) return node.right; // @deleteLeaf
      if (node.right == null) return node.left;
      Node successor = node.right;
      while (successor.left != null) successor = successor.left;
      node.key = successor.key;
      node.lesson = successor.lesson;
      node.right = delete(node.right, successor.key);
    }
    return node;
  }`;
  const code = java(`import java.util.*;
// BST tự triển khai để học nguyên lý; KHÔNG phải cấu trúc nội bộ TreeMap.
public class Demo {
  static class Node {
    int key; String lesson; Node left, right;
    Node(int key) { this.key = key; this.lesson = title(key); }
  }
  static String title(int key) {
    return switch (key) {
${Object.entries(LESSONS)
  .map(([k, v]) => `      case ${k} -> "${v}";`)
  .join("\n")}
      default -> "Lesson " + key;
    };
  }
  static Node put(Node n, int key) {
    if (n == null) return new Node(key);
    if (key < n.key) n.left = put(n.left, key);
    else if (key > n.key) n.right = put(n.right, key);
    return n;
  }
${helpers}
  public static void main(String[] args) {
    Node root = null;
    for (int key : new int[]{50,30,70,20,40,60,85,10,25,65,90}) root = put(root, key); // @init
${bodies[operation]}
  }
}`);
  const rec = recorder(code);
  const state = (): TreeState => ({
    kind: "tree",
    nodes,
    root: "t50",
    path,
    output,
    frontier,
    found,
    target,
  });
  const vars = (current: string | null = null) => ({
    target,
    current,
    visited: path.length,
    result: output,
  });
  rec.add(
    state(),
    "init",
    "Kho tài liệu theo ID",
    "11 tài liệu được sắp xếp theo quy tắc BST: khóa nhỏ bên trái, khóa lớn bên phải.",
    vars(),
  );
  if (operation === "search" || operation === "insert") {
    let current: string | null = "t50";
    rec.add(
      state(),
      "start",
      "Bắt đầu từ root",
      `Tìm vị trí của ID ${target}.`,
      vars(current),
      [current],
    );
    while (current) {
      const node = nodes.find((n) => n.id === current)!;
      path = [...path, node.id];
      const cmp = Math.sign(target - node.key);
      rec.add(
        state(),
        "compare",
        `So sánh ${target} với ${node.key}`,
        `${target} ${cmp < 0 ? "<" : cmp > 0 ? ">" : "="} ${node.key}. ${cmp === 0 ? "Đã tìm thấy." : cmp < 0 ? "Chọn cây con trái." : "Chọn cây con phải."}`,
        { ...vars(current), cmp },
        [node.id],
        [{ kind: "visit", ids: [node.id] }],
      );
      if (cmp === 0) {
        found = node.id;
        rec.add(
          state(),
          "found",
          "Tìm thấy tài liệu",
          `Lesson #${target}: ${node.lesson}.`,
          vars(current),
          [node.id],
          [],
          node.lesson,
        );
        break;
      }
      const direction = cmp < 0 ? "left" : "right";
      const next = node[direction];
      if (operation === "insert" && !next) {
        const added: TreeNode = {
          id: `t${target}`,
          key: target,
          lesson: LESSONS[target],
          left: null,
          right: null,
        };
        nodes = [...nodes, added];
        rec.add(
          state(),
          "allocate",
          `Tạo Lesson #${target}`,
          "Node mới chưa có liên kết với cây.",
          { ...vars(current), added: added.id },
          [added.id],
          [{ kind: "insert", ids: [added.id] }],
        );
        nodes = nodes.map((n) =>
          n.id === node.id ? { ...n, [direction]: added.id } : n,
        );
        found = added.id;
        rec.add(
          state(),
          "insert",
          "Gắn node vào cây",
          `${node.key}.${direction} = Node(${target}). Quy tắc BST vẫn được giữ.`,
          vars(current),
          [added.id, node.id],
          [{ kind: "reference", ids: [node.id] }],
        );
        break;
      }
      current = next;
      rec.add(
        state(),
        "advance",
        next ? `Đi ${direction === "left" ? "trái" : "phải"}` : "Đến null",
        next
          ? `Theo cạnh ${node.key} → ${nodes.find((n) => n.id === next)!.key}; nhánh còn lại không cần xét.`
          : "Không có node mang ID cần tìm.",
        vars(current),
        current ? [current] : [],
        [{ kind: "edge", ids: next ? [`${node.id}-${next}`] : [] }],
      );
    }
    if (operation === "search" && !found)
      rec.add(
        state(),
        "missing",
        "Không tìm thấy",
        `Không tồn tại tài liệu ID ${target}.`,
        vars(),
        [],
        [],
        `Not found: ${target}`,
      );
  } else if (operation === "inorder") {
    rec.add(
      state(),
      "start",
      "Inorder: trái → gốc → phải",
      "Dùng call stack để nhớ các node đang chờ xử lý.",
      vars(),
    );
    const walk = (id: string | null, stack: string[]) => {
      if (!id) return;
      const n = nodes.find((n) => n.id === id)!;
      const call = [`inorder(${n.key})`, ...stack];
      frontier = [id, ...frontier];
      rec.add(
        state(),
        "recurseLeft",
        `Thăm cây con trái của ${n.key}`,
        "Đệ quy sang trái trước khi đọc khóa của node hiện tại.",
        vars(id),
        [id],
        [],
        undefined,
        undefined,
        call,
      );
      walk(n.left, call);
      path = [...path, id];
      output = [...output, n.key];
      frontier = frontier.filter((x) => x !== id);
      rec.add(
        state(),
        "visitInorder",
        `Ghi ID ${n.key}`,
        `result = [${output.join(", ")}]. Các khóa luôn tăng dần.`,
        vars(id),
        [id],
        [{ kind: "visit", ids: [id] }],
        undefined,
        undefined,
        call,
      );
      rec.add(
        state(),
        "recurseRight",
        `Thăm cây con phải của ${n.key}`,
        "Sau node hiện tại, duyệt cây con phải.",
        vars(id),
        [id],
        [],
        undefined,
        undefined,
        call,
      );
      walk(n.right, call);
    };
    walk("t50", ["main(String[] args)"]);
  } else if (operation === "levelorder") {
    frontier = ["t50"];
    rec.add(
      state(),
      "start",
      "Thêm root vào Queue",
      "Level-order dùng queue phụ để duyệt từng tầng.",
      vars(),
    );
    while (frontier.length) {
      const id = frontier[0];
      frontier = frontier.slice(1);
      const n = nodes.find((n) => n.id === id)!;
      rec.add(
        state(),
        "poll",
        `Poll ${n.key}`,
        "Lấy node ở đầu queue phụ.",
        vars(id),
        [id],
        [{ kind: "move", ids: [id] }],
      );
      path = [...path, id];
      output = [...output, n.key];
      rec.add(
        state(),
        "visit",
        `Ghi ID ${n.key}`,
        "Thêm node vào kết quả theo từng tầng.",
        vars(id),
        [id],
      );
      for (const dir of ["left", "right"] as const) {
        if (n[dir]) {
          frontier = [...frontier, n[dir]!];
          rec.add(
            state(),
            dir,
            `Offer node ${nodes.find((x) => x.id === n[dir])!.key}`,
            "Thêm node con vào cuối queue phụ.",
            vars(id),
            [n[dir]!],
          );
        }
      }
    }
  } else {
    rec.add(
      state(),
      "start",
      "Xóa tài liệu ID 65",
      "Ví dụ này xóa một node lá. Mã Java cũng xử lý node có một hoặc hai con.",
      vars("t50"),
    );
    for (const key of [50, 70, 60]) {
      const n = nodes.find((n) => n.key === key)!;
      path = [...path, n.id];
      rec.add(
        state(),
        target < key ? "deleteLeft" : "deleteRight",
        `delete(${key}, 65)`,
        `${target < key ? "Trái" : "Phải"}: tiếp tục tìm node cần xóa.`,
        vars(n.id),
        [n.id],
        [{ kind: "visit", ids: [n.id] }],
        undefined,
        undefined,
        [`delete(${key}, 65)`, "main(String[] args)"],
      );
    }
    rec.add(
      state(),
      "deleteLeaf",
      "Node 65 là node lá",
      "Trả về node.right = null cho lời gọi tại Node(60).",
      vars("t65"),
      ["t65"],
    );
    nodes = nodes
      .filter((n) => n.id !== "t65")
      .map((n) => (n.id === "t60" ? { ...n, right: null } : n));
    rec.add(
      state(),
      "deleteRight",
      "Nối lại nhánh của Node(60)",
      "Node(60).right = null. Sau khi nối lại, Node(65) được loại khỏi hình.",
      vars("t60"),
      ["t60"],
      [{ kind: "remove", ids: ["t65"] }],
    );
  }
  if (operation !== "search") {
    const ordered: number[] = [];
    const walk = (id: string | null) => {
      if (!id) return;
      const n = nodes.find((n) => n.id === id)!;
      walk(n.left);
      ordered.push(n.key);
      walk(n.right);
    };
    if (operation !== "levelorder") {
      walk("t50");
      output = ordered;
    }
    rec.add(
      state(),
      "print",
      "Kết quả duyệt cây",
      `[${output.join(", ")}]`,
      vars(),
      [],
      [],
      `[${output.join(", ")}]`,
    );
  }
  return {
    key: `tree-${operation}-${target}`,
    code,
    steps: rec.steps,
    operation,
    complexity:
      operation === "inorder" || operation === "levelorder"
        ? "O(n)"
        : "O(h) · cân đối O(log n)",
    expectedOutput:
      operation === "search"
        ? found
          ? nodes.find((n) => n.id === found)!.lesson
          : `Not found: ${target}`
        : `[${output.join(", ")}]`,
  };
}
