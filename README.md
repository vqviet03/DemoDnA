# Structure Lab 2.0

Bản đang chạy: https://dnademo.eeslern.com/

URL Vercel: https://structure-lab-java-visualizer.vercel.app/

Phòng lab cấu trúc dữ liệu Java bằng **Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui Button, Lucide và Motion**. Không cần backend, tài khoản hay database.

Thiết kế tham chiếu: https://www.figma.com/design/QOChmzjJtIwC9ORcJ3MXAs

## Đồng bộ GitHub

Repository: https://github.com/vqviet03/DemoDnA

Bản Next.js hiện tại nằm tại root repository. Bản HTML 1.0 được giữ trong `legacy/` và trong lịch sử Git.

Workflow `.github/workflows/deploy-pages.yml` cài dependency từ lockfile, chạy unit test, build static export với `basePath` do GitHub Pages cung cấp rồi deploy thư mục `out/`. Đường dẫn Pages: https://vqviet03.github.io/DemoDnA/.

Để kiểm tra cùng subpath ở local:

```bash
NEXT_PUBLIC_BASE_PATH=/DemoDnA npm run build
NEXT_PUBLIC_BASE_PATH=/DemoDnA E2E_STATIC=1 npm run test:e2e
```

Bản Vercel tại `dnademo.eeslern.com` build với base path rỗng. `.env*`, `.vercel/`, dependency và các thư mục build không được commit.

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
| Tree / BST | Nạp ID từng bước, search, insert, delete, inorder, level-order                        | Kho tài liệu học tập theo ID      |
| Graph | Nạp cạnh, DFS quay lui, BFS truy vết; list / matrix | Lưu đồ thị có hướng và tìm đường |

28 operation, mỗi operation có chương trình Java 21 hợp lệ, có thể copy hoặc tải `Demo.java`.

Mỗi tab giữ một bộ dữ liệu riêng trong phiên trình duyệt. Đổi operation hoặc chuyển sang tab khác không làm mất dữ liệu. Lab mở sẵn một operation mẫu trong timeline; operation mới nối từ **kết quả cuối chuỗi**, kể cả khi đang tua về bước trước. Dùng **Reset** để tạo lại bộ mẫu, **Restart** chỉ phát lại timeline.

- Chọn operation và tham số, nhấn **Áp dụng** để nối một mô phỏng.
- Hoặc nhấn **Thêm** sau từng lựa chọn (tối đa 3), rồi **Chạy chuỗi**. Mỗi operation nhận đúng snapshot cuối của operation trước. Lỗi ở bất kỳ operation nào sẽ hủy toàn bộ lần nối, giữ nguyên dữ liệu.
- Chip lịch sử cho phép nhảy tới đầu từng operation. Java, breakpoint, variables, console và giải thích đổi theo đúng nguồn code của đoạn đó.
- Tree nhận 1–12 ID nguyên: `50, 30, 70, 20, 40, 60, 65`. Nạp lại dựng cây từ rỗng và cho thấy từng phép so sánh, cấp phát, nối cha/con.
- Graph mẫu dùng các đỉnh **1–7**, DFS bắt đầu từ **1**, BFS tìm đường tới **7**. Danh sách kề Java dùng `Map<Integer, List<Integer>>`. Graph nhận tối đa 12 đỉnh / 24 cạnh, ví dụ `1>2, 1>3, 2>4, 3>4, 5`. Đỉnh riêng biểu diễn node cô lập. Graph có hướng, không tự thêm cạnh ngược; cạnh trùng được loại bỏ.
- Chọn cách lưu danh sách kề hoặc ma trận kề trước khi chạy. Ma trận có hàng là nguồn, cột là đích. Có thể đổi góc xem trong visualization mà không thay đổi dữ liệu.
- DFS hiển thị call stack và từng lần return về cha. BFS dùng queue, đánh dấu visited khi enqueue, rồi lần ngược parent để dựng đường đi ngắn nhất theo số cạnh. Node không tới được và chu trình đều được xử lý an toàn bằng visited. Thứ tự DFS/BFS không phải topological order.

Giao diện cố định theo `100dvh`, không cuộn trang. Desktop hiển thị diagram + Java và ba panel giải thích / biến / console. Mobile giữ diagram và playback, chuyển panel phụ bằng tab; Graph có các góc Đồ thị / Danh sách kề / Ma trận kề để giữ chữ dễ đọc. Panel code tự cuộn tới dòng đang chạy; nội dung dài có cuộn nội bộ. Dữ liệu được giữ trong bộ nhớ phiên; tải lại trang sẽ tạo lại bộ mẫu.

Đây là **step replay của thuật toán Java**, không chạy JVM trong trình duyệt. ArrayList dùng mô hình mảng động tự triển khai, không truy cập field private của JDK. LinkedList là danh sách liên kết đơn tự triển khai; `java.util.LinkedList` là danh sách liên kết đôi. Sơ đồ Tree là BST khái niệm; `TreeMap<Integer, Lesson>` thực tế dùng **Red-Black Tree** tự cân bằng. Delete mô phỏng đủ trường hợp node lá, một con và hai con (inorder successor).

## Điều khiển

- Previous / Next hoặc `←` / `→`: đi từng bước.
- Play / Pause hoặc `Space`: phát/dừng, tốc độ 0.5×–2×.
- Restart hoặc `R`: về đầu, giữ tốc độ đã chọn.
- Timeline: nhảy tới snapshot bất kỳ, hủy chuyển động cũ.
- Click số dòng Java: đặt/bỏ breakpoint. Play dừng tại dòng đó.
- Presentation: phóng vùng lab, ẩn navigation; `Escape` thoát.
- Theory: khái niệm, lưu trữ, ứng dụng, Big-O và các giới hạn mô hình.

Phím tắt không can thiệp khi nhập input/select, đang mở dialog hoặc dùng tổ hợp Ctrl/Alt/Meta. Pause, đổi tab, nối chuỗi, tua timeline và unmount đều hủy timer/chuyển động liên quan. Tab trình duyệt bị ẩn sẽ tự Pause. Hỗ trợ `prefers-reduced-motion`.

## Kiến trúc

```text
src/
  algorithms/             Pure generators cho 6 cấu trúc
  engine/types.ts         Discriminated scene union và DebugStep
  engine/steps.ts         Java line markers, recorder và deep freeze
  engine/session.ts       Ghép operation từ snapshot cuối, code source theo đoạn
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

Phép gán mảng copy giá trị sang ô đích: ô nguồn vẫn hiện mờ cho tới khi bị ghi đè. Resize hiển thị old/expanded riêng và chỉ đổi `elements` sau khi copy đủ. LinkedList đổi reference trước, căn chỉnh hình sau. Queue có ba bước riêng: poll → worker process → completed. Graph nạp từng cạnh vào list/matrix; DFS dùng call stack, BFS dùng FIFO và parent map. Generator Kahn cũ chỉ giữ làm tham chiếu / kiểm thử, không có trong giao diện.

## Kiểm thử

```bash
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
# JDK 21+ phải có trong PATH:
npm run test:java
```

Có thể chỉ định `JAVAC=/path/to/javac JAVA=/path/to/java npm run test:java`. Script biên dịch và chạy **68 chương trình**, gồm 28 operation cơ bản và các trường hợp dữ liệu nối tiếp, rỗng, mảng đầy, xóa BST hai con, graph có chu trình/đích không tới được, so sánh stdout với kết quả generator. Vitest hiện có **217 kiểm thử** (88 cho lab gốc, 39 cho Grid, 32 cho hai bài ma trận PDF, 58 cho hai bài cây PDF), kiểm tra shift/copy, reference ordering, LIFO/FIFO, BST, in-degree từng snapshot, topo-order tham chiếu, cycle, DFS/BFS, parent path, list/matrix, chuỗi operation, immutability và playback. Playwright hiện có **92 kiểm thử** (24 cho lab gốc, 22 cho Grid, 24 cho hai bài ma trận PDF, 22 cho hai bài cây PDF) chạy desktop + mobile, tất cả thao tác, forward/backward, autoplay cleanup, breakpoint, syntax, theme, presentation, font và reduced motion.

## Static export & Vercel trực tiếp

```bash
NEXT_PUBLIC_BASE_PATH= npm run build
E2E_STATIC=1 npm run test:e2e
```

Build sinh `out/` và phục vụ ứng dụng ở đường dẫn gốc `/`. Font, JavaScript và CSS được đóng gói trong bản export. Cấu hình `vercel.json` dùng output `out/`; không có backend hoặc server API.

Deploy trực tiếp bản static đã kiểm thử, không cần Git. Chỉ đăng nhập bằng OAuth của Vercel CLI; không đưa token vào source hoặc lệnh shell.

```bash
npx vercel@64.5.0 login
npx vercel@64.5.0 link --yes --project structure-lab-java-visualizer --scope vqv1 --cwd out
```

Trước khi upload, xóa `out/.env.local` do CLI link tạo. Tạo `out/vercel.json`:

```json
{
  "framework": null,
  "outputDirectory": ".",
  "cleanUrls": true,
  "trailingSlash": true,
  "installCommand": "",
  "buildCommand": ""
}
```

`out/.vercelignore` cần loại `.env*`, `.vercel`, `.git`, `.gitignore`, `.vercelignore`. Sau đó:

```bash
npx vercel@64.5.0 project inspect structure-lab-java-visualizer --scope vqv1 --cwd out
npx vercel@64.5.0 deploy --prod --yes --scope vqv1 --cwd out
```

Mỗi lần `next build` có thể thay thế thư mục `out/`, cần tạo lại các cấu hình upload ở trên. Source và font vẫn hỗ trợ static export dưới subpath nếu đặt `NEXT_PUBLIC_BASE_PATH=/DemoDnA` khi build.
## Bản 1.0 và thiết kế

Trang HTML gốc được giữ tại `legacy/index.html`, README cũ tại `legacy/README-v1.md`; `examples/VisualDebugDemos.java` là ví dụ lịch sử của bản 1.0. Java trong lab 2.0 được sinh từ các generator và tải bằng nút Download, tránh trộn dữ liệu giữa hai phiên bản.

Bố cục, typography, nền xanh xám, teal accent và editor nền tối dựa trên màn hình Figma. Mũi tên thuật toán là SVG động phụ thuộc snapshot. Asset mũi tên tĩnh của Figma trả HTTP 403 khi tải từ môi trường này, nên không có URL Figma tạm thời nào trong runtime.

## Grid Lab · trang riêng `/grid/`

Mở https://dnademo.eeslern.com/grid/. Liên kết **Grid Lab ↗** ở header trang gốc; hai route có bundle riêng và không prefetch lẫn nhau. Cả hai đều static export, không có API hay JVM trong browser.

- **Nền tảng buổi 2:** kiểm kê vật phẩm và tìm vật phẩm đầu tiên; duyệt hàng, cột, zigzag hoặc sao chép sang mảng 1D rồi duyệt. Đọc một ô tường trong mảng không có nghĩa nhân vật đi xuyên tường.
- **Xem trước:** robot kiểm tra khả năng tới đích bằng BFS/DFS iterative, đường ngắn nhất bằng BFS, đếm vùng đất bằng BFS/DFS. Không dùng DFS để khẳng định khoảng cách ngắn nhất. Stack Deque là bộ nhớ phụ, khác recursive Call Stack.
- Mỗi lệnh Java được dừng riêng: đọc dòng, tách token, parse số, gán biến, kiểm tra điều kiện, đọc/ghi ô, enqueue/push, dequeue/pop, truy vết, return và println. Source dùng Prism Java, tải được `Main.java` hoàn chỉnh.
- `Variables / Watch` hiển thị global/static và các local đang trong scope; Call Stack phản ánh main, nextInt, solve, flood. Sau return, bộ nhớ phụ cũ được gắn nhãn snapshot và biến local được bỏ khỏi Watch.
- Grid bản đồ đề bài và `grid[][]` trong bộ nhớ được phân biệt: trước khi đọc input, int[][] có các số 0 mặc định; ô chưa đọc hiển thị mờ. seen/dist/parent/flat và Queue/Stack có góc xem riêng. Grid là **đồ thị ngầm 4 hướng**; ma trận địa hình không phải adjacency matrix V×V.
- Popup **Chỉnh bản đồ** đặt ô trống, tường, vật phẩm, Robot S, đích G hoặc đất/nước; thay kích thước, thêm/xóa test. Áp dụng tạo lại input và replay cùng lúc.
- Popup **Input / Expected** nhận paste hoặc file .txt. Expected trống dùng oracle độc lập; nhập tay để kiểm tra MATCH/MISMATCH. Actual chỉ xuất hiện khi tới `System.out.println`, không lấy từ expected.
- Kéo thanh giữa grid/code để chỉnh chiều rộng; kéo thanh giữa code/Watch để chỉnh chiều cao. Cả hai hỗ trợ phím mũi tên khi focus. **Code rộng** đổi preset, nút phóng to code và Escape để trở về. Mobile giữ grid phía trên và chọn Bước / Code / Biến / Bộ nhớ / Output phía dưới.
- Playback có Previous/Next, Play/Pause, Restart, timeline, breakpoint, tốc độ 0.5×–8×. **Vào thuật toán** tua qua phần đọc input; **Ô kế** nhảy tới lần đọc/xử lý ô tiếp theo; **Chạy hết** nhảy thẳng snapshot cuối. Đây là thao tác tua, không phải đo tốc độ chạy Java.

### Format input Grid

Dòng đầu ghi T **một lần**. Mỗi test lần lượt có `R C`, thêm dòng `sr sc tr tc` **chỉ cho hai bài Robot**, rồi R hàng chứa C số. Tọa độ bắt đầu từ 0. Whitespace và dòng trống đều được BufferedReader + StringTokenizer xử lý.

Ví dụ kiểm kê, 2 test:

```text
2
2 3
0 2 0
2 0 0
1 2
0 2
```

Expected:

```text
2
1
```

Ví dụ Robot đường ngắn nhất, 1 test:

```text
1
3 4
0 0 2 3
0 0 1 0
1 0 0 0
0 0 1 0
```

Expected: `5`. Reach trả YES/NO; tìm vật phẩm trả `r c` hoặc `-1 -1`; islands trả số thành phần liên thông theo **4 hướng**. Với islands: 0 nước, 1 đất. Các bài còn lại: 0 trống, 1 tường, 2 vật phẩm; 2 đi qua được ở bài Robot.

Giới hạn giao diện replay: T 1–8, R 1–12, C 1–16, tổng ≤512 ô. Endpoint ngoài grid hoặc trên tường, token thiếu/dư, giá trị sai và expected sai số dòng đều bị từ chối trước khi thay phiên hiện tại. Đây là giới hạn cho mô phỏng từng lệnh, không phải giới hạn của giải thuật.

Code Java có `InputStream source = System.in`; nếu có đối số thì chỉ đổi sang `new FileInputStream(args[0])`. Chạy local: `javac Main.java && java Main input.txt`. Nộp judge: `java Main`, không truyền đối số; thuật toán và reader giữ nguyên.

### Số đo và kiểm thử Grid

Bước là **điểm dừng debug**, gồm trước/sau lời gọi method và các lần xét if/while; không phải số bytecode. Timeline đếm cả batch. Báo cáo từng test ghi bước input, solve, tới kết quả và tới print, kích thước, số ô khám phá/xử lý, push/pop và peak frontier. Số đọc hiện đếm grid/flat; số ghi đếm ghi tường minh vào grid/flat/seen/dist/parent và Arrays.fill; không gồm zero initialization tự động.

Memory là **ước tính payload dữ liệu**: int 4 B, boolean quy ước 1 B, phần tử frontier/path theo int; không phải JVM heap, không tính object header, boxing, capacity, reader, GC hay các snapshot dùng để hiển thị. Thời gian sinh replay đo bằng JavaScript (bao gồm tạo snapshot); thời gian phát chỉ tính khi Play. Không trình bày chúng như thời gian CPU Java.

```bash
npm test
npm run typecheck
npm run test:grid-java
npm run build
E2E_STATIC=1 npm run test:e2e
```

`test:grid-java` cần JDK và kiểm tra 13 chương trình với nhiều test: ma trận thường, 1×1, một hàng, một cột, không có đường / không có vật phẩm; cùng output khi đọc System.in và file. Vitest kiểm tra snapshot bất biến, thứ tự duyệt, oracle độc lập, random grid, scope, queue/stack và path BFS. Playwright kiểm tra đồng bộ code/biến/ô, popup input lỗi, map editor, expected mismatch, resize, breakpoint, cleanup playback và responsive.

Nguồn Grid: `src/grid/{types,input,source,replay}.ts`, `src/components/grid/`, `src/app/grid/`. Nội dung là phần giải thích bổ sung phục vụ giảng dạy theo bối cảnh đã cung cấp; chưa đối chiếu Syllabus(1).doc và SW(1).pdf vì hai file chưa có trong workspace.


### Điều chỉnh khi trình chiếu Grid

Header có **A− / A+** để phóng chữ nội dung và bộ nhớ (90–160%), **Kích cỡ** mở preset Gọn / Giảng dạy / Trình chiếu. Nút **Trình chiếu** bật 140%, code mặc định 21px, dành phần lớn màn hình cho grid, logic và code. Escape thoát bố cục trình chiếu.

- Trong editor, **A− / A+** chỉnh riêng chữ Java (desktop 13–30px, mobile hiển thị tối đa 22px); nút **Ngắt dòng code** hiển thị trọn câu lệnh dài khi trình chiếu. Chỉ ngắt dòng hiển thị; source tải về, số dòng Java và breakpoint giữ nguyên. Editor tự căn lại dòng đang chạy sau khi đổi font, wrap hoặc kích thước panel.
- Grid có **− / Vừa khung / +** để zoom 100–200%, cuộn bên trong khi zoom. Không zoom toàn bộ trang.
- Vùng bộ nhớ có **− / +** để đổi chiều cao; slider trong Kích cỡ chỉnh 20–45% workspace. BFS/DFS mặc định mở `seen` (visited), flatten mở `flat`. Ô vừa thay đổi có màu vàng, current có viền xanh.
- Khối Current / Logic hiển thị số điểm dừng tại ô đó, toán hạng liên quan, điều kiện, lệnh Java và giải thích. Thẻ kết quả phân biệt `count`/`dist` đang tính, result đã return nhưng chưa print, và output đã in mới được kiểm MATCH/MISMATCH.
- Expected/Actual và metrics thu thành thanh **Output / Thống kê** trên desktop, mở popup khi cần. Watch tự mở scope đang chạy; các scope còn lại có thể bung/thu gọn. Mobile dùng các tab panel.
- Lựa chọn font, wrap, zoom và tỷ lệ các panel lưu ở `grid-display-v1` trong localStorage. Đổi cách hiển thị không tạo lại replay, không thay dữ liệu hay vị trí timeline. Preset thay bố cục; reload vẫn khởi tạo bài mẫu như trước.


## Hai bài từ PDF: Tô màu ô & Origami

Trang riêng **[/problems/](https://dnademo.eeslern.com/problems/)** được tải độc lập với Grid Lab và lab cấu trúc dữ liệu. Nguồn đề gốc: `public/problems/de_bai_text.pdf`. Có 5 testcase tô màu và 2 testcase Origami có đủ input trong PDF; các dòng output mở rộng không có input không được tính là đã kiểm chứng.

| Bài | Cách giải Java | Kết quả mẫu |
| --- | --- | --- |
| Tô màu ô | Bitmask, DFS đệ quy chọn dấu, biến đổi Subset Sum | 18, 9, 22, 15, 19 |
| Origami | Gấp chồng từ phải sang trái, ánh xạ cột, gom từng ô theo lớp | 16, 31 |

Tô màu phải dùng **tất cả ô kề hợp lệ**, mỗi số một dấu ±; số âm và dấu trừ ở số đầu tiên đều hợp lệ. Không nối xuyên biên và không dùng ô chéo. DFS hiển thị từng frame đệ quy với `depth`, `sum`, `next`, không nhầm với Stack tự quản lý ở Grid Lab.

Origami chia **cột** thành M dải, K = N/M; không gấp theo hàng. Ánh xạ `block = c/K`, `local = c%K`, `dest = block chẵn ? local : K−1−local`. Mô phỏng giấy dùng Motion + CSS 3D, mặt trước/sau, trục xoay ở nếp gấp và thứ tự lớp giấy đúng sau mỗi lần lật. Các lần gấp xen kẽ lên/xuống đúng nếp bậc thang; kiểm thử kiểm tra tọa độ z của từng lớp liên tục khi chuyển từ animation sang snapshot. Previous mở ngược lần gấp, Pause/seek hủy chuyển động, reduced motion đưa về snapshot trực tiếp. Số in trên giấy luôn là số gốc; `next/result` ở bộ nhớ tạm mới chứa tổng thực sự đã tính. Hai cách tối ưu có nút xem gấp hình học riêng, được ghi rõ không thực thi Java.

- Chọn testcase để debug độc lập; Next/Previous/Play/timeline đồng bộ Java, biến cục bộ/toàn cục, Call Stack, dấu ±, ô nguồn/đích, ma trận tạm và output.
- Nhấn **Kết quả** mở Expected/Actual và chạy nhanh cả bộ; Actual không lấy từ Expected. Input popup tuân thủ T rồi kích thước và ma trận của từng test. Java `Main.java` dùng BufferedReader/StringTokenizer; `java Main` đọc System.in, `java Main input.txt` đọc file.
- Tối đa 144 ô: có thể replay toàn bộ các điểm dừng. Test lớn tự thu gọn theo ô; click ô hoặc nhập r/c để mở chi tiết một ô. Cửa sổ tô màu 12×12 theo current, mọi tọa độ còn lại có thể chọn từ thanh phân tích. Input hỗ trợ đầy đủ kích thước của đề, tối đa 100 test/100.000 ô mỗi bộ trong lab.
- Bộ đếm là **điểm thực thi được instrument**, không phải số bytecode JVM; không mở rộng helper tokenizer. Thời gian JS solve/tạo trace và ước lượng payload int được ghi rõ, không giả là benchmark hay heap Java.
- Kích cỡ/trình chiếu, font Java độc lập, ngắt dòng, kéo rộng/cao code, mobile tabs và theme được giữ; chỉnh kích thước không reset timeline.

```bash
npm run test:problems-java
# Hoặc chỉ rõ JDK:
JAVAC=/path/to/javac JAVA=/path/to/java npm run test:problems-java
E2E_STATIC=1 npm run test:e2e -- problems.spec.ts
```

Script Java biên dịch **6 chương trình hoàn chỉnh**, kiểm tra toàn bộ testcase có input trong PDF, trường hợp âm/0, biên, N=1, M=1/M=N, nhiều ước số và kích thước tối đa; so khớp stdout từ System.in và file với oracle độc lập và simulator. Các snapshot chia sẻ các hàng bất biến để giảm sao chép; không giữ timer khi unmount.


### Theo dõi xuyên các lớp giấy

Origami hiển thị đồng thời **Giấy ban đầu** và **Giấy đang gấp**. Mỗi dải giữ nguyên màu ở cả hai mặt; màu nền của mặt giấy phía trước dùng alpha để nhìn vào lớp trong. Không đặt opacity lên phần tử cha 3D, nên chuyển động và thứ tự lớp không bị flatten.

Khung sáng di chuyển theo snapshot Java ở cả hai góc nhìn. Xanh biểu thị số gốc đang đọc; tím biểu thị các ô nguồn đã góp vào một tổng đang đọc từ `current` hoặc `result`; cam biểu thị ghi `next`. Tọa độ và giá trị từng lớp được liệt kê dưới hình. Ví dụ ở lần gấp thứ hai của test #1, `current[0][1] = 6` truy ngược đúng hai ô gốc `a[0][3] = 2` và `a[0][4] = 4`, dù chúng bị mặt trước che. Đây là nguồn gốc dữ liệu của **một lần đọc tổng**, không phải thêm nhiều lần đọc Java.

Cách ánh xạ/gom lớp có hình đích đã gấp sẵn khi vào solve; nút xem từng nếp gấp vẫn là phần hình học riêng. Previous/timeline/restart giữ hai khung đồng bộ; reduced motion tắt dịch chuyển cursor. Các kiểm thử đối chiếu từng phép đọc/ghi và kiểm tra đủ tờ giấy mẫu trong chế độ trình chiếu.

## Bài 9–10: Cây có gốc

Trang Problems có thêm **[Bài 9 · Đếm số nút lá](https://dnademo.eeslern.com/problems/#bai-9)** và **[Bài 10 · Tìm độ sâu](https://dnademo.eeslern.com/problems/#bai-10)**. Tổng cộng 4 bài và 14 cách giải Java. Module cây chỉ tải khi mở bài cây. PDF gốc được giữ tại `public/problems/bai-9-10.pdf`; trang 1–2 là Bài 9, trang 3–4 là Bài 10. PDF cung cấp đề, giải thích và khung nhập dữ liệu; các lời giải và mô phỏng dưới đây là phần bổ sung.

| Bài | Cách giải | Thời gian | Output mẫu nguyên văn |
| --- | --- | --- | --- |
| Đếm nút lá | Đếm out-degree; HashSet các nút cha; BFS Queue; DFS Stack | O(N), HashSet kỳ vọng | `#1: 3`, `#2: 1`, `#3: 1` |
| Độ sâu | Lần theo parent; BFS tính depth; DFS tính depth; parent + memoization | O(N+QH) cho cách lần cha, O(N+Q) cho ba cách còn lại | `#1: 0 2 1`, `#2: 3 1` |

- Đây là **cây tổng quát có gốc 1**, cạnh input `u v` nghĩa là cha → con. Không phải BST/TreeMap; ID cha không nhất thiết nhỏ hơn con, cạnh không nhất thiết nhập theo tầng. Leaf là nút không có con: N=1 có một leaf; root có một con không phải leaf. Độ sâu đếm cạnh, `depth[1]=0`.
- Input Bài 9: T, rồi mỗi test N và N−1 cặp u v. Bài 10: T, rồi mỗi test N Q, N−1 cặp u v và Q truy vấn x. Giữ **dấu hai chấm** trong output `#1: ...`. Paste hoặc đọc file .txt; Expected trống dùng oracle độc lập, Expected nhập tay được giữ nguyên để phát hiện MISMATCH.
- Hình cây cho thấy cạnh được đọc vào Edge List, rồi chuyển thành `degree[]`, `parent[]`, Set hoặc `List<List<Integer>>`. Xanh current, tím đang chờ, xanh lá leaf/xong, cam con hoặc query. Queue/Stack hiển thị đúng FRONT/TOP và chuyển động khi thêm/lấy nút. Bộ nhớ, Watch, Call Stack, logic và Java đều dùng một snapshot.
- Bảng query phân biệt số 0 mặc định chưa được gán với đáp án 0 đã tính cho root, và phân biệt tính xong với `println`. Có thể nhảy tới một ID hoặc một truy vấn, tua lại, đặt breakpoint; đổi cách giải vẫn giữ input đang dùng.
- Theo giới hạn đề: T≤10, N/Q≤10.000. Với N,Q≤80 có thể replay từng lệnh; lớn hơn dùng checkpoint và cửa sổ tối đa 48 node, preview bộ nhớ/Queue/Stack. Chọn node/query để giữ chi tiết vùng cần xem. Bộ đếm xử lý và tất cả đáp án vẫn tính đầy đủ; các điểm thu gọn có chú thích. DFS dùng Stack iterative, memoization dùng Stack đường đi, không tràn Call Stack ở cây sâu.
- Giữ preset trình chiếu, font Java riêng, ngắt dòng, kéo chiều rộng/cao code, mobile tabs, theme và keyboard. Sơ đồ nhỏ tự vừa khung, sơ đồ lớn/zoom dùng cuộn nội bộ.

```bash
npm run test:tree-problems-java
# Hoặc với JDK ở đường dẫn riêng:
JAVAC=/path/to/javac JAVA=/path/to/java npm run test:tree-problems-java
E2E_STATIC=1 npm run test:e2e -- tree-problems.spec.ts
```

8 chương trình `Main.java` hoàn chỉnh được biên dịch và đối chiếu cả stdin/file, toàn bộ 5 testcase PDF, N=1, query lặp/root, cạnh và ID đảo thứ tự, cây dây/xòe 10.000 node. 58 unit test bổ sung kiểm tra oracle ngẫu nhiên, scope, FIFO/LIFO, ánh xạ dòng Java, snapshot bất biến, memoization và cửa sổ cây lớn. Thời gian hiển thị là thời gian JavaScript solve/tạo replay; memory là ước lượng payload, không phải benchmark hay heap JVM. Nguồn: `src/problems/tree/`, `src/components/problems/tree/`.
