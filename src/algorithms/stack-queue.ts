import { java, recorder, freshId, javaString } from "@/engine/steps";
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
export function stackRun(
  operation: StackOperation,
  seed?: StackState,
  action = "Insert title",
): LessonRun {
  let editor: string[] = seed
    ? [...seed.editor]
    : ACTIONS.slice(0, operation === "push" ? 8 : 9);
  let items: Item[] = seed
    ? seed.items.map((n) => ({ ...n }))
    : editor.map((value, slot) => ({ id: `s-${slot}`, value, slot }));
  const initial = [...editor];
  let removed: Item | undefined;
  const bodies: Record<StackOperation, string> = {
    pop: `    if (!history.isEmpty()) { // @check
      String removed = history.pop(); // @op
      editor.remove(editor.size()-1); // @undo
      System.out.println("Undo: " + removed); // @result
    } else System.out.println("Stack is empty"); // @empty`,
    push: `    String action = ${javaString(action)}; // @args
    history.push(action); // @op
    editor.add(action); // @apply
    System.out.println("Push: " + action); // @result`,
    peek: `    String top = history.peek(); // @op
    System.out.println("Top: " + top); // @result`,
    isEmpty: `    boolean empty = history.isEmpty(); // @op
    System.out.println("Empty: " + empty); // @result`,
  };
  const code = java(`import java.util.*;
public class Demo {
  public static void main(String[] args) {
    Deque<String> history = new ArrayDeque<>();
    List<String> editor = new ArrayList<>();
    for (String action : new String[]{${initial.map(javaString).join(", ")}}) {
      history.push(action); editor.add(action);
    } // @init
${bodies[operation]}
    System.out.println(history); // @print
  }
}`);
  const generation = seed ? (seed.generation ?? 0) + 1 : 0;
  const rec = recorder(code),
    state = (): StackState => ({
      kind: "stack",
      generation,
      items,
      editor,
      removed,
    });
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
    `${items.length} thao tác trong cùng history. TOP là thao tác mới nhất.`,
    vars(),
  );
  let result = "";
  if (operation === "pop" && items.length) {
    rec.add(
      state(),
      "check",
      "Kiểm tra stack trước pop",
      "history.isEmpty() = false; có thể lấy phần tử tại TOP mà không gặp NoSuchElementException.",
      vars(),
    );
    removed = items.at(-1)!;
    items = items.slice(0, -1);
    rec.add(
      state(),
      "op",
      `Pop: ${removed.value}`,
      "Lấy khỏi history trước. Nội dung editor chưa được hoàn tác ở lệnh này.",
      { ...vars(), removed: removed.value },
      [removed.id],
      [{ kind: "remove", ids: [removed.id] }],
    );
    editor = editor.slice(0, -1);
    rec.add(
      state(),
      "undo",
      "Undo trong editor",
      `Bỏ action «${removed.value}». Editor quay về trạng thái trước action này.`,
      { ...vars(), removed: removed.value },
      [],
      [],
      undefined,
      "Một Action thực tế cần lưu dữ liệu đảo ngược. Ở đây editor là danh sách các action đã áp dụng; bỏ action cuối sẽ đảo lại đúng thao tác tương ứng.",
    );
    result = `Undo: ${removed.value}`;
  } else if (operation === "pop") {
    result = "Stack is empty";
    rec.add(
      state(),
      "empty",
      "Stack rỗng",
      "Không gọi pop() khi rỗng; không có dữ liệu hay editor nào bị thay đổi.",
      vars(),
    );
  } else if (operation === "push") {
    rec.add(
      state(),
      "args",
      "Tạo thao tác mới",
      `Chuẩn bị action «${action}».`,
      { ...vars(), action },
    );
    const item = {
      id: freshId(
        seed ? `s-new-g${generation}` : `s-${items.length}`,
        items.map((n) => n.id),
      ),
      value: action,
      slot: items.length,
    };
    items = [...items, item];
    rec.add(
      state(),
      "op",
      "Push lên TOP",
      "Đưa action mới vào cùng đầu lấy ra. Thứ tự các action cũ giữ nguyên.",
      vars(),
      [item.id],
      [{ kind: "insert", ids: [item.id] }],
    );
    editor = [...editor, action];
    rec.add(
      state(),
      "apply",
      "Áp dụng vào editor",
      `editor.add(action); history và nội dung đã cùng ghi nhận «${action}».`,
      vars(),
      [item.id],
    );
    result = `Push: ${action}`;
  } else if (operation === "peek") {
    result = `Top: ${items.at(-1)?.value ?? "null"}`;
    rec.add(
      state(),
      "op",
      "Peek tại TOP",
      "Đọc action mới nhất; peek() trả null khi rỗng, không lấy action khỏi history.",
      { ...vars(), result: items.at(-1)?.value ?? null },
      items.length ? [items.at(-1)!.id] : [],
    );
  } else {
    result = `Empty: ${items.length === 0}`;
    rec.add(
      state(),
      "op",
      "Kiểm tra isEmpty",
      `size = ${items.length}; empty = ${items.length === 0}.`,
      { ...vars(), empty: items.length === 0 },
    );
  }
  rec.add(
    state(),
    operation === "pop" && !removed ? "empty" : "result",
    "Kết quả thao tác",
    result,
    vars(),
    [],
    [],
    result,
  );
  const output = `[${[...items]
    .reverse()
    .map((n) => n.value)
    .join(", ")}]`;
  rec.add(
    state(),
    "print",
    "History hiện tại",
    "Hiển thị TOP → BOTTOM. Operation sau sử dụng chính history và editor này.",
    vars(),
    [],
    [],
    output,
  );
  return {
    key: `stack-${operation}-${action}`,
    code,
    steps: rec.steps,
    operation,
    complexity: operation === "push" ? "O(1) amortized" : "O(1)",
    expectedOutput: `${result}\n${output}`,
  };
}
export function queueRun(
  operation: QueueOperation,
  seed?: QueueState,
  job?: string,
): LessonRun {
  let items: Item[] = seed
    ? seed.items.map((n) => ({ ...n }))
    : Array.from({ length: 10 }, (_, i) => ({
        id: `mail-${i + 1}`,
        value: `M${String(i + 1).padStart(2, "0")}`,
        slot: i,
      }));
  let processing: Item | null = null,
    completed: Item[] = seed ? [...seed.completed] : [];
  let worker: QueueState["worker"] = "idle";
  const all = [...items, ...completed],
    newJob =
      job ??
      `M${String(Math.max(0, ...all.map((n) => Number(String(n.value).replace(/^M/, "")) || 0)) + 1).padStart(2, "0")}`;
  const bodies: Record<QueueOperation, string> = {
    poll: `    String job = jobs.poll(); // @op
    if (job != null) { // @check
      process(job); // @process
      completed.add(job); // @complete
    }
    System.out.println("Completed: " + completed); // @result`,
    offer: `    String job = ${javaString(newJob)}; // @args
    jobs.offer(job); // @op
    System.out.println("Offer: " + job); // @result`,
    peek: `    String job = jobs.peek(); // @op
    System.out.println("Front: " + job); // @result`,
    isEmpty: `    boolean empty = jobs.isEmpty(); // @op
    System.out.println("Empty: " + empty); // @result`,
  };
  const code = java(`import java.util.*;
public class Demo {
  // Worker đồng bộ; retry là logic riêng, không thuộc Queue API.
  static void process(String job) { /* gửi email */ }
  public static void main(String[] args) {
    Queue<String> jobs = new ArrayDeque<>();
    List<String> completed = new ArrayList<>(Arrays.asList(${completed.map((n) => javaString(String(n.value))).join(",")}));
    for (String job : new String[]{${items.map((n) => javaString(String(n.value))).join(",")}}) jobs.offer(job); // @init
${bodies[operation]}
    System.out.println(jobs); // @print
  }
}`);
  const generation = seed ? (seed.generation ?? 0) + 1 : 0;
  const rec = recorder(code),
    state = (): QueueState => ({
      kind: "queue",
      generation,
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
    `${items.length} jobs đang chờ, ${completed.length} đã xong từ các operation trước. Offer vào REAR, poll từ FRONT.`,
    vars(),
  );
  let result = "";
  if (operation === "poll") {
    processing = items[0] ?? null;
    items = items.slice(1).map((n, slot) => ({ ...n, slot }));
    const item = processing;
    rec.add(
      state(),
      "op",
      item ? `Poll: lấy ${item.value} ở FRONT` : "Poll trên queue rỗng",
      item
        ? `${item.value} rời queue và đến worker. Các jobs còn lại dịch trái.`
        : "poll() trả null; worker không xử lý gì.",
      { ...vars(), job: item?.value ?? null },
      item ? [item.id] : [],
      item ? [{ kind: "move", ids: [item.id, ...items.map((n) => n.id)] }] : [],
    );
    if (item) {
      worker = "processing";
      rec.add(
        state(),
        "process",
        `Worker đang xử lý ${item.value}`,
        "process(job) xử lý job đã lấy ra. Queue không tự gửi email hay tự retry.",
        vars(),
        [item.id],
        [{ kind: "visit", ids: [item.id] }],
        undefined,
        undefined,
        ["process(String job)", "main(String[] args)"],
      );
      completed = [...completed, item];
      processing = null;
      worker = "done";
      rec.add(
        state(),
        "complete",
        `Chuyển ${item.value} vào Completed`,
        "Thêm vào lịch sử completed, giữ nguyên các jobs đã xử lý trước đó.",
        vars(),
        [item.id],
        [{ kind: "move", ids: [item.id] }],
      );
    }
    result = `Completed: [${completed.map((n) => n.value).join(", ")}]`;
  } else if (operation === "offer") {
    rec.add(
      state(),
      "args",
      `Job ${newJob} sẵn sàng`,
      `Chuẩn bị đưa ${newJob} vào REAR.`,
      { ...vars(), job: newJob },
    );
    const item = {
      id: freshId(
        seed ? `mail-new-g${generation}` : `mail-${newJob}`,
        all.map((n) => n.id),
      ),
      value: newJob,
      slot: items.length,
    };
    items = [...items, item];
    rec.add(
      state(),
      "op",
      `Offer ${newJob} vào REAR`,
      "Các jobs cũ giữ nguyên thứ tự. Job mới phải chờ mọi job phía trước.",
      vars(),
      [item.id],
      [{ kind: "insert", ids: [item.id] }],
    );
    result = `Offer: ${newJob}`;
  } else if (operation === "peek") {
    result = `Front: ${items[0]?.value ?? "null"}`;
    rec.add(
      state(),
      "op",
      "Peek tại FRONT",
      "Đọc job chờ lâu nhất mà không xóa; queue rỗng trả null.",
      { ...vars(), job: items[0]?.value ?? null },
      items.length ? [items[0].id] : [],
    );
  } else {
    result = `Empty: ${items.length === 0}`;
    rec.add(
      state(),
      "op",
      "Kiểm tra isEmpty",
      `Queue có ${items.length} jobs; empty = ${items.length === 0}.`,
      { ...vars(), empty: items.length === 0 },
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
  const output = `[${items.map((n) => n.value).join(", ")}]`;
  rec.add(
    state(),
    "print",
    "Hàng đợi hiện tại",
    "Operation tiếp theo nhận chính pending và completed ở bước này.",
    vars(),
    [],
    [],
    output,
  );
  return {
    key: `queue-${operation}-${newJob}`,
    code,
    steps: rec.steps,
    operation,
    complexity: operation === "offer" ? "O(1) amortized" : "O(1)",
    expectedOutput: `${result}\n${output}`,
  };
}
