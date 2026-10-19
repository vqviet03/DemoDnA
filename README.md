# Structure Lab 2.0

Phòng lab cấu trúc dữ liệu Java bằng **Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui Button, Lucide và Motion**. Không cần backend, tài khoản hay database.

Thiết kế tham chiếu: https://www.figma.com/design/QOChmzjJtIwC9ORcJ3MXAs

## Chạy local

Yêu cầu Node.js 22+ và npm. Java chỉ cần cho kiểm thử Java, không cần để chạy ứng dụng.

```bash
npm ci
npm run dev
```

Mở http://localhost:3000. Font Inter và JetBrains Mono, bao gồm glyph tiếng Việt, được đóng gói local bằng Fontsource; trình duyệt không tải Google Fonts.

## Nội dung

| Cấu trúc   | Thao tác                                                            | Bài toán                          |
| ---------- | ------------------------------------------------------------------- | --------------------------------- |
| ArrayList  | Add, insert, remove, get, resize                                    | Mảng động 10 phần tử, capacity 12 |
| LinkedList | AddFirst, AddLast, InsertAfter, RemoveFirst, RemoveAfter, traversal | Tạo và nối node 54 sau node 48    |
| Stack      | Push, pop, peek, isEmpty                                            | Undo trong editor, 9 action       |
| Queue      | Offer, poll, peek, isEmpty                                          | 10 email jobs và worker           |
| Tree / BST | Search, insert, delete, inorder, level-order                        | Kho tài liệu học tập theo ID      |
| Graph      | Kahn topological sort, cycle detection                              | Tiên quyết của 7 môn học          |

26 thao tác, mỗi thao tác tạo một chương trình Java 21 đầy đủ, có thể copy hoặc tải `Demo.java`. Có kiểm tra index/value cho mảng. Mỗi lần chọn thao tác là một bài replay độc lập từ dữ liệu ban đầu; không phải một REPL cộng dồn các thao tác.

Đây là **step replay của thuật toán Java**, không chạy JVM trong trình duyệt. ArrayList dùng mô hình mảng động tự triển khai, không truy cập field private của JDK. LinkedList là danh sách liên kết đơn tự triển khai; `java.util.LinkedList` là danh sách liên kết đôi. Sơ đồ Tree là BST khái niệm; `TreeMap<Integer, Lesson>` thực tế dùng **Red-Black Tree** tự cân bằng. Ví dụ delete chọn node lá 65; chương trình Java có đủ trường hợp xóa lá, một con và hai con.

## Điều khiển

- Previous / Next hoặc `←` / `→`: đi từng bước.
- Play / Pause hoặc `Space`: phát/dừng, tốc độ 0.5×–2×.
- Restart hoặc `R`: về đầu, giữ tốc độ đã chọn.
- Timeline: nhảy tới snapshot bất kỳ, hủy chuyển động cũ.
- Click số dòng Java: đặt/bỏ breakpoint. Play dừng tại dòng đó.
- Presentation: phóng vùng lab, ẩn navigation; `Escape` thoát.
- Theory: khái niệm, lưu trữ, ứng dụng, Big-O và các giới hạn mô hình.

Phím tắt không can thiệp khi nhập input/select, đang mở dialog hoặc dùng tổ hợp Ctrl/Alt/Meta. Pause, đổi tab/operation, tua timeline và unmount đều hủy timer/chuyển động liên quan. Tab trình duyệt bị ẩn sẽ tự Pause. Hỗ trợ `prefers-reduced-motion`.

## Kiến trúc

```text
src/
  algorithms/             Pure generators cho 6 cấu trúc
  engine/types.ts         Discriminated scene union và DebugStep
  engine/steps.ts         Java line markers, recorder và deep freeze
  engine/playback.ts      Pure playback state transitions
  hooks/use-playback.ts   Timer lifecycle và animation cancellation
  data/lessons.ts         Lý thuyết, thao tác và factory
  components/
    visualizers/          6 SVG/Motion renderers, Node/Edge primitives
    CodeEditor.tsx        Prism Java tokenizer, active line, breakpoints
    Lab.tsx               Shell, debugger và playback
    ui/button.tsx         shadcn/ui Button, Radix Slot và CVA
  app/                    Static App Router entry, theme và fonts
tests/                    Vitest và Playwright
scripts/check-java.ts     Biên dịch, chạy và đối chiếu output từng bài
```

`run.steps[index]` là nguồn dữ liệu duy nhất cho diagram, code highlight, variables, call stack, console và trace. Snapshot được clone và deep-freeze khi tạo; Previous/seek không đảo ngược mutation. Node/edge có ID ổn định. Animation dùng transform và SVG path interpolation; chuyển động không cập nhật React theo từng frame.

Phép gán mảng copy giá trị sang ô đích: ô nguồn vẫn hiện mờ cho tới khi bị ghi đè. Resize hiển thị old/expanded riêng và chỉ đổi `elements` sau khi copy đủ. LinkedList đổi reference trước, căn chỉnh hình sau. Queue có ba bước riêng: poll → worker process → completed. Graph tính degree từ toàn bộ cạnh; mỗi cạnh giảm đúng một lần và chỉ mở khóa khi degree về 0.

## Kiểm thử

```bash
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
# JDK 21+ phải có trong PATH:
npm run test:java
```

Có thể chỉ định `JAVAC=/path/to/javac JAVA=/path/to/java npm run test:java`. Script biên dịch và chạy **26 chương trình**, so sánh stdout với kết quả generator. Vitest kiểm tra shift/copy, reference ordering, LIFO/FIFO, BST, in-degree từng snapshot, topo-order, cycle, immutability và playback. Playwright chạy desktop + mobile, tất cả thao tác, forward/backward, autoplay cleanup, breakpoint, syntax, theme, presentation, font và reduced motion.

## Static export & GitHub Pages

```bash
NEXT_PUBLIC_BASE_PATH=/DemoDnA npm run build
E2E_STATIC=1 npm run test:e2e
```

Build sinh `out/`, sử dụng `output: "export"`, `trailingSlash: true`, không có server API và tắt image optimization. `NEXT_PUBLIC_BASE_PATH` mặc định rỗng cho local; workflow đặt `/DemoDnA`. Next tự prefix tài nguyên JS/CSS và font đóng gói trong CSS. `scripts/serve-export.mjs` mount đúng `out/` dưới `/DemoDnA/` để kiểm tra direct load/refresh và tài nguyên dưới subpath.

Workflow `.github/workflows/deploy-pages.yml` kiểm tra TypeScript, Vitest, 26 Java demos, build export và Playwright trên bản export trước khi upload `out/`. Pull request chỉ build/test. Push vào `main` hoặc workflow_dispatch sẽ deploy sau khi qua kiểm tra. Cần đặt **Settings → Pages → Source: GitHub Actions** khi chủ repository quyết định xuất bản.

Đích dự kiến: https://vqviet03.github.io/DemoDnA/. Việc chuẩn bị bản local không thực hiện push hoặc deploy.

## Bản 1.0 và thiết kế

Trang HTML gốc được giữ tại `legacy/index.html`, README cũ tại `legacy/README-v1.md`; `examples/VisualDebugDemos.java` là ví dụ lịch sử của bản 1.0. Java trong lab 2.0 được sinh từ các generator và tải bằng nút Download, tránh trộn dữ liệu giữa hai phiên bản.

Bố cục, typography, nền xanh xám, teal accent và editor nền tối dựa trên màn hình Figma. Mũi tên thuật toán là SVG động phụ thuộc snapshot. Asset mũi tên tĩnh của Figma trả HTTP 403 khi tải từ môi trường này, nên không có URL Figma tạm thời nào trong runtime.
