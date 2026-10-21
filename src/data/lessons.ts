import type {
  Structure,
  LessonRun,
  Scene,
  OperationRequest,
} from "@/engine/types";
import { arrayRun, type ArrayOperation } from "@/algorithms/array";
import { linkedRun, type LinkedOperation } from "@/algorithms/linked";
import {
  stackRun,
  queueRun,
  type StackOperation,
  type QueueOperation,
} from "@/algorithms/stack-queue";
import { treeRun, type TreeOperation } from "@/algorithms/tree";
import {
  graphRun,
  traversalRun,
  parseGraphInput,
  type GraphOperation,
} from "@/algorithms/graph";
export interface Lesson {
  id: Structure;
  name: string;
  subtitle: string;
  title: string;
  description: string;
  concept: string;
  storage: string;
  use: string;
  comparison: string;
  warning: string;
  operations: readonly { id: string; label: string; call: string }[];
}
export const LESSONS: readonly Lesson[] = [
  {
    id: "array",
    name: "ArrayList",
    subtitle: "Dynamic array",
    title: "Mảng động · dữ liệu dùng chung",
    description: "Theo dõi từng ô nhớ. Hiểu điều gì xảy ra sau mỗi dòng Java.",
    concept:
      "Mảng động lưu phần tử trong vùng nhớ liên tiếp. Size là số phần tử; capacity là số ô đã cấp phát.",
    storage:
      "Mô hình DynamicArray tự triển khai bằng Integer[]. ArrayList của JDK che giấu mảng nội bộ private.",
    use: "Truy cập ngẫu nhiên, danh sách đọc nhiều, thêm cuối thường xuyên.",
    comparison:
      "Get O(1), nhưng insert/remove ở giữa O(n). LinkedList nối reference O(1) khi đã biết node.",
    warning:
      "Phép gán mảng là copy: ô nguồn vẫn có giá trị cho tới khi bị ghi đè. Ô mờ biểu diễn bản sao vật lý đó.",
    operations: [
      { id: "insert", label: "Insert at index", call: "insert(5, 49)" },
      { id: "add", label: "Add last", call: "add(49)" },
      { id: "remove", label: "Remove at index", call: "remove(5)" },
      { id: "get", label: "Get by index", call: "get(5)" },
      { id: "resize", label: "Resize capacity", call: "resize(12 → 18)" },
    ],
  },
  {
    id: "linked",
    name: "LinkedList",
    subtitle: "Nodes & references",
    title: "Kết nối dữ liệu bằng tham chiếu",
    description: "Quan sát node mới, đường nối next và thứ tự gán reference.",
    concept:
      "Danh sách liên kết đơn gồm các node độc lập. Mỗi node chứa data và reference next.",
    storage:
      "Node { int data; Node next; }, cùng hai reference head và tail. Đây là singly linked list tự triển khai; java.util.LinkedList là doubly linked.",
    use: "Thêm/xóa gần vị trí đã có reference, danh sách cần thay đổi liên kết.",
    comparison:
      "Nối node O(1) khi biết vị trí; tìm theo index O(n). ArrayList truy cập index O(1).",
    warning:
      "Di chuyển hình node chỉ là sắp xếp bố cục; không đổi địa chỉ đối tượng trên heap.",
    operations: [
      {
        id: "insertAfter",
        label: "Insert after node",
        call: "insertAfter(48, 54)",
      },
      { id: "addFirst", label: "Add first", call: "addFirst(6)" },
      { id: "addLast", label: "Add last", call: "addLast(108)" },
      { id: "removeFirst", label: "Remove first", call: "removeFirst()" },
      {
        id: "removeAfter",
        label: "Remove after node",
        call: "removeAfter(48)",
      },
      { id: "traversal", label: "Traversal", call: "traverse()" },
    ],
  },
  {
    id: "stack",
    name: "Stack",
    subtitle: "Last in, first out",
    title: "Undo trong trình soạn thảo",
    description:
      "Thao tác vào sau được hoàn tác trước. Theo dõi TOP và editor.",
    concept:
      "Stack tuân theo LIFO: Last In, First Out. Chỉ thêm, đọc và lấy ở TOP.",
    storage:
      "Deque<String> history = new ArrayDeque<>(); dùng push(), pop(), peek() và isEmpty().",
    use: "Undo/Redo, call stack, kiểm tra dấu ngoặc, duyệt DFS.",
    comparison:
      "Stack lấy phần tử mới nhất, Queue lấy phần tử cũ nhất. ArrayDeque là lựa chọn thay thế hiện đại cho java.util.Stack.",
    warning:
      "Editor trong bài là mô hình các Action. Một editor thật cần lưu dữ liệu đảo ngược của từng thao tác.",
    operations: [
      { id: "pop", label: "Pop · Undo", call: "history.pop()" },
      { id: "push", label: "Push action", call: "history.push(action)" },
      { id: "peek", label: "Peek top", call: "history.peek()" },
      { id: "isEmpty", label: "Is empty?", call: "history.isEmpty()" },
    ],
  },
  {
    id: "queue",
    name: "Queue",
    subtitle: "First in, first out",
    title: "Hàng đợi xử lý email",
    description: "Từ pending đến processing và completed, từng job một.",
    concept:
      "Queue tuân theo FIFO: First In, First Out. Offer vào REAR, poll từ FRONT.",
    storage:
      "Queue<String> jobs = new ArrayDeque<>(); quản lý thứ tự jobs, worker quản lý quá trình xử lý.",
    use: "Lập lịch công việc, điều phối tác vụ, xử lý email, duyệt BFS.",
    comparison:
      "Queue công bằng theo thứ tự đến; PriorityQueue chọn theo độ ưu tiên và không đảm bảo FIFO.",
    warning:
      "Retry, persistence và delivery guarantees thuộc logic worker/message broker, không thuộc Queue API.",
    operations: [
      { id: "poll", label: "Poll · Process job", call: "jobs.poll()" },
      { id: "offer", label: "Offer new job", call: 'jobs.offer("M11")' },
      { id: "peek", label: "Peek front", call: "jobs.peek()" },
      { id: "isEmpty", label: "Is empty?", call: "jobs.isEmpty()" },
    ],
  },
  {
    id: "tree",
    name: "Tree / BST",
    subtitle: "Ordered by key",
    title: "BST · nạp và tra cứu tài liệu",
    description: "Mỗi phép so sánh loại bỏ một nhánh không cần xét.",
    concept:
      "BST: mọi khóa bên trái nhỏ hơn node, mọi khóa bên phải lớn hơn node. Inorder trả về các khóa tăng dần.",
    storage:
      "Sơ đồ là BST tự triển khai. Trong ứng dụng Java, dùng TreeMap<Integer, Lesson>; TreeMap là Red-Black Tree tự cân bằng, có hình dạng khác sơ đồ này.",
    use: "Tra cứu tài liệu theo ID, range query và dữ liệu cần thứ tự khóa.",
    comparison:
      "BST thường O(h), có thể O(n) khi lệch. TreeMap đảm bảo get/put/remove O(log n). HashMap không giữ thứ tự và có get trung bình O(1).",
    warning:
      "Đây là BST tự triển khai, không phải cây Red-Black Tree nội bộ của TreeMap. Thứ tự nạp ID quyết định hình dạng cây; cây không tự cân bằng.",
    operations: [
      { id: "build", label: "Nạp dữ liệu → BST", call: "build(ids)" },
      { id: "search", label: "Search ID", call: "search(65)" },
      { id: "inorder", label: "Inorder traversal", call: "inorder(root)" },
      { id: "insert", label: "Insert ID", call: "insert(68)" },
      { id: "delete", label: "Delete ID", call: "delete(65)" },
      {
        id: "levelorder",
        label: "Level-order traversal",
        call: "levelOrder(root)",
      },
    ],
  },
  {
    id: "graph",
    name: "Graph",
    subtitle: "Dependencies & paths",
    title: "Graph · lưu trữ và tìm đường",
    description:
      "Nạp từng cạnh, so sánh cách lưu và theo dõi DFS/BFS trên cùng dữ liệu.",
    concept:
      "Graph có hướng lưu quan hệ u → v. DFS đi sâu rồi quay lui bằng call stack; BFS dùng queue để khám phá theo từng mức.",
    storage:
      "Danh sách kề: Map<Integer, List<Integer>> cho ví dụ đỉnh 1–7, bộ nhớ O(V + E). Ma trận kề: int[V][V], hàng là nguồn, cột là đích, bộ nhớ O(V²).",
    use: "Tìm đường, kiểm tra khả năng đi tới một node, khám phá quan hệ giữa các tài liệu hay môn học.",
    comparison:
      "DFS dùng call stack. BFS dùng FIFO và tìm đường ngắn nhất theo số cạnh khi mọi cạnh có trọng số bằng nhau. Thứ tự duyệt không phải thứ tự tiên quyết hợp lệ.",
    warning:
      "DFS quay lui bằng return. BFS chỉ lần ngược parent để dựng đường đi sau khi duyệt. Visited ngăn lặp; không được coi một cạnh tới node đã thăm là bằng chứng có chu trình.",
    operations: [
      { id: "load", label: "Nạp dữ liệu Graph", call: "load(edges)" },
      { id: "dfs", label: "DFS · quay lui", call: "dfs(start)" },
      { id: "bfs", label: "BFS · truy vết", call: "bfs(start, goal)" },
    ],
  },
];
export function createRun(
  structure: Structure,
  operation: string,
  at = 5,
  value = 49,
  seed?: Scene,
  request?: OperationRequest,
): LessonRun {
  switch (structure) {
    case "array":
      return arrayRun(
        operation as ArrayOperation,
        at,
        value,
        seed?.kind === "array" ? seed : undefined,
      );
    case "linked":
      return linkedRun(
        operation as LinkedOperation,
        seed?.kind === "linked" ? seed : undefined,
        request ? value : undefined,
        request?.at ?? 48,
      );
    case "stack":
      return stackRun(
        operation as StackOperation,
        seed?.kind === "stack" ? seed : undefined,
        request?.text || undefined,
      );
    case "queue":
      return queueRun(
        operation as QueueOperation,
        seed?.kind === "queue" ? seed : undefined,
        request?.text || undefined,
      );
    case "tree":
      return treeRun(
        operation as TreeOperation,
        request?.value,
        seed?.kind === "tree" ? seed : undefined,
        operation === "build" && request?.input
          ? parseTreeInput(request.input)
          : undefined,
      );
    case "graph":
      return operation === "kahn" || operation === "cycle"
        ? graphRun(operation === "cycle")
        : traversalRun(
            operation as GraphOperation,
            seed?.kind === "graph" ? seed : undefined,
            request?.representation ?? "list",
            operation === "load" && request?.input
              ? parseGraphInput(request.input)
              : undefined,
            request?.start,
            request?.goal,
          );
  }
}

export function parseTreeInput(input: string): readonly number[] {
  const values = input
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (
    !values.length ||
    values.length > 12 ||
    values.some((n) => !Number.isInteger(n) || Math.abs(n) > 999)
  )
    throw new RangeError(
      "Nhập 1–12 ID nguyên từ -999 đến 999, phân cách bằng dấu phẩy.",
    );
  return values;
}
