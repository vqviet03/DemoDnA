import { java, recorder, freshId } from "@/engine/steps";
import type { LessonRun, TreeNode, TreeState } from "@/engine/types";
export type TreeOperation =
  "search" | "inorder" | "insert" | "delete" | "levelorder" | "build";
export const TREE_KEYS = [50, 30, 70, 20, 40, 60, 85, 10, 25, 65, 90] as const;
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
export function initialTree(keys: readonly number[] = TREE_KEYS): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const key of keys) {
    if (nodes.some((n) => n.key === key)) continue;
    const node: TreeNode = {
      id: `t${key}`,
      key,
      lesson: LESSONS[key] ?? `Lesson ${key}`,
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
  targetArg?: number,
  seed?: TreeState,
  input: readonly number[] = TREE_KEYS,
): LessonRun {
  let nodes: TreeNode[] =
    operation === "build"
      ? []
      : seed
        ? seed.nodes.map((n) => ({ ...n }))
        : initialTree();
  let root: string | null =
    operation === "build" ? null : seed ? seed.root : "t50";
  let path: string[] = [],
    output: number[] = [],
    frontier: string[] = [],
    found: string | null = null;
  let target = targetArg ?? (operation === "insert" ? 68 : 65);
  if (
    ["insert", "delete", "search"].includes(operation) &&
    (!Number.isInteger(target) || Math.abs(target) > 999)
  )
    throw new RangeError("ID phải là số nguyên từ -999 đến 999");
  if (
    operation === "build" &&
    (!input.length ||
      input.length > 12 ||
      input.some((key) => !Number.isInteger(key) || Math.abs(key) > 999))
  )
    throw new RangeError("Nhập 1–12 ID nguyên từ -999 đến 999");
  const initialKeys: number[] = [];
  const pre = (id: string | null) => {
    if (!id) return;
    const n = nodes.find((n) => n.id === id)!;
    initialKeys.push(n.key);
    pre(n.left);
    pre(n.right);
  };
  pre(root);
  const body: Record<TreeOperation, string> = {
    build: `    for (int key : new int[]{${input.join(",")}}) { // @input
      root = put(root, key); // @build
    }
    List<Integer> result = new ArrayList<>(); inorder(root, result);
    System.out.println(result); // @print`,
    insert: `    root = put(root, ${target}); // @start
    List<Integer> result = new ArrayList<>(); inorder(root, result);
    System.out.println(result); // @print`,
    search: `    int target = ${target};
    Node current = root; // @start
    while (current != null) {
      int cmp = Integer.compare(target, current.key); // @compare
      if (cmp == 0) {
        System.out.println(current.lesson); // @found
        return;
      }
      current = cmp < 0 ? current.left : current.right; // @advance
    }
    System.out.println("Not found: " + target); // @missing`,
    delete: `    root = delete(root, ${target}); // @start
    List<Integer> result = new ArrayList<>(); inorder(root, result);
    System.out.println(result); // @print`,
    inorder: `    List<Integer> result = new ArrayList<>(); // @start
    inorder(root, result);
    System.out.println(result); // @print`,
    levelorder: `    List<Integer> result = new ArrayList<>();
    Queue<Node> queue = new ArrayDeque<>();
    if (root != null) queue.offer(root); // @start
    while (!queue.isEmpty()) {
      Node current = queue.poll(); // @poll
      result.add(current.key); // @visit
      if (current.left != null) queue.offer(current.left); // @left
      if (current.right != null) queue.offer(current.right); // @right
    }
    System.out.println(result); // @print`,
  };
  const code = java(`import java.util.*;
// BST tự triển khai. TreeMap của JDK dùng Red-Black Tree tự cân bằng.
public class Demo {
  static class Node {
    int key; String lesson; Node left, right;
    Node(int key) { this.key = key; this.lesson = title(key); }
  }
  static String title(int key) {
    return switch (key) {
${Object.entries(LESSONS)
  .map(([key, title]) => `      case ${key} -> "${title}";`)
  .join("\n")}
      default -> "Lesson " + key;
    };
  }
  static Node put(Node node, int key) {
    if (node == null) return new Node(key); // @allocate
    int cmp = Integer.compare(key, node.key); // @putCompare
    if (cmp < 0) node.left = put(node.left, key); // @putLeft
    else if (cmp > 0) node.right = put(node.right, key); // @putRight
    return node; // @putReturn
  }
  static void inorder(Node node, List<Integer> out) {
    if (node == null) return; // @null
    inorder(node.left, out); // @recurseLeft
    out.add(node.key); // @visitInorder
    inorder(node.right, out); // @recurseRight
  }
  static Node delete(Node node, int key) {
    if (node == null) return null; // @deleteMissing
    if (key < node.key) node.left = delete(node.left, key); // @deleteLeft
    else if (key > node.key) node.right = delete(node.right, key); // @deleteRight
    else {
      if (node.left == null) return node.right; // @deleteReturn
      if (node.right == null) return node.left; // @deleteOne
      Node successor = node.right; // @successor
      while (successor.left != null) successor = successor.left; // @successorNext
      node.key = successor.key; node.lesson = successor.lesson; // @replaceKey
      node.right = delete(node.right, successor.key); // @deleteSuccessor
    }
    return node;
  }
  public static void main(String[] args) {
    Node root = null;
    for (int key : new int[]{${initialKeys.join(",")}}) root = put(root, key); // @init
${body[operation]}
  }
}`);
  const generation = seed ? (seed.generation ?? 0) + 1 : 0;
  const rec = recorder(code),
    state = (): TreeState => ({
      kind: "tree",
      generation,
      nodes,
      root,
      path,
      output,
      frontier,
      found,
      target,
    });
  const vars = (current: string | null = null) => ({
    target,
    current,
    root,
    visited: path.length,
    result: output,
    nodes: nodes.length,
  });
  const node = (id: string) => nodes.find((n) => n.id === id)!;
  const update = (id: string, props: Partial<TreeNode>) => {
    nodes = nodes.map((n) => (n.id === id ? { ...n, ...props } : n));
  };
  rec.add(
    state(),
    "init",
    operation === "build"
      ? "Cây rỗng trước khi nạp dữ liệu"
      : "Kho tài liệu theo ID",
    operation === "build"
      ? `Sẽ đọc lần lượt ${input.length} ID. Thứ tự chèn quyết định hình dạng BST.`
      : `Giữ ${nodes.length} tài liệu từ dữ liệu hiện tại. Khóa nhỏ ở trái, khóa lớn ở phải.`,
    vars(),
  );
  const insert = (key: number) => {
    target = key;
    path = [];
    found = null;
    let current = root,
      parent: string | null = null,
      dir: "left" | "right" = "left";
    while (current) {
      const n = node(current);
      path = [...path, current];
      const cmp = Math.sign(key - n.key);
      rec.add(
        state(),
        "putCompare",
        `So sánh ID ${key} với ${n.key}`,
        `${key} ${cmp < 0 ? "<" : cmp > 0 ? ">" : "="} ${n.key}. ${cmp === 0 ? "Khóa đã tồn tại, không tạo node trùng." : `Chọn nhánh ${cmp < 0 ? "trái" : "phải"}.`}`,
        { ...vars(current), cmp },
        [current],
        [{ kind: "visit", ids: [current] }],
        undefined,
        undefined,
        path
          .slice()
          .reverse()
          .map((id) => `put(${node(id).key}, ${key})`),
      );
      if (cmp === 0) {
        found = current;
        rec.add(
          state(),
          "putReturn",
          "Giữ nguyên node có cùng ID",
          "BST này không lưu khóa trùng; không tăng số node.",
          vars(current),
          [current],
        );
        return;
      }
      parent = current;
      dir = cmp < 0 ? "left" : "right";
      current = n[dir];
      rec.add(
        state(),
        dir === "left" ? "putLeft" : "putRight",
        current
          ? `Đi ${dir === "left" ? "trái" : "phải"}`
          : "Tìm được reference null",
        current
          ? `Theo ${n.key}.${dir} tới ${node(current).key}.`
          : `${n.key}.${dir} = null; đây là vị trí chèn ID ${key}.`,
        vars(current),
        current ? [current] : [],
        [{ kind: "reference", ids: [parent] }],
      );
    }
    const id = freshId(
        seed ? `t${key}-g${generation}` : `t${key}`,
        nodes.map((n) => n.id),
      ),
      added: TreeNode = {
        id,
        key,
        lesson: LESSONS[key] ?? `Lesson ${key}`,
        left: null,
        right: null,
      };
    nodes = [...nodes, added];
    rec.add(
      state(),
      "allocate",
      `Tạo Lesson #${key}`,
      "new Node(key) cấp phát đối tượng với left = right = null. Chưa gán reference của cha.",
      vars(),
      [id],
      [{ kind: "insert", ids: [id] }],
    );
    if (parent) update(parent, { [dir]: id });
    else root = id;
    found = id;
    rec.add(
      state(),
      parent
        ? dir === "left"
          ? "putLeft"
          : "putRight"
        : operation === "build"
          ? "build"
          : "start",
      parent ? `Nối ${node(parent).key}.${dir} → ${key}` : `root → ${key}`,
      parent
        ? "Lời gọi put trả node mới cho reference của cha. Quy tắc BST vẫn giữ."
        : "Gán node đầu tiên vào root; các ID sau sẽ so sánh từ root này.",
      vars(parent),
      [id],
      [{ kind: "reference", ids: parent ? [parent] : [id] }],
    );
  };
  if (operation === "build") {
    for (let i = 0; i < input.length; i++) {
      target = input[i];
      rec.add(
        state(),
        "input",
        `Đọc dữ liệu ${i + 1}/${input.length}: ID ${target}`,
        "Lấy một ID từ mảng đầu vào rồi thực hiện put(root, key). Không dựng cây kết quả ngay lập tức.",
        { ...vars(), inputIndex: i, input: input },
        [],
      );
      insert(target);
    }
  } else if (operation === "insert") {
    rec.add(
      state(),
      "start",
      `Chèn ID ${target}`,
      "Bắt đầu từ root; nếu gặp null, cấp phát node và trả reference lên cha.",
      vars(root),
      root ? [root] : [],
    );
    insert(target);
  } else if (operation === "search") {
    let current = root;
    rec.add(
      state(),
      "start",
      "Bắt đầu từ root",
      `Tìm tài liệu ID ${target}.`,
      vars(current),
      current ? [current] : [],
    );
    while (current) {
      const n = node(current);
      path = [...path, current];
      const cmp = Math.sign(target - n.key);
      rec.add(
        state(),
        "compare",
        `So sánh ${target} với ${n.key}`,
        `${target} ${cmp < 0 ? "<" : cmp > 0 ? ">" : "="} ${n.key}. ${cmp === 0 ? "Đã tìm thấy." : cmp < 0 ? "Chọn cây con trái." : "Chọn cây con phải."}`,
        { ...vars(current), cmp },
        [current],
        [{ kind: "visit", ids: [current] }],
      );
      if (cmp === 0) {
        found = current;
        rec.add(
          state(),
          "found",
          "Tìm thấy tài liệu",
          `Lesson #${target}: ${n.lesson}.`,
          vars(current),
          [current],
          [],
          n.lesson,
        );
        break;
      }
      const dir = cmp < 0 ? "left" : "right";
      current = n[dir];
      rec.add(
        state(),
        "advance",
        current ? `Đi ${dir === "left" ? "trái" : "phải"}` : "Đến null",
        current
          ? `Theo cạnh ${n.key} → ${node(current).key}. Nhánh còn lại không thể chứa khóa ${target}.`
          : "Đã đến reference null; không còn node để so sánh.",
        vars(current),
        current ? [current] : [],
        [{ kind: "edge", ids: current ? [`${n.id}-${current}`] : [] }],
      );
    }
    if (!found)
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
      "Call stack ghi nhớ các node đang chờ. Mỗi node được ghi đúng một lần.",
      vars(),
    );
    const walk = (id: string | null, stack: string[]) => {
      if (!id) return;
      const n = node(id),
        call = [`inorder(${n.key})`, ...stack];
      frontier = [...frontier, id];
      rec.add(
        state(),
        "recurseLeft",
        `Thăm cây con trái của ${n.key}`,
        "Đẩy frame vào call stack. Đọc hết nhánh trái trước node hiện tại.",
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
      rec.add(
        state(),
        "visitInorder",
        `Ghi ID ${n.key}`,
        `result = [${output.join(", ")}]. Tính chất BST bảo đảm kết quả tăng dần.`,
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
        "Sau khi đọc node, duyệt nhánh phải; khi xong sẽ quay về frame cha.",
        vars(id),
        [id],
        [],
        undefined,
        undefined,
        call,
      );
      walk(n.right, call);
      frontier = frontier.filter((x) => x !== id);
      rec.add(
        state(),
        "null",
        `Quay lui từ ${n.key}`,
        "Hai cây con đã xong. Lời gọi đệ quy trả về node cha, không xóa node khỏi cây.",
        vars(stack[0] ?? null),
        [id],
        [{ kind: "reference", ids: [id] }],
        undefined,
        undefined,
        stack,
      );
    };
    walk(root, ["main(String[] args)"]);
  } else if (operation === "levelorder") {
    frontier = root ? [root] : [];
    rec.add(
      state(),
      "start",
      "Thêm root vào Queue",
      "Level-order dùng queue FIFO để đọc từng tầng.",
      vars(),
    );
    while (frontier.length) {
      const id = frontier[0];
      frontier = frontier.slice(1);
      const n = node(id);
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
        "Đọc node trước khi thêm các node con vào queue.",
        vars(id),
        [id],
      );
      for (const dir of ["left", "right"] as const)
        if (n[dir]) {
          frontier = [...frontier, n[dir]!];
          rec.add(
            state(),
            dir,
            `Offer ${node(n[dir]!).key}`,
            "Đưa node con vào cuối queue phụ.",
            vars(id),
            [n[dir]!],
            [{ kind: "insert", ids: [n[dir]!] }],
          );
        }
    }
  } else {
    rec.add(
      state(),
      "start",
      `Xóa tài liệu ID ${target}`,
      "Tìm node rồi xử lý đủ ba trường hợp: lá, một con, hai con.",
      vars(root),
    );
    const remove = (
      id: string | null,
      key: number,
      parent: string | null,
      dir: "left" | "right" | null,
      stack: string[],
    ) => {
      if (!id) {
        rec.add(
          state(),
          "deleteMissing",
          "Không có khóa cần xóa",
          "Gặp null; cây giữ nguyên.",
          vars(),
          [],
          [],
          undefined,
          undefined,
          stack,
        );
        return;
      }
      const n = node(id),
        call = [`delete(${n.key}, ${key})`, ...stack];
      path = [...path, id];
      if (key !== n.key) {
        const d = key < n.key ? "left" : "right";
        rec.add(
          state(),
          d === "left" ? "deleteLeft" : "deleteRight",
          `So sánh ${key} với ${n.key}`,
          `Tiếp tục theo nhánh ${d === "left" ? "trái" : "phải"}.`,
          vars(id),
          [id],
          [{ kind: "visit", ids: [id] }],
          undefined,
          undefined,
          call,
        );
        remove(n[d], key, id, d, call);
        return;
      }
      if (n.left && n.right) {
        let successor = node(n.right);
        rec.add(
          state(),
          "successor",
          "Tìm inorder successor",
          "Node có hai con: chọn khóa nhỏ nhất trong cây con phải.",
          vars(id),
          [successor.id],
        );
        while (successor.left) {
          successor = node(successor.left);
          rec.add(
            state(),
            "successorNext",
            `Đi trái tới ${successor.key}`,
            "Tiếp tục tìm node nhỏ nhất của nhánh phải.",
            vars(successor.id),
            [successor.id],
          );
        }
        update(id, { key: successor.key, lesson: successor.lesson });
        rec.add(
          state(),
          "replaceKey",
          `Thay khóa ${n.key} bằng ${successor.key}`,
          "Giữ nguyên đối tượng node, chỉ copy key và lesson. Tạm có hai khóa bằng nhau cho tới khi xóa successor.",
          vars(id),
          [id],
          [{ kind: "copy", ids: [id] }],
        );
        remove(n.right, successor.key, id, "right", call);
      } else {
        const child = n.left ?? n.right;
        rec.add(
          state(),
          n.left ? "deleteOne" : "deleteReturn",
          `Trả về ${child ? node(child).key : "null"}`,
          child
            ? "Node có một con. Cha sẽ trỏ trực tiếp tới node con."
            : "Node lá trả null; cha sẽ bỏ reference đến node này.",
          vars(id),
          [id],
        );
        if (parent && dir) update(parent, { [dir]: child });
        else root = child;
        nodes = nodes.filter((n) => n.id !== id);
        path = path.filter((x) => x !== id);
        rec.add(
          state(),
          parent ? (dir === "left" ? "deleteLeft" : "deleteRight") : "start",
          "Nối lại reference sau xóa",
          "Gán kết quả delete vào reference của cha hoặc root. Các node còn lại giữ nguyên danh tính.",
          vars(parent),
          parent ? [parent] : [],
          [{ kind: "remove", ids: [id] }],
        );
      }
    };
    remove(root, target, null, null, ["main(String[] args)"]);
  }
  if (operation !== "search") {
    if (operation !== "levelorder") {
      const sorted: number[] = [];
      const walk = (id: string | null) => {
        if (!id) return;
        const n = node(id);
        walk(n.left);
        sorted.push(n.key);
        walk(n.right);
      };
      walk(root);
      output = sorted;
    }
    rec.add(
      state(),
      "print",
      "Kết quả cây hiện tại",
      `[${output.join(", ")}]. Operation sau dùng chính các node và reference hiện tại.`,
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
      operation === "build"
        ? "O(nh)"
        : operation === "inorder" || operation === "levelorder"
          ? "O(n)"
          : "O(h) · cân đối O(log n)",
    expectedOutput:
      operation === "search"
        ? found
          ? node(found).lesson
          : `Not found: ${target}`
        : `[${output.join(", ")}]`,
  };
}
