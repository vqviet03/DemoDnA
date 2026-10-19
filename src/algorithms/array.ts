import type { ArrayState, Item, LessonRun } from "@/engine/types";
import { java, recorder } from "@/engine/steps";
export const ARRAY_VALUES = [11, 18, 25, 31, 42, 55, 63, 71, 86, 94] as const;
export type ArrayOperation = "insert" | "add" | "remove" | "get" | "resize";
export function arrayRun(
  operation: ArrayOperation,
  at = 5,
  value = 49,
): LessonRun {
  const initial: number[] = [
    ...ARRAY_VALUES,
    ...(operation === "resize" ? [101, 112] : []),
  ];
  if (
    !Number.isInteger(at) ||
    at < 0 ||
    at > initial.length ||
    ((operation === "remove" || operation === "get") && at === initial.length)
  )
    throw new RangeError("Index không hợp lệ");
  let slots: (number | null)[] = [
    ...initial,
    ...Array<null>(12 - initial.length).fill(null),
  ];
  let items: Item[] = initial.map((v, i) => ({
    id: `a-${i}`,
    value: v,
    slot: i,
  }));
  let size = initial.length;
  const body: Record<ArrayOperation, string> = {
    insert: `    int at = ${at}, value = ${value}; // @args
    if (at < 0 || at > size) throw new IndexOutOfBoundsException(); // @check
    for (int i = size; i > at; i--) { // @loop
      elements[i] = elements[i - 1]; // @shift
    }
    elements[at] = value; // @write
    size++; // @size`,
    add: `    int value = ${value}; // @args
    elements[size] = value; // @write
    size++; // @size`,
    remove: `    int at = ${at}; // @args
    int removed = elements[at]; // @remove
    for (int i = at; i < size - 1; i++) { // @loop
      elements[i] = elements[i + 1]; // @shift
    }
    elements[--size] = null; // @size`,
    get: `    int at = ${at}; // @args
    int result = elements[at]; // @get
    System.out.println(result); // @result`,
    resize: `    Integer[] old = elements; // @args
    Integer[] expanded = new Integer[18]; // @allocate
    for (int i = 0; i < size; i++) { // @loop
      expanded[i] = old[i]; // @copy
    }
    elements = expanded; // @replace`,
  };
  const code = java(`import java.util.Arrays;
// Mô hình mảng động tự triển khai; không truy cập private ArrayList.
public class Demo {
  public static void main(String[] args) {
    Integer[] elements = {${slots.map((v) => (v === null ? "null" : v)).join(", ")}}; // @init
    int size = ${size}; // @start
${body[operation]}
    System.out.println(Arrays.toString(Arrays.copyOf(elements, size))); // @print
  }
}`);
  const rec = recorder(code);
  const state = (extra: Partial<ArrayState> = {}): ArrayState => ({
    kind: "array",
    slots,
    items,
    size,
    target: operation === "add" ? initial.length : at,
    ...extra,
  });
  const vars = (extra: Record<string, number | string | null> = {}) => ({
    size,
    capacity: slots.length,
    index: at,
    value,
    ...extra,
  });
  rec.add(
    state(),
    "start",
    "Mảng động, bộ nhớ liên tiếp",
    `Mảng có ${size} phần tử và ${slots.length - size} ô dự phòng. Index bắt đầu từ 0.`,
    vars(),
  );
  rec.add(
    state(),
    "args",
    operation === "resize" ? "Capacity đã đầy" : "Chuẩn bị thao tác",
    operation === "resize"
      ? "12/12 ô đã dùng. Giữ tham chiếu tới vùng nhớ cũ."
      : `Thực hiện ${operation} với index = ${at}, value = ${value}.`,
    vars(),
  );
  if (operation === "insert") {
    rec.add(
      state(),
      "check",
      "Kiểm tra index",
      "Index hợp lệ; dịch từ cuối để không ghi đè phần tử chưa sao chép.",
      vars(),
    );
    for (let i = size; i > at; i--) {
      rec.add(
        state(),
        "loop",
        `Kiểm tra i = ${i}`,
        `${i} > ${at}: tiếp tục vòng lặp.`,
        vars({ i }),
      );
      const moving = items.find((x) => x.slot === i - 1)!;
      slots = [...slots];
      slots[i] = slots[i - 1];
      items = items.map((x) => (x.id === moving.id ? { ...x, slot: i } : x));
      rec.add(
        state(),
        "shift",
        `Dịch ${moving.value}: ${i - 1} → ${i}`,
        `Copy elements[${i - 1}] vào elements[${i}]. Ô nguồn vẫn giữ giá trị cho tới khi được ghi đè.`,
        vars({ i, moving: Number(moving.value) }),
        [moving.id],
        [{ kind: "copy", ids: [moving.id], from: i - 1, to: i }],
      );
    }
    slots = [...slots];
    slots[at] = value;
    items = [...items, { id: "a-new", value, slot: at }];
    rec.add(
      state(),
      "write",
      `Đặt ${value} tại index ${at}`,
      "Khoảng trống đã sẵn sàng. Ghi giá trị mới vào vị trí chèn.",
      vars({ i: at }),
      ["a-new"],
      [{ kind: "insert", ids: ["a-new"] }],
    );
    size++;
    rec.add(
      state(),
      "size",
      "Cập nhật size",
      "Thêm một phần tử; capacity không đổi.",
      vars(),
      ["a-new"],
    );
  } else if (operation === "add") {
    slots = [...slots];
    slots[size] = value;
    items = [...items, { id: "a-new", value, slot: size }];
    rec.add(
      state(),
      "write",
      `Thêm ${value} ở cuối`,
      "Ghi vào ô dự phòng, không cần dịch các phần tử.",
      vars(),
      ["a-new"],
      [{ kind: "insert", ids: ["a-new"] }],
    );
    size++;
    rec.add(
      state(),
      "size",
      "Tăng size",
      "Thao tác add hoàn tất trong O(1) khi còn capacity.",
      vars(),
      ["a-new"],
    );
  } else if (operation === "remove") {
    const removed = slots[at];
    const victim = items.find((x) => x.slot === at)!;
    items = items.filter((x) => x.id !== victim.id);
    rec.add(
      state(),
      "remove",
      `Lưu giá trị ${removed}`,
      "Đọc giá trị cần xóa. Ô vật lý chỉ bị ghi đè ở bước dịch tiếp theo.",
      vars({ removed }),
      [],
      [{ kind: "remove", ids: [victim.id] }],
    );
    for (let i = at; i < size - 1; i++) {
      const moving = items.find((x) => x.slot === i + 1)!;
      slots = [...slots];
      slots[i] = slots[i + 1];
      items = items.map((x) => (x.id === moving.id ? { ...x, slot: i } : x));
      rec.add(
        state(),
        "shift",
        `Dịch ${moving.value}: ${i + 1} → ${i}`,
        "Dịch sang trái để lấp vị trí đã xóa.",
        vars({ i, removed }),
        [moving.id],
        [{ kind: "copy", ids: [moving.id], from: i + 1, to: i }],
      );
    }
    size--;
    slots = [...slots];
    slots[size] = null;
    rec.add(
      state(),
      "size",
      "Giải phóng ô cuối",
      "Giảm size và xóa bản sao ở ô cuối. Capacity vẫn là 12.",
      vars({ removed }),
    );
  } else if (operation === "get") {
    const item = items[at];
    rec.add(
      state(),
      "get",
      `Truy cập trực tiếp index ${at}`,
      `Địa chỉ ô được xác định trực tiếp. result = ${item.value}.`,
      vars({ result: Number(item.value) }),
      [item.id],
      [{ kind: "visit", ids: [item.id] }],
    );
    rec.add(
      state(),
      "result",
      "Trả về kết quả",
      "Get không thay đổi mảng.",
      vars({ result: Number(item.value) }),
      [item.id],
      [],
      String(item.value),
    );
  } else {
    const oldSlots = [...slots];
    slots = Array<null>(18).fill(null);
    items = [];
    rec.add(
      state({ oldSlots, copying: true }),
      "allocate",
      "Cấp phát vùng nhớ mới",
      "Tạo mảng expanded có 18 ô; elements vẫn trỏ vào mảng cũ có 12 ô.",
      vars({ "elements.length": 12, "expanded.length": 18 }),
    );
    for (let i = 0; i < size; i++) {
      slots = [...slots];
      slots[i] = oldSlots[i];
      items = [...items, { id: `a-${i}`, value: oldSlots[i]!, slot: i }];
      rec.add(
        state({ oldSlots, copying: true }),
        "copy",
        `Copy ô ${i} sang mảng mới`,
        `expanded[${i}] = old[${i}]. Dữ liệu cũ vẫn còn nguyên.`,
        vars({ i, "elements.length": 12 }),
        [`a-${i}`],
        [{ kind: "copy", ids: [`a-${i}`], from: i, to: i }],
      );
    }
    rec.add(
      state({ oldSlots }),
      "replace",
      "Chuyển tham chiếu elements",
      "elements = expanded. Vùng nhớ mới có capacity 18; size vẫn là 12.",
      vars(),
      [],
      [{ kind: "reference", ids: [] }],
    );
  }
  const output = `[${slots.slice(0, size).join(", ")}]`;
  rec.add(
    state(),
    "print",
    "Hoàn tất thao tác",
    "Snapshot kết quả được giữ nguyên khi Previous / Next hoặc tua timeline.",
    vars(),
    items.map((x) => x.id),
    [],
    output,
  );
  return {
    key: `array-${operation}-${at}-${value}`,
    code,
    steps: rec.steps,
    operation,
    complexity:
      operation === "get"
        ? "O(1)"
        : operation === "add"
          ? "O(1) amortized"
          : "O(n)",
    expectedOutput: operation === "get" ? `${slots[at]}\n${output}` : output,
  };
}
