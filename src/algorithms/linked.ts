import { java, recorder } from "@/engine/steps";
import type { LessonRun, LinkedState, LinkNode } from "@/engine/types";
export type LinkedOperation =
  | "insertAfter"
  | "addFirst"
  | "addLast"
  | "removeFirst"
  | "removeAfter"
  | "traversal";
export function linkedRun(operation: LinkedOperation): LessonRun {
  let nodes: LinkNode[] = [12, 24, 36, 48, 60, 72, 84, 96].map(
    (value, i, a) => ({
      id: `n${value}`,
      value,
      next: i < a.length - 1 ? `n${a[i + 1]}` : null,
      slot: i,
    }),
  );
  let head: string | null = "n12",
    tail: string | null = "n96";
  const body: Record<LinkedOperation, string> = {
    insertAfter: `    Node current = head;
    while (current.data != 48) current = current.next; // @current
    Node newNode = new Node(54); // @allocate
    newNode.next = current.next; // @link
    current.next = newNode; // @rewire`,
    addFirst: `    Node newNode = new Node(6); // @allocate
    newNode.next = head; // @link
    head = newNode; // @rewire`,
    addLast: `    Node newNode = new Node(108); // @allocate
    tail.next = newNode; // @link
    tail = newNode; // @rewire`,
    removeFirst: `    Node removed = head; // @current
    head = head.next; // @rewire
    removed.next = null; // @detach`,
    removeAfter: `    Node current = head;
    while (current.data != 48) current = current.next; // @current
    Node removed = current.next; // @victim
    current.next = removed.next; // @rewire
    removed.next = null; // @detach`,
    traversal: `    Node current = head; // @current
    while (current != null) { // @loop
      System.out.println(current.data); // @visit
      current = current.next; // @advance
    }`,
  };
  const code = java(`public class Demo {
  static class Node {
    int data;
    Node next;
    Node(int data) { this.data = data; }
  }
  public static void main(String[] args) {
    Node head = new Node(12), tail = head;
    for (int v : new int[]{24,36,48,60,72,84,96}) {
      tail.next = new Node(v);
      tail = tail.next;
    } // @init
${body[operation]}
    for (Node n = head; n != null; n = n.next) System.out.print(n.data + " "); // @print
  }
}`);
  const rec = recorder(code);
  const state = (): LinkedState => ({ kind: "linked", nodes, head, tail });
  const vars = (current: string | null = null) => ({
    head,
    tail,
    current,
    "heap.nodes": nodes.length,
  });
  const update = (id: string, props: Partial<LinkNode>) => {
    nodes = nodes.map((n) => (n.id === id ? { ...n, ...props } : n));
  };
  rec.add(
    state(),
    "init",
    "Danh sách liên kết đơn",
    "Mỗi đối tượng có data và reference next. Head trỏ đến node đầu, tail trỏ đến node cuối.",
    vars(),
  );
  if (operation === "traversal") {
    rec.add(
      state(),
      "current",
      "Bắt đầu tại head",
      "current = head; chưa đọc dữ liệu.",
      vars(head),
      [head!],
    );
    for (const node of nodes) {
      rec.add(
        state(),
        "visit",
        `Truy cập Node(${node.value})`,
        `Đọc data của ${node.id}; không thay đổi reference.`,
        vars(node.id),
        [node.id],
        [{ kind: "visit", ids: [node.id] }],
        String(node.value),
      );
      rec.add(
        state(),
        "advance",
        "Đi theo next",
        `${node.id}.next → ${node.next ?? "null"}.`,
        vars(node.next),
        node.next ? [node.next] : [],
        [{ kind: "reference", ids: [node.id] }],
      );
    }
  } else if (operation === "removeFirst" || operation === "removeAfter") {
    const current = operation === "removeFirst" ? head! : "n48";
    const victim =
      operation === "removeFirst"
        ? nodes[0]
        : nodes.find((n) => n.id === "n60")!;
    rec.add(
      state(),
      "current",
      "Xác định vị trí xóa",
      `Giữ tham chiếu ${current}.`,
      vars(current),
      [current],
    );
    if (operation === "removeAfter")
      rec.add(
        state(),
        "victim",
        "Giữ node bị xóa",
        "removed = current.next; chưa cắt liên kết.",
        { ...vars(current), removed: victim.id },
        [victim.id],
      );
    if (operation === "removeFirst") head = victim.next;
    else update(current, { next: victim.next });
    rec.add(
      state(),
      "rewire",
      "Nối lại danh sách trước",
      operation === "removeFirst"
        ? "Head trỏ sang node kế tiếp. Node cũ chưa được loại khỏi hình."
        : "current.next bỏ qua node bị xóa và trỏ tới node kế tiếp.",
      { ...vars(current), removed: victim.id },
      [current],
      [{ kind: "reference", ids: [current] }],
    );
    update(victim.id, { next: null, floating: true });
    rec.add(
      state(),
      "detach",
      "Tách reference của node cũ",
      "removed.next = null; đối tượng có thể được GC khi không còn tham chiếu.",
      { ...vars(current), removed: victim.id },
      [victim.id],
      [{ kind: "reference", ids: [victim.id] }],
    );
    nodes = nodes
      .filter((n) => n.id !== victim.id)
      .map((n, i) => ({ ...n, slot: i }));
  } else {
    const newValue =
      operation === "addFirst" ? 6 : operation === "addLast" ? 108 : 54;
    const id = `n${newValue}`;
    const current =
      operation === "insertAfter"
        ? "n48"
        : operation === "addLast"
          ? tail
          : head;
    if (operation === "insertAfter")
      rec.add(
        state(),
        "current",
        "Tìm Node(48)",
        "Duyệt từ head đến current = Node(48).",
        vars(current),
        [current!],
      );
    nodes = [
      ...nodes,
      {
        id,
        value: newValue,
        next: null,
        slot: operation === "addFirst" ? 0 : operation === "addLast" ? 8 : 4,
        floating: true,
      },
    ];
    rec.add(
      state(),
      "allocate",
      `Tạo Node(${newValue}) riêng biệt`,
      "Đối tượng mới đã cấp phát nhưng chưa thuộc chuỗi từ head.",
      { ...vars(current), newNode: id },
      [id],
      [{ kind: "insert", ids: [id] }],
    );
    if (operation === "addLast") update(tail!, { next: id });
    else
      update(id, {
        next:
          operation === "addFirst"
            ? head
            : nodes.find((n) => n.id === current)!.next,
      });
    rec.add(
      state(),
      "link",
      "Gán reference đầu tiên",
      operation === "addLast"
        ? "tail.next = newNode; node mới đã nối vào cuối chuỗi."
        : "newNode.next trỏ vào phần còn lại, giữ nguyên đường nối cũ.",
      { ...vars(current), newNode: id },
      [id],
      [{ kind: "reference", ids: [operation === "addLast" ? tail! : id] }],
    );
    if (operation === "addFirst") head = id;
    else if (operation === "addLast") tail = id;
    else update(current!, { next: id });
    rec.add(
      state(),
      "rewire",
      "Cập nhật reference",
      operation === "insertAfter"
        ? "current.next = newNode; đường đi bây giờ là 48 → 54 → 60."
        : operation === "addFirst"
          ? "head = newNode; node mới trở thành đầu danh sách."
          : "tail = newNode; cập nhật con trỏ cuối.",
      { ...vars(current), newNode: id },
      [id, current!],
      [{ kind: "reference", ids: [current!] }],
    );
    const ordered: LinkNode[] = [];
    let cursor: string | null = head;
    while (cursor) {
      const n = nodes.find((n) => n.id === cursor)!;
      ordered.push({ ...n, slot: ordered.length, floating: false });
      cursor = n.next;
    }
    nodes = ordered;
    rec.add(
      state(),
      "rewire",
      "Căn chỉnh để dễ đọc",
      "Chỉ đổi vị trí trên màn hình. Danh tính đối tượng và reference trên heap không thay đổi.",
      vars(id),
      [id],
      [{ kind: "move", ids: nodes.map((n) => n.id) }],
    );
  }
  const values: number[] = [];
  let cursor = head;
  while (cursor) {
    const n = nodes.find((n) => n.id === cursor)!;
    values.push(n.value);
    cursor = n.next;
  }
  rec.add(
    state(),
    "print",
    "Danh sách sau thao tác",
    "Đi theo next từ head đến null; tất cả node còn lại đều truy cập được.",
    vars(),
    nodes.map((n) => n.id),
    [],
    values.join(" "),
  );
  const traversalPrefix =
    operation === "traversal"
      ? nodes.map((n) => String(n.value)).join("\n") + "\n"
      : "";
  return {
    key: `linked-${operation}`,
    code,
    steps: rec.steps,
    operation,
    complexity:
      operation === "traversal"
        ? "O(n)"
        : operation === "insertAfter" || operation === "removeAfter"
          ? "O(n) tìm · O(1) nối"
          : "O(1)",
    expectedOutput:
      traversalPrefix +
      values
        .map((v) => `${v} `)
        .join("")
        .trim(),
  };
}
