import { java, recorder, freshId } from "@/engine/steps";
import type { LessonRun, LinkNode, LinkedState } from "@/engine/types";
export type LinkedOperation =
  | "insertAfter"
  | "addFirst"
  | "addLast"
  | "removeFirst"
  | "removeAfter"
  | "traversal";
export function linkedRun(
  operation: LinkedOperation,
  seed?: LinkedState,
  value?: number,
  after = 48,
): LessonRun {
  let nodes: LinkNode[] = seed
    ? seed.nodes.map((n) => ({ ...n }))
    : [12, 24, 36, 48, 60, 72, 84, 96].map((value, i, a) => ({
        id: `n${value}`,
        value,
        next: i < a.length - 1 ? `n${a[i + 1]}` : null,
        slot: i,
      }));
  let head = seed ? seed.head : "n12",
    tail = seed ? seed.tail : "n96";
  const initial = [...nodes]
    .sort((a, b) => a.slot - b.slot)
    .map((n) => n.value);
  const newValue =
    value ??
    (operation === "addFirst" ? 6 : operation === "addLast" ? 108 : 54);
  if (
    ["addFirst", "addLast", "insertAfter"].includes(operation) &&
    (!Number.isInteger(newValue) || Math.abs(newValue) > 999)
  )
    throw new RangeError("Giá trị node phải là số nguyên từ -999 đến 999");
  const afterNode = nodes.find((n) => n.value === after);
  if (
    (operation === "insertAfter" || operation === "removeAfter") &&
    !afterNode
  )
    throw new RangeError(`Không tìm thấy node có giá trị ${after}`);
  const body: Record<LinkedOperation, string> = {
    insertAfter: `    Node current = head;
    while (current != null && current.data != ${after}) current = current.next; // @advance
    Node newNode = new Node(${newValue}); // @allocate
    newNode.next = current.next; // @link
    current.next = newNode; // @rewire
    if (tail == current) tail = newNode; // @tail`,
    addFirst: `    Node newNode = new Node(${newValue}); // @allocate
    newNode.next = head; // @link
    head = newNode; // @rewire
    if (tail == null) tail = newNode; // @tail`,
    addLast: `    Node newNode = new Node(${newValue}); // @allocate
    if (tail == null) head = newNode; else tail.next = newNode; // @link
    tail = newNode; // @rewire`,
    removeFirst: `    Node removed = head; // @current
    if (removed != null) {
      head = removed.next; // @rewire
      if (head == null) tail = null; // @tail
      removed.next = null; // @detach
    }`,
    removeAfter: `    Node current = head;
    while (current != null && current.data != ${after}) current = current.next; // @advance
    Node removed = current.next; // @current
    if (removed != null) {
      current.next = removed.next; // @rewire
      if (removed == tail) tail = current; // @tail
      removed.next = null; // @detach
    }`,
    traversal: `    Node current = head; // @current
    while (current != null) {
      System.out.println(current.data); // @visit
      current = current.next; // @advance
    }`,
  };
  const code = java(`public class Demo {
  static class Node {
    int data; Node next;
    Node(int data) { this.data = data; }
  }
  public static void main(String[] args) {
    Node head = null, tail = null;
    for (int v : new int[]{${initial.join(",")}}) {
      Node node = new Node(v);
      if (tail == null) head = node; else tail.next = node;
      tail = node;
    } // @init
${body[operation]}
    for (Node n = head; n != null; n = n.next) System.out.print(n.data + " "); // @print
  }
}`);
  const generation = seed ? (seed.generation ?? 0) + 1 : 0;
  const rec = recorder(code);
  const state = (): LinkedState => ({
    kind: "linked",
    generation,
    nodes,
    head,
    tail,
  });
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
    `${nodes.length} node được giữ từ thao tác trước. Head và tail là reference, mỗi node chứa data và next.`,
    vars(),
  );
  const locate = () => {
    let cursor = head;
    while (cursor && cursor !== afterNode!.id) {
      const n = nodes.find((n) => n.id === cursor)!;
      cursor = n.next;
      rec.add(
        state(),
        "advance",
        `Đi theo next của ${n.value}`,
        `current: ${n.id} → ${cursor ?? "null"}. Tìm node đầu tiên có data = ${after}.`,
        vars(cursor),
        cursor ? [cursor] : [],
        [{ kind: "reference", ids: [n.id] }],
      );
    }
    return afterNode!.id;
  };
  if (operation === "traversal") {
    rec.add(
      state(),
      "current",
      "Bắt đầu tại head",
      "current = head; chưa đọc dữ liệu.",
      vars(head),
      head ? [head] : [],
    );
    for (const node of nodes) {
      rec.add(
        state(),
        "visit",
        `Truy cập Node(${node.value})`,
        `Đọc data của ${node.id}; không đổi reference.`,
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
    const current = operation === "removeAfter" ? locate() : head;
    const victim = nodes.find(
      (n) =>
        n.id ===
        (operation === "removeFirst"
          ? head
          : nodes.find((n) => n.id === current)?.next),
    );
    rec.add(
      state(),
      "current",
      "Xác định vị trí xóa",
      victim
        ? `Giữ removed = ${victim.id} trước khi đổi liên kết.`
        : "Không có node để xóa; dữ liệu giữ nguyên.",
      vars(current),
      victim ? [victim.id] : [],
    );
    if (victim) {
      if (operation === "removeFirst") head = victim.next;
      else update(current!, { next: victim.next });
      rec.add(
        state(),
        "rewire",
        "Nối lại danh sách trước",
        operation === "removeFirst"
          ? "head = removed.next; node cũ vẫn còn trên heap."
          : "current.next = removed.next; đường đi từ head bỏ qua removed.",
        { ...vars(current), removed: victim.id },
        current ? [current] : [],
        [{ kind: "reference", ids: current ? [current] : [] }],
      );
      if (tail === victim.id) {
        tail = operation === "removeFirst" ? null : current;
        rec.add(
          state(),
          "tail",
          "Cập nhật tail",
          "Node cuối đã bị xóa; tail trỏ tới node cuối còn lại hoặc null.",
          vars(current),
        );
      }
      update(victim.id, { next: null, floating: true });
      rec.add(
        state(),
        "detach",
        "Tách reference của node cũ",
        "removed.next = null; node bị loại khỏi danh sách sau khi nối lại xong.",
        { ...vars(current), removed: victim.id },
        [victim.id],
        [{ kind: "reference", ids: [victim.id] }],
      );
      nodes = nodes
        .filter((n) => n.id !== victim.id)
        .map((n, slot) => ({ ...n, slot }));
    }
  } else {
    const current =
      operation === "insertAfter"
        ? locate()
        : operation === "addLast"
          ? tail
          : head;
    const id = freshId(
      seed ? `n${newValue}-g${generation}` : `n${newValue}`,
      nodes.map((n) => n.id),
    );
    const slot =
      operation === "addFirst"
        ? 0
        : operation === "addLast"
          ? nodes.length
          : nodes.find((n) => n.id === current)!.slot + 1;
    nodes = [
      ...nodes,
      { id, value: newValue, next: null, slot, floating: true },
    ];
    rec.add(
      state(),
      "allocate",
      `Tạo Node(${newValue}) riêng biệt`,
      "Đối tượng mới được cấp phát, chưa thuộc chuỗi từ head.",
      { ...vars(current), newNode: id },
      [id],
      [{ kind: "insert", ids: [id] }],
    );
    if (operation === "addLast") {
      if (tail) update(tail, { next: id });
      else head = id;
    } else
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
        ? "Nối tail.next tới newNode; nếu danh sách rỗng, head = newNode."
        : "newNode.next trỏ vào phần còn lại trước. Giữ liên kết cũ để không làm mất chuỗi.",
      { ...vars(current), newNode: id },
      [id],
      [
        {
          kind: "reference",
          ids: [operation === "addLast" && tail ? tail : id],
        },
      ],
    );
    if (operation === "addFirst") head = id;
    else if (operation === "addLast") tail = id;
    else update(current!, { next: id });
    rec.add(
      state(),
      "rewire",
      "Cập nhật reference",
      operation === "insertAfter"
        ? `${after}.next = newNode; node mới đã vào danh sách.`
        : operation === "addFirst"
          ? "head = newNode."
          : "tail = newNode.",
      { ...vars(current), newNode: id },
      [id],
      [{ kind: "reference", ids: current ? [current] : [id] }],
    );
    if (
      operation !== "addLast" &&
      (!tail || (tail === current && operation === "insertAfter"))
    ) {
      tail = id;
      rec.add(
        state(),
        "tail",
        "Cập nhật tail",
        "Node mới là node cuối, next = null.",
        vars(id),
        [id],
      );
    }
    const ordered: LinkNode[] = [];
    let cursor = head;
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
      "Chỉ đổi vị trí trên màn hình; danh tính node và các reference trên heap không thay đổi.",
      vars(id),
      [id],
      [{ kind: "move", ids: nodes.map((n) => n.id) }],
    );
  }
  const values = nodes.map((n) => n.value);
  rec.add(
    state(),
    "print",
    "Danh sách sau thao tác",
    "Đi từ head đến null. Kết quả này là dữ liệu đầu vào của operation kế tiếp.",
    vars(),
    nodes.map((n) => n.id),
    [],
    values.join(" "),
  );
  return {
    key: `linked-${operation}-${newValue}-${after}`,
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
      (operation === "traversal"
        ? initial.map(String).join("\n") + (initial.length ? "\n" : "")
        : "") + values.join(" "),
  };
}
