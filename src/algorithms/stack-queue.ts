import { java, recorder } from "@/engine/steps";
import type { Item, LessonRun, QueueState, StackState } from "@/engine/types";
export const ACTIONS = [
  "Type text",
  "Select text",
  "Bold text",
  "Paste image",
  "Resize image",
  "Move image",
  "Add caption",
  "Change color",
  "Insert title",
] as const;
export type StackOperation = "pop" | "push" | "peek" | "isEmpty";
export type QueueOperation = "poll" | "offer" | "peek" | "isEmpty";
export function stackRun(operation: StackOperation): LessonRun {
  let editor: string[] = ACTIONS.slice(0, operation === "push" ? 8 : 9);
  let items: Item[] = editor.map((value, i) => ({
    id: `s-${i}`,
    value,
    slot: i,
  }));
  let removed: Item | undefined;
  const body: Record<StackOperation, string> = {
    pop: `    String removed = history.pop(); // @op
    editor.undo(removed); // @undo
    System.out.println("Undo: " + removed); // @result`,
    push: `    String action = "Insert title"; // @args
    history.push(action); // @op
    editor.actions.add(action); // @apply
    System.out.println("Push: " + action); // @result`,
    peek: `    String top = history.peek(); // @op
    System.out.println("Top: " + top); // @result`,
    isEmpty: `    boolean empty = history.isEmpty(); // @op
    System.out.println("Empty: " + empty); // @result`,
  };
  const code = java(`import java.util.*;
public class Demo {
  static class Editor {
    List<String> actions = new ArrayList<>();
    void undo(String action) {
      if (!actions.get(actions.size()-1).equals(action)) throw new IllegalStateException();
      actions.remove(actions.size()-1);
    }
  }
  public static void main(String[] args) {
    Deque<String> history = new ArrayDeque<>();
    Editor editor = new Editor();
    for (String action : new String[]{${editor.map((s) => `"${s}"`).join(", ")}}) {
      history.push(action);
      editor.actions.add(action);
    } // @init
${body[operation]}
    System.out.println(history); // @print
  }
}`);
  const rec = recorder(code);
  const state = (): StackState => ({ kind: "stack", items, editor, removed });
  const vars = () => ({
    size: items.length,
    top: items.at(-1)?.value ?? null,
    operation: `${operation}()`,
    rule: "LIFO",
  });
  rec.add(
    state(),
    "init",
    "Lịch sử chỉnh sửa",
    "ArrayDeque lưu các thao tác. Push và pop cùng một đầu, thao tác mới nhất nằm ở TOP.",
    vars(),
  );
  let result = "";
  if (operation === "pop") {
    removed = items.at(-1)!;
    items = items.slice(0, -1);
    rec.add(
      state(),
      "op",
      `Pop: ${removed.value}`,
      "Lấy phần tử ở TOP ra khỏi history. Editor chưa áp dụng Undo ở lệnh này.",
      { ...vars(), removed: removed.value },
      [removed.id],
      [{ kind: "remove", ids: [removed.id] }],
    );
    editor = editor.slice(0, -1);
    rec.add(
      state(),
      "undo",
      "Undo trong editor",
      "editor.undo(removed) bỏ tiêu đề vừa thêm. Vùng mô phỏng quay về trạng thái trước.",
      { ...vars(), removed: removed.value },
      [],
      [],
      undefined,
      "Trong ứng dụng thực tế, mỗi Action sẽ chứa dữ liệu cần thiết để đảo ngược thao tác.",
      ["Editor.undo(String action)", "main(String[] args)"],
    );
    result = `Undo: ${removed.value}`;
  } else if (operation === "push") {
    rec.add(
      state(),
      "args",
      "Tạo thao tác mới",
      "Chuẩn bị thêm Insert title vào history.",
      { ...vars(), action: "Insert title" },
    );
    const item = { id: "s-8", value: "Insert title", slot: 8 };
    items = [...items, item];
    rec.add(
      state(),
      "op",
      "Push lên TOP",
      "Insert title đi vào đỉnh. Các thao tác cũ được giữ nguyên thứ tự.",
      vars(),
      [item.id],
      [{ kind: "insert", ids: [item.id] }],
    );
    editor = [...editor, "Insert title"];
    rec.add(
      state(),
      "apply",
      "Áp dụng vào editor",
      "Ghi lại tiêu đề trong nội dung tài liệu.",
      vars(),
      [item.id],
    );
    result = "Push: Insert title";
  } else if (operation === "peek") {
    result = `Top: ${items.at(-1)!.value}`;
    rec.add(
      state(),
      "op",
      "Peek tại TOP",
      "Đọc phần tử mới nhất mà không lấy khỏi stack.",
      { ...vars(), result: items.at(-1)!.value },
      [items.at(-1)!.id],
      [{ kind: "visit", ids: [items.at(-1)!.id] }],
    );
  } else {
    result = "Empty: false";
    rec.add(
      state(),
      "op",
      "Kiểm tra isEmpty",
      "Stack còn 9 thao tác, empty = false.",
      { ...vars(), empty: false },
    );
  }
  rec.add(
    state(),
    "result",
    "Kết quả thao tác",
    result,
    vars(),
    [],
    [],
    result,
  );
  const output = `[${[...items]
    .reverse()
    .map((i) => i.value)
    .join(", ")}]`;
  rec.add(
    state(),
    "print",
    "History hiện tại",
    "ArrayDeque hiển thị từ TOP đến BOTTOM. Độ phức tạp O(1), push amortized O(1).",
    vars(),
    [],
    [],
    output,
  );
  return {
    key: `stack-${operation}`,
    code,
    steps: rec.steps,
    operation,
    complexity: operation === "push" ? "O(1) amortized" : "O(1)",
    expectedOutput: `${result}\n${output}`,
  };
}
export function queueRun(operation: QueueOperation): LessonRun {
  let items: Item[] = Array.from({ length: 10 }, (_, i) => ({
    id: `mail-${i + 1}`,
    value: `M${String(i + 1).padStart(2, "0")}`,
    slot: i,
  }));
  let processing: Item | null = null;
  let completed: Item[] = [];
  let worker: QueueState["worker"] = "idle";
  const body: Record<QueueOperation, string> = {
    poll: `    String job = jobs.poll(); // @op
    if (job != null) {
      process(job); // @process
      completed.add(job); // @complete
    }
    System.out.println("Completed: " + completed); // @result`,
    offer: `    String job = "M11"; // @args
    jobs.offer(job); // @op
    System.out.println("Offer: " + job); // @result`,
    peek: `    String job = jobs.peek(); // @op
    System.out.println("Front: " + job); // @result`,
    isEmpty: `    boolean empty = jobs.isEmpty(); // @op
    System.out.println("Empty: " + empty); // @result`,
  };
  const code = java(`import java.util.*;
public class Demo {
  // Mô phỏng worker đồng bộ. Retry là logic riêng, không phải Queue API.
  static void process(String job) { /* Gửi email trong ứng dụng thật */ }
  public static void main(String[] args) {
    Queue<String> jobs = new ArrayDeque<>();
    List<String> completed = new ArrayList<>();
    for (int i = 1; i <= 10; i++) jobs.offer(String.format("M%02d", i)); // @init
${body[operation]}
    System.out.println(jobs); // @print
  }
}`);
  const rec = recorder(code);
  const state = (): QueueState => ({
    kind: "queue",
    items,
    processing,
    completed,
    worker,
  });
  const vars = () => ({
    pending: items.length,
    front: items[0]?.value ?? null,
    rear: items.at(-1)?.value ?? null,
    processing: processing?.value ?? null,
    completed: completed.length,
  });
  rec.add(
    state(),
    "init",
    "Hàng đợi gửi email",
    "10 email jobs đang chờ. Offer vào REAR, poll lấy từ FRONT theo FIFO.",
    vars(),
  );
  let result = "";
  if (operation === "poll") {
    processing = items[0];
    items = items.slice(1).map((x, i) => ({ ...x, slot: i }));
    rec.add(
      state(),
      "op",
      "Poll: lấy M01 ở FRONT",
      "M01 rời queue và đến worker. Các job còn lại dịch sang trái.",
      { ...vars(), job: "M01" },
      [processing.id],
      [
        { kind: "move", ids: [processing.id] },
        { kind: "move", ids: items.map((i) => i.id) },
      ],
    );
    worker = "processing";
    rec.add(
      state(),
      "process",
      "Worker đang xử lý M01",
      "Gọi process(job). Queue chỉ quản lý thứ tự, không tự gửi hay retry email.",
      { ...vars(), job: "M01" },
      [processing.id],
      [{ kind: "visit", ids: [processing.id] }],
      undefined,
      undefined,
      ["process(String job)", "main(String[] args)"],
    );
    completed = [processing];
    processing = null;
    worker = "done";
    rec.add(
      state(),
      "complete",
      "Chuyển M01 vào Completed",
      "Worker đã xử lý xong; thêm job vào danh sách completed.",
      vars(),
      [completed[0].id],
      [{ kind: "move", ids: [completed[0].id] }],
    );
    result = "Completed: [M01]";
  } else if (operation === "offer") {
    rec.add(
      state(),
      "args",
      "Job M11 sẵn sàng",
      "M11 chuẩn bị đi vào phía REAR của queue.",
      { ...vars(), job: "M11" },
    );
    items = [...items, { id: "mail-11", value: "M11", slot: 10 }];
    rec.add(
      state(),
      "op",
      "Offer M11 vào REAR",
      "Các job hiện có giữ nguyên thứ tự. M11 sẽ được xử lý sau M10.",
      vars(),
      ["mail-11"],
      [{ kind: "insert", ids: ["mail-11"] }],
    );
    result = "Offer: M11";
  } else if (operation === "peek") {
    rec.add(
      state(),
      "op",
      "Peek tại FRONT",
      "Đọc M01, không loại khỏi queue.",
      { ...vars(), job: "M01" },
      [items[0].id],
      [{ kind: "visit", ids: [items[0].id] }],
    );
    result = "Front: M01";
  } else {
    rec.add(
      state(),
      "op",
      "Kiểm tra isEmpty",
      "Queue còn 10 phần tử. empty = false.",
      { ...vars(), empty: false },
    );
    result = "Empty: false";
  }
  rec.add(
    state(),
    "result",
    "Kết quả thao tác",
    result,
    vars(),
    [],
    [],
    result,
  );
  const output = `[${items.map((i) => i.value).join(", ")}]`;
  rec.add(
    state(),
    "print",
    "Hàng đợi hiện tại",
    "FRONT luôn là job chờ lâu nhất. Worker có vòng đời tách biệt với queue.",
    vars(),
    [],
    [],
    output,
  );
  return {
    key: `queue-${operation}`,
    code,
    steps: rec.steps,
    operation,
    complexity: operation === "offer" ? "O(1) amortized" : "O(1)",
    expectedOutput: `${result}\n${output}`,
  };
}
