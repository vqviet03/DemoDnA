import type {
  AnimationInstruction,
  DebugStep,
  JavaSource,
  Scene,
  Variable,
} from "./types";
export function java(source: string): JavaSource {
  const markers: Record<string, number> = {};
  const lines = source
    .trim()
    .split("\n")
    .map((line, index) => {
      const marker = line.match(/\s*\/\/ @([\w-]+)\s*$/);
      if (marker) markers[marker[1]] = index + 1;
      return line.replace(/\s*\/\/ @[\w-]+\s*$/, "");
    });
  return { text: lines.join("\n"), markers };
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
export function recorder(
  code: JavaSource,
  callStack: readonly string[] = ["main(String[] args)"],
) {
  const steps: DebugStep[] = [];
  let output: string[] = [];
  return {
    steps,
    add(
      state: Scene,
      marker: string,
      title: string,
      description: string,
      variables: Record<string, Variable>,
      focus: readonly string[] = [],
      animations: readonly AnimationInstruction[] = [],
      consoleLine?: string,
      explanation?: string,
      stack: readonly string[] = callStack,
    ) {
      const line = code.markers[marker];
      if (!line) throw new Error(`Unknown Java marker: ${marker}`);
      if (consoleLine !== undefined) output = [...output, consoleLine];
      steps.push(
        freeze(
          structuredClone({
            id: `step-${steps.length}`,
            title,
            description,
            explanation:
              explanation ??
              explain(
                state,
                marker,
                description,
                code.text.split("\n")[line - 1].trim(),
                animations,
              ),
            activeLines: [line],
            variables,
            state,
            focus,
            animations,
            console: output,
            callStack:
              state.kind === "graph" && state.algorithm === "dfs"
                ? [...(state.stack ?? [])]
                    .reverse()
                    .map((n) => `dfs(${n})`)
                    .concat("main(String[] args)")
                : stack,
          }),
        ),
      );
    },
  };
}

function explain(
  state: Scene,
  marker: string,
  description: string,
  statement: string,
  animations: readonly AnimationInstruction[],
): string {
  const principles: Record<Scene["kind"], string> = {
    array:
      "Size đếm phần tử hợp lệ; capacity là số ô được cấp phát. Các ô ngoài size chưa thuộc danh sách.",
    linked:
      "Reference giữ danh tính node. Chỉ các node đi tới được từ head mới thuộc danh sách; đổi vị trí hình vẽ không đổi đối tượng trên heap.",
    stack:
      "LIFO: chỉ thao tác ở TOP. History và editor được cập nhật bằng hai lệnh riêng, vì vậy có thể quan sát trạng thái trung gian.",
    queue:
      "FIFO: lấy từ FRONT, thêm ở REAR. Completed thuộc worker, không phải một phần của queue đang chờ.",
    tree: "BST giữ khóa nhỏ ở trái và khóa lớn ở phải. Các liên kết xác định cây; đây không phải cấu trúc Red-Black Tree bên trong TreeMap.",
    graph:
      "Cạnh u → v có hướng. Visited ngăn xử lý lặp; thứ tự duyệt phụ thuộc thứ tự các láng giềng được lưu.",
  };
  const action = animations[0];
  const meaning =
    action?.kind === "copy" && action.from !== undefined
      ? `Sao chép ô ${action.from} sang ô ${action.to}; không xóa ô nguồn. Gán từ cuối về đầu khi dịch phải để không mất dữ liệu.`
      : marker === "print" || marker === "result"
        ? "Lệnh System.out ghi kết quả ở Console. Tua lại timeline chỉ đọc snapshot, không thực thi lại hay làm biến đổi dữ liệu."
        : principles[state.kind];
  return `${description}\nLệnh Java: ${statement}\n${meaning}`;
}
export function freshId(prefix: string, ids: readonly string[]): string {
  if (!ids.includes(prefix)) return prefix;
  let i = 2;
  while (ids.includes(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}
export const javaString = (value: string): string => JSON.stringify(value);
