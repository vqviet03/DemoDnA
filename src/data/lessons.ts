import type { Structure, LessonRun } from "@/engine/types";
import { arrayRun, type ArrayOperation } from "@/algorithms/array";
import { linkedRun, type LinkedOperation } from "@/algorithms/linked";
import {
  stackRun,
  queueRun,
  type StackOperation,
  type QueueOperation,
} from "@/algorithms/stack-queue";
import { treeRun, type TreeOperation } from "@/algorithms/tree";
import { graphRun } from "@/algorithms/graph";
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
    title: "Chèn giá trị vào mảng động",
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
        label: "Insert after 48",
        call: "insertAfter(48, 54)",
      },
      { id: "addFirst", label: "Add first", call: "addFirst(6)" },
      { id: "addLast", label: "Add last", call: "addLast(108)" },
      { id: "removeFirst", label: "Remove first", call: "removeFirst()" },
      { id: "removeAfter", label: "Remove after 48", call: "removeAfter(48)" },
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
    title: "Tìm tài liệu theo ID",
    description: "Mỗi phép so sánh loại bỏ một nhánh không cần xét.",
    concept:
      "BST: mọi khóa bên trái nhỏ hơn node, mọi khóa bên phải lớn hơn node. Inorder trả về các khóa tăng dần.",
    storage:
      "Sơ đồ là BST tự triển khai. Trong ứng dụng Java, dùng TreeMap<Integer, Lesson>; TreeMap là Red-Black Tree tự cân bằng, có hình dạng khác sơ đồ này.",
    use: "Tra cứu tài liệu theo ID, range query và dữ liệu cần thứ tự khóa.",
    comparison:
      "BST thường O(h), có thể O(n) khi lệch. TreeMap đảm bảo get/put/remove O(log n). HashMap không giữ thứ tự và có get trung bình O(1).",
    warning:
      "Không coi sơ đồ BST này là cây nội bộ của java.util.TreeMap. Ví dụ delete chọn node lá 65; Java cung cấp đầy đủ ba trường hợp xóa.",
    operations: [
      { id: "search", label: "Search ID 65", call: "search(65)" },
      { id: "inorder", label: "Inorder traversal", call: "inorder(root)" },
      { id: "insert", label: "Insert ID 68", call: "insert(68)" },
      { id: "delete", label: "Delete ID 65", call: "delete(65)" },
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
    title: "Xây dựng lộ trình học tập",
    description: "Mở khóa môn học bằng Topological Sort — Kahn’s Algorithm.",
    concept:
      "Đồ thị có hướng biểu diễn quan hệ tiên quyết. Kahn đưa các node có in-degree = 0 vào Ready Queue.",
    storage:
      "Map<String, List<String>>: mỗi môn ánh xạ tới danh sách các môn phụ thuộc trực tiếp vào nó.",
    use: "Lập lịch môn học, build dependency, pipeline và thứ tự chạy tác vụ.",
    comparison:
      "Topological Sort cần quan hệ có hướng và kiểm tra chu trình. BFS thường không thay thế được việc giải quyết tiên quyết.",
    warning:
      "Nếu xử lý ít hơn V node khi queue rỗng thì đồ thị có chu trình. Không thể tạo lộ trình hợp lệ cho toàn bộ môn.",
    operations: [
      { id: "kahn", label: "Kahn’s Algorithm", call: "topologicalSort(graph)" },
      { id: "cycle", label: "Detect a cycle", call: "detectCycle(graph)" },
    ],
  },
];
export function createRun(
  structure: Structure,
  operation: string,
  at = 5,
  value = 49,
): LessonRun {
  switch (structure) {
    case "array":
      return arrayRun(operation as ArrayOperation, at, value);
    case "linked":
      return linkedRun(operation as LinkedOperation);
    case "stack":
      return stackRun(operation as StackOperation);
    case "queue":
      return queueRun(operation as QueueOperation);
    case "tree":
      return treeRun(operation as TreeOperation);
    case "graph":
      return graphRun(operation === "cycle");
  }
}
