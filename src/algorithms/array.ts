import type { ArrayState, Item, LessonRun } from "@/engine/types";
import { java, recorder, freshId } from "@/engine/steps";
export const ARRAY_VALUES = [11, 18, 25, 31, 42, 55, 63, 71, 86, 94] as const;
export type ArrayOperation = "insert" | "add" | "remove" | "get" | "resize";
export function arrayRun(
  operation: ArrayOperation,
  at = 5,
  value = 49,
  seed?: ArrayState,
): LessonRun {
  const initial: number[] = seed
    ? seed.slots.slice(0, seed.size).map(Number)
    : [...ARRAY_VALUES, ...(operation === "resize" ? [101, 112] : [])];
  if (
    ["insert", "add"].includes(operation) &&
    (!Number.isInteger(value) || Math.abs(value) > 999)
  )
    throw new RangeError("Giá trị phải là số nguyên từ -999 đến 999");
  if (
    (operation === "insert" || operation === "remove" || operation === "get") &&
    (!Number.isInteger(at) ||
      at < 0 ||
      at > initial.length ||
      ((operation === "remove" || operation === "get") &&
        at === initial.length))
  )
    throw new RangeError(
      `Index hợp lệ: 0–${initial.length - (operation === "insert" ? 0 : 1)}`,
    );
  let slots: (number | null)[] = seed
    ? [...seed.slots]
    : [...initial, ...Array<null>(12 - initial.length).fill(null)];
  let items: Item[] = seed
    ? seed.items.map((x) => ({ ...x }))
    : initial.map((value, slot) => ({ id: `a-${slot}`, value, slot }));
  let size = initial.length;
  const newId = freshId(
    seed ? `a-new-g${(seed.generation ?? 0) + 1}` : "a-new",
    items.map((x) => x.id),
  );
  const oldCapacity = slots.length;
  const newCapacity = Math.max(oldCapacity + 1, Math.ceil(oldCapacity * 1.5));
  const expand =
    operation === "resize" ||
    ((operation === "insert" || operation === "add") && size === slots.length);
  const resizeCode = `    Integer[] old = elements; // @old
    Integer[] expanded = new Integer[${newCapacity}]; // @allocate
    for (int i = 0; i < size; i++) {
      expanded[i] = old[i]; // @copy
    }
    elements = expanded; // @replace`;
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
    resize: resizeCode,
  };
  const code = java(`import java.util.Arrays;
// Mô hình mảng động tự triển khai; không truy cập private ArrayList.
public class Demo {
  public static void main(String[] args) {
    Integer[] elements = {${slots.map((v) => (v === null ? "null" : v)).join(", ")}}; // @init
    int size = ${size}; // @start
${expand && operation !== "resize" ? body[operation].replace("// @args\n", "// @args\n" + resizeCode + "\n") : body[operation]}
    System.out.println(Arrays.toString(Arrays.copyOf(elements, size))); // @print
  }
}`);
  const generation = seed ? (seed.generation ?? 0) + 1 : 0;
  const rec = recorder(code);
  const state = (extra: Partial<ArrayState> = {}): ArrayState => ({
    kind: "array",
    generation,
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
    operation === "resize" ? "old" : "args",
    operation === "resize" ? "Chuẩn bị mở rộng capacity" : "Chuẩn bị thao tác",
    operation === "resize"
      ? `${size}/${slots.length} ô đang dùng. Giữ tham chiếu tới vùng nhớ cũ.`
      : `Thực hiện ${operation} với index = ${at}, value = ${value}.`,
    vars(),
  );
  if (expand) {
    const oldSlots = [...slots];
    const originalItems = [...items];
    slots = Array<null>(newCapacity).fill(null);
    items = [];
    rec.add(
      state({ oldSlots, copying: true }),
      "allocate",
      "Cấp phát vùng nhớ mới",
      `Tạo expanded có ${newCapacity} ô. Mảng cũ ${oldCapacity} ô vẫn giữ toàn bộ dữ liệu.`,
      vars({ "elements.length": oldCapacity, "expanded.length": newCapacity }),
    );
    for (let i = 0; i < size; i++) {
      slots = [...slots];
      slots[i] = oldSlots[i];
      const item = originalItems.find((x) => x.slot === i)!;
      items = [...items, item];
      rec.add(
        state({ oldSlots, copying: true }),
        "copy",
        `Copy ô ${i} sang mảng mới`,
        `expanded[${i}] = old[${i}] = ${oldSlots[i]}. Size chưa thay đổi.`,
        vars({ i }),
        [item.id],
        [{ kind: "copy", ids: [item.id], from: i, to: i }],
      );
    }
    rec.add(
      state({ oldSlots }),
      "replace",
      "Chuyển tham chiếu elements",
      `elements = expanded; capacity ${oldCapacity} → ${newCapacity}. Size vẫn ${size}.`,
      vars(),
      [],
      [{ kind: "reference", ids: [] }],
    );
  }
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
    items = [...items, { id: newId, value, slot: at }];
    rec.add(
      state(),
      "write",
      `Đặt ${value} tại index ${at}`,
      "Khoảng trống đã sẵn sàng. Ghi giá trị mới vào vị trí chèn.",
      vars({ i: at }),
      [newId],
      [{ kind: "insert", ids: [newId] }],
    );
    size++;
    rec.add(
      state(),
      "size",
      "Cập nhật size",
      "Thêm một phần tử; capacity không đổi.",
      vars(),
      [newId],
    );
  } else if (operation === "add") {
    slots = [...slots];
    slots[size] = value;
    items = [...items, { id: newId, value, slot: size }];
    rec.add(
      state(),
      "write",
      `Thêm ${value} ở cuối`,
      "Ghi vào ô dự phòng, không cần dịch các phần tử.",
      vars(),
      [newId],
      [{ kind: "insert", ids: [newId] }],
    );
    size++;
    rec.add(
      state(),
      "size",
      "Tăng size",
      "Thao tác add hoàn tất trong O(1) khi còn capacity.",
      vars(),
      [newId],
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
      `Giảm size và xóa bản sao ở ô cuối. Capacity vẫn là ${slots.length}.`,
      vars({ removed }),
    );
  } else if (operation === "get") {
    const item = items.find((x) => x.slot === at)!;
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
