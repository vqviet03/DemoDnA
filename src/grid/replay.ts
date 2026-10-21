import { freeze } from "@/engine/steps";
import { gridJava } from "./source";
import { parseGridInput, referenceAnswer } from "./input";
import {
  PROBLEMS,
  type GridAlgorithm,
  type GridProblem,
  type GridStep,
  type GridRun,
  type GridMemory,
  type Counters,
  type CellStatus,
  type Scope,
  type WatchValue,
  type WatchData,
  type Point,
  type CaseReport,
  type Matrix,
} from "./types";
const DR = [-1, 0, 1, 0],
  DC = [0, 1, 0, -1];
const matrix = <T>(rows: number, cols: number, value: T): Matrix<T> =>
  Array.from({ length: rows }, () => Array<T>(cols).fill(value));
function write<T>(
  values: Matrix<T>,
  r: number,
  c: number,
  value: T,
): Matrix<T> {
  return values.map((row, index) =>
    index === r ? row.map((old, col) => (col === c ? value : old)) : row,
  );
}
const emptyMemory = (): GridMemory => ({
  grid: [],
  loaded: [],
  seen: [],
  dist: [],
  parent: [],
  flat: [],
  frontier: [],
  path: [],
  seenAllocated: false,
  distAllocated: false,
  flatAllocated: false,
  frontierAllocated: false,
  privateActive: false,
});
const counters = (): Counters => ({
  inputReads: 0,
  cellReads: 0,
  writes: 0,
  checks: 0,
  discovered: 0,
  processed: 0,
  pushed: 0,
  popped: 0,
  peakFrontier: 0,
  peakBytes: 0,
});
export function generateGridRun(
  input: string,
  problem: GridProblem,
  algorithm: GridAlgorithm,
  expectedOverride: readonly string[] | null = null,
  fileName?: string,
): GridRun {
  const started = performance.now(),
    cases = parseGridInput(input, problem),
    code = gridJava(problem, algorithm);
  if (expectedOverride && expectedOverride.length !== cases.length)
    throw new Error("Số dòng expected không khớp T.");
  const steps: GridStep[] = [],
    caseGenerateMs: number[] = [];
  const scopes: Record<string, Record<string, WatchValue>> = {
    static: {},
  };
  let callStack = ["<clinit>()"],
    memory = emptyMemory(),
    status: CellStatus[] = [],
    current: Point | null = null,
    neighbor: Point | null = null;
  let phase: GridStep["phase"] = "input",
    caseIndex = -1,
    counts = { ...counters() },
    outputs: string[] = [],
    reports: CaseReport[] = [],
    caseStart = 0,
    inputSteps = 0,
    resultAt = 0;
  let lineIndex = 0,
    lineTokens: string[] | null = null,
    tokenIndex = 0,
    bufferLine = 0,
    consumed = 0,
    gridAllocated = false;
  const lines = input.split(/\r\n|\r|\n/),
    totalTokens = input.match(/[^ \t\r\n\f]+/g)?.length ?? 0;
  const set = (scope: string, name: string, type: string, value: WatchData) => {
    scopes[scope] ??= {};
    scopes[scope][name] = { type, value };
  };
  const drop = (scope: string, ...names: string[]) => {
    for (const name of names) delete scopes[scope][name];
  };
  const get = (scope: string, name: string) =>
    Number(scopes[scope][name]?.value);
  const mem = (props: Partial<GridMemory>) => {
    memory = { ...memory, ...props };
  };
  const point = (r: number, c: number) => {
    const test = cases[caseIndex];
    current =
      test && r >= 0 && r < test.rows && c >= 0 && c < test.cols
        ? { r, c }
        : null;
  };
  const cellStatus = (id: number, value: CellStatus) => {
    status = status.map((old, index) => (index === id ? value : old));
  };
  const payload = () => {
    const test = cases[caseIndex],
      n = test ? test.rows * test.cols : 0;
    let bytes =
      (scopes.static.DR ? 16 : 0) +
      (scopes.static.DC ? 16 : 0) +
      (gridAllocated ? 4 * n : 0);
    if (memory.privateActive)
      bytes +=
        (memory.seenAllocated ? n : 0) +
        (memory.distAllocated
          ? 4 * (memory.dist.length + memory.parent.length) * (test?.cols ?? 0)
          : 0) +
        (memory.flatAllocated ? 4 * n : 0) +
        (memory.frontierAllocated ? 4 * memory.frontier.length : 0) +
        4 * memory.path.length;
    return bytes;
  };
  const add = (
    marker: string,
    title: string,
    explanation: string,
    condition: string | null = null,
  ) => {
    const line = code.markers[marker];
    if (!line) throw new Error(`Thiếu Java marker ${marker}`);
    if (/Check$|^if/.test(marker)) counts.checks++;
    const bytes = payload();
    counts.peakBytes = Math.max(counts.peakBytes, bytes);
    counts.peakFrontier = Math.max(counts.peakFrontier, memory.frontier.length);
    if (caseIndex >= 0 && phase === "input") inputSteps++;
    const snapshotScopes: Record<string, Scope> = Object.fromEntries(
      Object.entries(scopes).map(([key, values]) => [key, { ...values }]),
    );
    steps.push(
      freeze({
        id: `grid-${steps.length}`,
        marker,
        activeLines: [line],
        title,
        explanation,
        caseIndex,
        phase,
        scopes: snapshotScopes,
        callStack: [...callStack],
        memory,
        status,
        current,
        neighbor,
        counts: { ...counts },
        payloadBytes: bytes,
        outputs,
        reports,
        inputCursor: {
          line: lineIndex,
          token: tokenIndex,
          consumed,
          total: totalTokens,
        },
        condition,
      }),
    );
  };
  const frame = (name: string, params: Record<string, WatchValue> = {}) => {
    scopes[name] = { ...params };
    callStack = [`${name}(...)`, ...callStack];
  };
  const leave = (name: string) => {
    delete scopes[name];
    callStack = callStack.slice(1);
  };
  const updateBuffer = () => {
    set("static", "reader", "BufferedReader", "reader@input");
    set(
      "static",
      "tokens",
      "StringTokenizer",
      lineTokens === null ? null : `tokens@line${bufferLine}`,
    );
    if (lineTokens)
      set(
        "watch",
        "tokens.countTokens()",
        "int",
        lineTokens.length - tokenIndex,
      );
  };
  const nextInt = (target: string): number => {
    frame("nextInt");
    while (true) {
      const refill = lineTokens === null || tokenIndex >= lineTokens.length;
      add(
        "tokenCheck",
        "Kiểm tra buffer token",
        refill
          ? `Buffer hết token. nextInt() phải đọc dòng mới để lấy ${target}.`
          : `Còn ${(lineTokens?.length ?? 0) - tokenIndex} token; không cần đọc thêm dòng.`,
        `tokens rỗng = ${refill}`,
      );
      if (!refill) break;
      const line = lines[lineIndex++];
      set("nextInt", "line", "String", line);
      updateBuffer();
      add(
        "readLine",
        `Đọc dòng ${lineIndex}`,
        `reader.readLine() trả «${line}». Đây là buffer dòng văn bản, chưa phải dữ liệu số.`,
      );
      add(
        "eofCheck",
        "Kiểm tra EOF",
        "Dòng tồn tại; không ném EOFException.",
        "line == null → false",
      );
      lineTokens = line.split(/[ \t\f]+/).filter(Boolean);
      tokenIndex = 0;
      bufferLine = lineIndex;
      updateBuffer();
      add(
        "tokenize",
        "Tách dòng thành token",
        `StringTokenizer tạo ${lineTokens.length} token. Dòng trống sẽ làm vòng while đọc tiếp dòng sau.`,
      );
      drop("nextInt", "line");
    }
    const token = lineTokens![tokenIndex++];
    consumed++;
    set("nextInt", "token", "String", token);
    updateBuffer();
    add(
      "nextToken",
      `Lấy token «${token}»`,
      `tokens.nextToken() lấy đúng một token cho ${target}; buffer còn ${lineTokens!.length - tokenIndex} token.`,
    );
    const value = Number(token);
    set("nextInt", "value", "int", value);
    add(
      "parseInt",
      `Chuyển «${token}» thành int ${value}`,
      "Integer.parseInt chỉ chuyển kiểu. Chưa ghi vào biến của hàm gọi.",
    );
    add(
      "returnInt",
      `nextInt() trả ${value}`,
      `Trả int ${value} về vị trí gọi để gán vào ${target}. Frame nextInt kết thúc.`,
    );
    leave("nextInt");
    counts.inputReads++;
    return value;
  };
  const readMain = (name: string, marker: string, description: string) => {
    const value = nextInt(name);
    set("main", name, "int", value);
    add(marker, `${name} = ${value}`, description);
    return value;
  };
  const finishReturn = (marker: string, title: string, explanation: string) => {
    resultAt = steps.length - caseStart + 1;
    add(marker, title, explanation);
  };
  set("static", "reader", "BufferedReader", null);
  add(
    "readerInitial",
    "Khởi tạo reader",
    "Biến static reader được khởi tạo null; chưa có nguồn input.",
  );
  set("static", "tokens", "StringTokenizer", null);
  add(
    "tokensInitial",
    "Khởi tạo token buffer",
    "StringTokenizer chưa được tạo. nextInt() sẽ đọc dòng đầu khi cần.",
  );
  if (algorithm === "bfs" || algorithm === "dfs") {
    set("static", "DR", "int[]", DR);
    add(
      "dr",
      "4 hướng · độ lệch hàng",
      "DR = [-1, 0, 1, 0] tương ứng lên, phải, xuống, trái.",
    );
    set("static", "DC", "int[]", DC);
    add(
      "dc",
      "4 hướng · độ lệch cột",
      "DC = [0, 1, 0, -1]. Cặp DR[d], DC[d] tạo đúng một ô kề.",
    );
  }
  callStack = ["main(String[] args)"];
  set("main", "args", "String[]", fileName ? [fileName] : []);
  set("main", "source", "InputStream", "System.in");
  add(
    "source",
    "Nguồn input mặc định: System.in",
    "Văn bản paste được mô phỏng như dữ liệu gửi vào standard input; thuật toán không phụ thuộc nguồn đọc.",
  );
  add(
    "fileCheck",
    "Chọn file hoặc standard input",
    fileName
      ? `Có đối số ${fileName}; Java local dùng FileInputStream.`
      : "Không có đối số: khi nộp online judge, giữ System.in.",
    `args.length > 0 → ${Boolean(fileName)}`,
  );
  if (fileName) {
    set("main", "source", "InputStream", `FileInputStream(${fileName})`);
    add(
      "fileOpen",
      "Mở file input",
      "Chỉ đổi InputStream. Buffer và toàn bộ solve() phía sau giữ nguyên.",
    );
  }
  set("static", "reader", "BufferedReader", "reader@input");
  add(
    "openReader",
    "Bọc nguồn đọc bằng BufferedReader",
    "InputStreamReader giải mã UTF-8, BufferedReader đọc dòng, StringTokenizer tách số. Đây là step replay, không chạy JVM trong browser.",
  );
  const tests = readMain(
    "tests",
    "readTests",
    "Dòng đầu là T; chỉ đọc số lượng test case một lần cho toàn bộ input.",
  );
  set("main", "tc", "int", 0);
  add(
    "caseInit",
    "Bắt đầu test case 1",
    "tc là chỉ số test từ 0; tên hiển thị cho người học bắt đầu từ 1.",
  );
  for (let ti = 0; ti < tests; ti++) {
    const caseTime = performance.now();
    caseIndex = ti;
    caseStart = steps.length;
    inputSteps = 0;
    resultAt = 0;
    counts = { ...counters() };
    memory = emptyMemory();
    gridAllocated = false;
    status = Array(cases[ti].rows * cases[ti].cols).fill("unseen");
    current = null;
    neighbor = null;
    phase = "input";
    scopes.main = {
      args: scopes.main.args,
      source: scopes.main.source,
      tests: scopes.main.tests,
      tc: { type: "int", value: ti },
    };
    add(
      "caseCheck",
      `Test ${ti + 1}/${tests}`,
      "Mỗi test đọc lại header riêng, không đọc lại T. Các mảng của test trước không được dùng cho test mới.",
      `${ti} < ${tests} → true`,
    );
    const rows = readMain("rows", "readRows", "Đọc số hàng R."),
      cols = readMain("cols", "readCols", "Đọc số cột C.");
    if (PROBLEMS[problem].hasPoints) {
      readMain("sr", "readSr", "Đọc hàng bắt đầu (0-based).");
      readMain("sc", "readSc", "Đọc cột bắt đầu (0-based).");
      readMain("tr", "readTr", "Đọc hàng đích (0-based).");
      readMain(
        "tcGoal",
        "readTc",
        "Đọc cột đích (0-based); tcGoal khác biến đếm test tc.",
      );
    }
    mem({ grid: matrix(rows, cols, 0), loaded: matrix(rows, cols, false) });
    gridAllocated = true;
    set("main", "grid", "int[][]", `grid@test${ti + 1}`);
    add(
      "gridAlloc",
      `Cấp phát int[${rows}][${cols}]`,
      "Các ô int mặc định bằng 0. Ma trận bộ nhớ hiển thị 0 mờ ở ô chưa đọc; bản đồ đề bài là dữ liệu tham chiếu riêng.",
    );
    set("main", "r", "int", 0);
    add("inputRInit", "r = 0", "Bắt đầu đọc hàng đầu tiên.");
    for (let r = 0; r < rows; r++) {
      set("main", "r", "int", r);
      add(
        "inputRCheck",
        `Đọc hàng ${r}`,
        `${r} < ${rows}: vẫn còn hàng cần đọc.`,
        `${r} < ${rows} → true`,
      );
      set("main", "c", "int", 0);
      add("inputCInit", "c = 0", "Mỗi hàng bắt đầu ở cột 0.");
      for (let c = 0; c < cols; c++) {
        set("main", "c", "int", c);
        point(r, c);
        add(
          "inputCCheck",
          `Đọc ô [${r}][${c}]`,
          "Kiểm tra cột trước khi gọi nextInt().",
          `${c} < ${cols} → true`,
        );
        const value = nextInt(`grid[${r}][${c}]`);
        mem({
          grid: write(memory.grid, r, c, value),
          loaded: write(memory.loaded, r, c, true),
        });
        counts.writes++;
        add(
          "readCell",
          `grid[${r}][${c}] = ${value}`,
          "Giá trị vừa parse được ghi vào đúng ô. Màu input đánh dấu ô đã lưu; chưa bắt đầu duyệt thuật toán.",
        );
        set("main", "c", "int", c + 1);
        point(r, c + 1);
        add(
          "inputCNext",
          `c → ${c + 1}`,
          "Sang cột kế tiếp, không đọc số nếu điều kiện vòng lặp sắp tới sai.",
        );
      }
      current = null;
      add(
        "inputCCheck",
        "Đã hết cột của hàng",
        "Thoát vòng while c < cols.",
        `${cols} < ${cols} → false`,
      );
      set("main", "r", "int", r + 1);
      add("inputRNext", `r → ${r + 1}`, "Sang hàng tiếp theo.");
      drop("main", "c");
    }
    add(
      "inputRCheck",
      "Đã nạp xong ma trận",
      "Toàn bộ grid[][] đã khớp input. Chuẩn bị truyền reference vào solve().",
      `${rows} < ${rows} → false`,
    );
    const solveStart = steps.length;
    phase = algorithm === "bfs" || algorithm === "dfs" ? "expand" : "scan";
    current = null;
    add(
      "solveCall",
      "Gọi solve(grid, ...)",
      "Truyền cùng reference grid vào hàm; không sao chép toàn bộ ma trận. Bước này đi vào method, dòng này sẽ được dừng lại lần nữa khi method trả kết quả.",
    );
    frame("solve", {
      grid: { type: "int[][]", value: `grid@test${ti + 1}` },
      rows: { type: "int", value: rows },
      cols: { type: "int", value: cols },
    });
    mem({ privateActive: true });
    const test = cases[ti];
    if (PROBLEMS[problem].hasPoints)
      for (const [name, value] of Object.entries({
        sr: test.start.r,
        sc: test.start.c,
        tr: test.goal.r,
        tc: test.goal.c,
      }))
        set("solve", name, "int", value);
    const close = (id: number) => {
      if (status[id] !== "done" && status[id] !== "path") {
        cellStatus(id, "done");
        counts.processed++;
      }
    };
    const walk = (sr: number, sc: number, island: boolean): string => {
      const scope = island ? "flood" : "solve";
      if (island)
        frame("flood", {
          grid: { type: "int[][]", value: `grid@test${ti + 1}` },
          seen: { type: "boolean[][]", value: "seen@solve" },
          rows: { type: "int", value: rows },
          cols: { type: "int", value: cols },
          sr: { type: "int", value: sr },
          sc: { type: "int", value: sc },
        });
      phase = "expand";
      if (!island) {
        mem({ seen: matrix(rows, cols, false), seenAllocated: true });
        set(scope, "seen", "boolean[][]", "seen@solve");
        add(
          "seenAlloc",
          "Cấp phát seen[][]",
          "Mọi ô ban đầu false. seen ghi nhận ô đã được khám phá; không đợi đến lúc lấy khỏi frontier mới đánh dấu.",
        );
        mem({ dist: matrix(rows, cols, 0), distAllocated: true });
        set(scope, "dist", "int[][]", "dist@solve");
        add(
          "distAlloc",
          "Cấp phát dist[][]",
          "Java khởi tạo số nguyên bằng 0; bước Arrays.fill sau đây đổi sang -1 để biểu diễn chưa biết khoảng cách.",
        );
        mem({ parent: matrix(rows, cols, 0) });
        set(scope, "parent", "int[][]", "parent@solve");
        add(
          "parentAlloc",
          "Cấp phát parent[][]",
          "Lưu ID ô cha để truy vết. parent cũng cần khởi tạo -1.",
        );
        set(scope, "initRow", "int", 0);
        add(
          "initRow",
          "initRow = 0",
          "Khởi tạo từng hàng của hai ma trận phụ.",
        );
        for (let rr = 0; rr < rows; rr++) {
          add(
            "initCheck",
            `Khởi tạo hàng ${rr}`,
            "Còn hàng chưa khởi tạo.",
            `${rr} < ${rows} → true`,
          );
          mem({
            dist: memory.dist.map((row, i) =>
              i === rr ? row.map(() => -1) : row,
            ),
          });
          counts.writes += cols;
          add(
            "fillDist",
            `dist[${rr}] = -1`,
            "Arrays.fill là một lời gọi Java, đặt toàn bộ hàng thành -1; số lần ghi tăng C, không phải một lần ghi.",
          );
          mem({
            parent: memory.parent.map((row, i) =>
              i === rr ? row.map(() => -1) : row,
            ),
          });
          counts.writes += cols;
          add(
            "fillParent",
            `parent[${rr}] = -1`,
            "-1 kết thúc chuỗi parent của ô bắt đầu.",
          );
          set(scope, "initRow", "int", rr + 1);
          add(
            "initNext",
            `initRow → ${rr + 1}`,
            "Tiếp tục khởi tạo hàng tiếp theo.",
          );
        }
        add(
          "initCheck",
          "Đã khởi tạo hai ma trận phụ",
          "Tất cả dist và parent đều bằng -1.",
          `${rows} < ${rows} → false`,
        );
      }
      mem({ frontier: [], frontierAllocated: true });
      set(scope, "frontier", "Deque<Integer>", "frontier@heap");
      add(
        "frontierAlloc",
        algorithm === "bfs" ? "Tạo Queue FIFO" : "Tạo Stack LIFO",
        algorithm === "bfs"
          ? "ArrayDeque dùng addLast/removeFirst. Phần tử vào trước được xử lý trước."
          : "ArrayDeque dùng push/pop cùng một đầu. Stack này giữ node chờ xử lý, không phải call stack đệ quy.",
      );
      mem({ seen: write(memory.seen, sr, sc, true) });
      counts.writes++;
      counts.discovered++;
      cellStatus(sr * cols + sc, "queued");
      point(sr, sc);
      add(
        "seedSeen",
        `seen[${sr}][${sc}] = true`,
        "Đánh dấu trước khi đưa vào frontier, nên không có ô nào bị thêm hai lần trong cùng lượt duyệt.",
      );
      if (!island) {
        mem({ dist: write(memory.dist, sr, sc, 0) });
        counts.writes++;
        add("seedDist", "Khoảng cách từ S tới S là 0", "dist[sr][sc] = 0.");
      }
      const seed = sr * cols + sc;
      set(scope, "seed", "int", seed);
      add(
        "seedId",
        `Mã hóa [${sr}][${sc}] → ${seed}`,
        `id = r * cols + c = ${sr} * ${cols} + ${sc}. Một int đủ để lưu tọa độ của ô trong Deque.`,
      );
      mem({ frontier: [seed] });
      counts.pushed++;
      add(
        "seedPush",
        `Đưa ${seed} vào frontier`,
        algorithm === "bfs"
          ? "Đưa vào cuối queue. FRONT nằm ở bên trái."
          : "Đưa lên TOP. Phần tử ở đầu stack sẽ pop trước.",
      );
      while (memory.frontier.length) {
        add(
          "frontierCheck",
          "Frontier còn phần tử",
          "Tiếp tục lấy một ô ra xử lý.",
          "!frontier.isEmpty() → true",
        );
        const id = memory.frontier[0];
        mem({ frontier: memory.frontier.slice(1) });
        counts.popped++;
        set(scope, "id", "int", id);
        current = null;
        neighbor = null;
        add(
          "pop",
          `${algorithm === "bfs" ? "Dequeue" : "Pop"} ID ${id}`,
          "Con trỏ debug chuyển đến phần tử vừa lấy; đây không phải một bước đi vật lý của robot từ ô xử lý trước đó.",
        );
        const r = Math.floor(id / cols),
          c = id % cols;
        set(scope, "r", "int", r);
        add("currentR", `r = ${id} / ${cols} = ${r}`, "Chia nguyên lấy hàng.");
        set(scope, "c", "int", c);
        point(r, c);
        add(
          "currentC",
          `c = ${id} % ${cols} = ${c}`,
          "Lấy phần dư để lấy cột. Ô xanh hiện là node đang được xử lý.",
        );
        if (!island) {
          const target = r === test.goal.r && c === test.goal.c;
          set(scope, "atTarget", "boolean", target);
          add(
            "atTarget",
            "So sánh node hiện tại với G",
            `r == tr: ${r} == ${test.goal.r}; c == tc: ${c} == ${test.goal.c}. Kết quả ${target}.`,
          );
          add(
            "ifTarget",
            target ? "Đã tới G" : "Chưa phải đích",
            target
              ? "Bắt đầu truy vết parent trước khi trả kết quả."
              : "Cần xét 4 ô kề của node hiện tại.",
            `atTarget → ${target}`,
          );
          if (target) {
            phase = "trace";
            mem({ path: [] });
            set(scope, "path", "List<Integer>", "path@heap");
            add(
              "pathAlloc",
              "Tạo danh sách đường đi",
              "Ban đầu rỗng. Chuỗi parent đi từ G ngược về S.",
            );
            let node = id;
            set(scope, "node", "int", node);
            add(
              "traceInit",
              `Truy vết từ ID ${node}`,
              "Giữ r,c của ô đích để trả dist[r][c] sau khi truy vết xong.",
            );
            while (node !== -1) {
              point(Math.floor(node / cols), node % cols);
              add(
                "traceCheck",
                `node = ${node}, tiếp tục`,
                "-1 là sentinel kết thúc parent chain.",
                "node != -1 → true",
              );
              mem({ path: [...memory.path, node] });
              cellStatus(node, "path");
              add(
                "pathAdd",
                `Thêm ID ${node} vào path`,
                "Path hiện theo chiều G → S. Mỗi cạnh trong path là một ô kề hợp lệ.",
              );
              const pr = Math.floor(node / cols),
                pc = node % cols;
              set(scope, "pr", "int", pr);
              add("traceR", `pr = ${pr}`, "Giải mã hàng để đọc parent.");
              set(scope, "pc", "int", pc);
              add("traceC", `pc = ${pc}`, "Giải mã cột để đọc parent.");
              node = memory.parent[pr][pc];
              set(scope, "node", "int", node);
              add(
                "traceParent",
                `node → parent[${pr}][${pc}] = ${node}`,
                "Lần ngược reference cha; không thay đổi grid hay đi xuyên qua tường.",
              );
              drop(scope, "pr", "pc");
            }
            current = null;
            add(
              "traceCheck",
              "Đã về trước S",
              "Parent của S bằng -1; vòng truy vết kết thúc.",
              "node != -1 → false",
            );
            mem({ path: [...memory.path].reverse() });
            point(r, c);
            add(
              "pathReverse",
              "Đảo path thành S → G",
              algorithm === "bfs"
                ? "BFS giữ khoảng cách ngắn nhất theo số cạnh, vì mọi cạnh có cùng chi phí 1."
                : "Đây là đường DFS tìm được đầu tiên; không cam kết ngắn nhất.",
            );
            close(id);
            const answer =
              problem === "reach" ? "YES" : String(memory.dist[r][c]);
            finishReturn(
              "pathReturn",
              `Trả về ${answer}`,
              "Đã có kết quả cho test này. Main sẽ nhận chuỗi rồi System.out.println ở bước riêng.",
            );
            return answer;
          }
        }
        set(scope, "direction", "int", 0);
        add(
          "directionInit",
          "direction = 0",
          "Bắt đầu theo thứ tự lên → phải → xuống → trái.",
        );
        for (let d = 0; d < 4; d++) {
          add(
            "directionCheck",
            `Hướng ${d}/3`,
            "Kiểm tra còn hướng cần xét.",
            `${d} < 4 → true`,
          );
          const nr = r + DR[d],
            nc = c + DC[d];
          set(scope, "nr", "int", nr);
          neighbor = null;
          add(
            "neighborR",
            `nr = ${r} + (${DR[d]}) = ${nr}`,
            "Tính hàng của ô kề, chưa truy cập mảng.",
          );
          set(scope, "nc", "int", nc);
          neighbor = { r: nr, c: nc };
          add(
            "neighborC",
            `nc = ${c} + (${DC[d]}) = ${nc}`,
            "Tính cột của ô kề. Mũi tên/viền cam chỉ ứng viên này.",
          );
          const inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols;
          set(scope, "inside", "boolean", inside);
          add(
            "bounds",
            "Kiểm tra biên trước khi đọc grid",
            `nr >= 0: ${nr >= 0}; nr < R: ${nr < rows}; nc >= 0: ${nc >= 0}; nc < C: ${nc < cols}. Không truy cập grid nếu có điều kiện sai.`,
          );
          add(
            "ifInside",
            inside ? "Ô kề nằm trong grid" : "Bỏ ô ngoài biên",
            inside
              ? "Bây giờ mới an toàn để đọc grid[nr][nc]."
              : "Không thực hiện bất kỳ truy cập mảng nào cho tọa độ ngoài biên.",
            `inside → ${inside}`,
          );
          if (inside) {
            const terrain = memory.grid[nr][nc];
            set(scope, "terrain", "int", terrain);
            counts.cellReads++;
            add(
              "terrain",
              `grid[${nr}][${nc}] = ${terrain}`,
              island
                ? "1 là đất; 0 là nước."
                : "1 là tường; các giá trị khác có thể đi qua.",
            );
            const passable = island ? terrain === 1 : terrain !== 1;
            set(scope, "passable", "boolean", passable);
            add(
              "passable",
              `passable = ${passable}`,
              island
                ? "Đếm vùng chỉ nối qua ô đất."
                : "Kiểm tra chướng ngại vật trước khi đọc seen.",
            );
            add(
              "ifPassable",
              passable ? "Có thể xét ô này" : "Bỏ nước/tường",
              passable
                ? "Tiếp tục kiểm tra ô đã được khám phá chưa."
                : "Không đánh dấu seen, không đưa vào frontier.",
              `passable → ${passable}`,
            );
            if (passable) {
              const known = memory.seen[nr][nc];
              set(scope, "known", "boolean", known);
              add(
                "known",
                `seen[${nr}][${nc}] = ${known}`,
                "seen được ghi khi enqueue/push, không phải khi pop. Đây là lý do tránh lặp.",
              );
              add(
                "ifNew",
                known ? "Đã khám phá: bỏ qua" : "Khám phá node mới",
                known
                  ? "Không ghi đè parent và không enqueue lại."
                  : "Đánh dấu, lưu thông tin đường đi rồi đưa vào frontier theo đúng thứ tự lệnh.",
                `!known → ${!known}`,
              );
              if (!known) {
                mem({ seen: write(memory.seen, nr, nc, true) });
                counts.discovered++;
                counts.writes++;
                cellStatus(nr * cols + nc, "queued");
                add(
                  "markSeen",
                  `seen[${nr}][${nc}] = true`,
                  "Ô chuyển sang trạng thái đã phát hiện/chờ xử lý; chưa pop nên chưa hoàn tất.",
                );
                if (!island) {
                  mem({
                    dist: write(memory.dist, nr, nc, memory.dist[r][c] + 1),
                  });
                  counts.writes++;
                  add(
                    "setDist",
                    `dist[${nr}][${nc}] = ${memory.dist[nr][nc]}`,
                    algorithm === "bfs"
                      ? "FIFO bảo đảm lần khám phá đầu tiên có ít cạnh nhất từ S."
                      : "Đây là độ sâu của đường DFS khám phá đầu tiên, không phải khoảng cách ngắn nhất.",
                  );
                  mem({ parent: write(memory.parent, nr, nc, id) });
                  counts.writes++;
                  add(
                    "setParent",
                    `parent[${nr}][${nc}] = ${id}`,
                    `Ghi cha [${r}][${c}] để truy vết sau này; chỉ ghi ở lần khám phá đầu.`,
                  );
                }
                const nextId = nr * cols + nc;
                set(scope, "nextId", "int", nextId);
                add(
                  "nextId",
                  `Mã hóa ô kề → ID ${nextId}`,
                  `${nr} * ${cols} + ${nc} = ${nextId}.`,
                );
                mem({
                  frontier:
                    algorithm === "bfs"
                      ? [...memory.frontier, nextId]
                      : [nextId, ...memory.frontier],
                });
                counts.pushed++;
                add(
                  "push",
                  `Đưa ID ${nextId} vào ${algorithm === "bfs" ? "REAR" : "TOP"}`,
                  algorithm === "bfs"
                    ? "Thêm cuối queue. Các node cũ giữ thứ tự."
                    : "Push đầu stack. Vì push theo lên/phải/xuống/trái, hướng được thêm cuối sẽ được pop trước.",
                );
              }
            }
          }
          drop(scope, "terrain", "passable", "known", "nextId");
          set(scope, "direction", "int", d + 1);
          add(
            "directionNext",
            `direction → ${d + 1}`,
            "Sang hướng tiếp theo; các biến khai báo trong thân while sẽ hết scope sau bước này.",
          );
          drop(
            scope,
            "nr",
            "nc",
            "inside",
            "terrain",
            "passable",
            "known",
            "nextId",
          );
          neighbor = null;
        }
        add(
          "directionCheck",
          "Đã xét đủ 4 hướng",
          "Node hiện tại hoàn tất xử lý láng giềng. Không còn cần quay lại node này trong lượt duyệt.",
          "4 < 4 → false",
        );
        close(id);
        drop(scope, "id", "r", "c", "atTarget", "direction");
        current = null;
      }
      add(
        "frontierCheck",
        "Frontier đã rỗng",
        "Không còn node chờ xử lý.",
        "!frontier.isEmpty() → false",
      );
      if (island) {
        add(
          "floodReturn",
          "Vùng đất đã duyệt xong",
          "Trả về solve(). seen được chia sẻ nên toàn bộ vùng này sẽ không bị đếm lại.",
        );
        leave("flood");
        mem({ frontierAllocated: false });
        phase = "scan";
        return "";
      }
      const answer = problem === "reach" ? "NO" : "-1";
      finishReturn(
        "unreachable",
        `Trả về ${answer}`,
        "Đã khám phá hết phần đi tới được từ S nhưng không lấy được G ra khỏi frontier.",
      );
      return answer;
    };
    const scan = (): string => {
      const island = problem === "islands",
        counting = problem === "collect" || island;
      if (island) {
        mem({ seen: matrix(rows, cols, false), seenAllocated: true });
        set("solve", "seen", "boolean[][]", "seen@solve");
        add(
          "islandSeenAlloc",
          "seen[][] dùng chung cho mọi vùng",
          "Không reset seen giữa các lần flood; nếu reset sẽ đếm một vùng nhiều lần.",
        );
      }
      if (counting) {
        set("solve", "count", "int", 0);
        add(
          "countInit",
          "count = 0",
          island
            ? "Chưa phát hiện thành phần liên thông nào."
            : "Chưa có vật phẩm nào được đếm.",
        );
      }
      if (algorithm === "linear") {
        mem({ flat: Array<number>(rows * cols).fill(0), flatAllocated: true });
        set("solve", "flat", "int[]", "flat@solve");
        add(
          "flatAlloc",
          `Tạo flat[${rows * cols}]`,
          "Bản 1D này thực sự được cấp phát trong Java; tốn thêm R*C số nguyên so với quét grid trực tiếp.",
        );
        set("solve", "copy", "int", 0);
        add("copyInit", "copy = 0", "Bắt đầu chuyển dữ liệu 2D sang 1D.");
        for (let i = 0; i < rows * cols; i++) {
          add(
            "copyCheck",
            `Copy ID ${i}`,
            "Chưa vượt flat.length.",
            `${i} < ${rows * cols} → true`,
          );
          const r = Math.floor(i / cols),
            c = i % cols;
          set("solve", "r", "int", r);
          add("copyR", `r = ${r}`, "Chia nguyên ID cho C để lấy hàng.");
          set("solve", "c", "int", c);
          point(r, c);
          add("copyC", `c = ${c}`, "ID % C là cột.");
          mem({
            flat: memory.flat.map((old, index) =>
              index === i ? memory.grid[r][c] : old,
            ),
          });
          counts.cellReads++;
          counts.writes++;
          add(
            "copyCell",
            `flat[${i}] = grid[${r}][${c}]`,
            "Sao chép giá trị, không xóa ô nguồn. Chưa thực hiện kiểm kê/tìm kiếm ở vòng copy này.",
          );
          set("solve", "copy", "int", i + 1);
          add("copyNext", `copy → ${i + 1}`, "Tiến tới ô 1D kế tiếp.");
          drop("solve", "r", "c");
          current = null;
        }
        add(
          "copyCheck",
          "Đã copy hết grid",
          "Bây giờ mới bắt đầu vòng quét flat[].",
          `${rows * cols} < ${rows * cols} → false`,
        );
      }
      const visit = (r: number, c: number): string | null => {
        point(r, c);
        const id = r * cols + c,
          value = algorithm === "linear" ? memory.flat[id] : memory.grid[r][c];
        set("solve", "value", "int", value);
        counts.cellReads++;
        if (!island && status[id] === "unseen") {
          counts.discovered++;
          cellStatus(id, "queued");
        }
        add(
          "value",
          `Đọc ${algorithm === "linear" ? `flat[${id}]` : `grid[${r}][${c}]`} = ${value}`,
          island
            ? "Đọc ô trong vòng quét ngoài để tìm điểm bắt đầu của vùng mới."
            : "Đây là truy cập mảng, không phải bước robot đi qua các ô trên bản đồ.",
        );
        if (island) {
          const land = value === 1;
          set("solve", "land", "boolean", land);
          add("land", `land = ${land}`, "Chỉ giá trị 1 mới là đất.");
          add(
            "ifLand",
            land ? "Ô đất" : "Ô nước",
            land
              ? "Cần xem ô đất có thuộc một vùng đã đếm hay chưa."
              : "Bỏ qua nước; không flood.",
            `land → ${land}`,
          );
          if (land) {
            const known = memory.seen[r][c];
            set("solve", "known", "boolean", known);
            add(
              "islandKnown",
              `seen[${r}][${c}] = ${known}`,
              "seen giữ kết quả các lần flood trước.",
            );
            add(
              "ifIslandNew",
              known ? "Vùng này đã được đếm" : "Phát hiện vùng mới",
              known
                ? "Không tăng count."
                : "Tăng count một lần rồi đánh dấu toàn bộ vùng qua flood().",
              `!known → ${!known}`,
            );
            if (!known) {
              set("solve", "count", "int", get("solve", "count") + 1);
              add(
                "count",
                `Vùng số ${get("solve", "count")}`,
                "Đếm điểm bắt đầu mới, không đếm từng ô là một vùng.",
              );
              add(
                "floodCall",
                `Gọi flood từ [${r}][${c}]`,
                "Tạm dừng vòng quét solve. Frame flood dùng cùng grid và seen.",
              );
              walk(r, c, true);
              point(r, c);
              add(
                "floodCall",
                "Trở lại vòng quét solve",
                "flood đã trả về. Các ô của vùng vừa duyệt giữ seen = true.",
              );
            }
          }
          if (value === 0) cellStatus(id, "done");
          return null;
        }
        const item = value === 2;
        set("solve", "item", "boolean", item);
        add(
          "item",
          `item = (${value} == 2) → ${item}`,
          "So sánh giá trị vừa đọc, không đọc lại ô mảng.",
        );
        add(
          "ifItem",
          item ? "Đây là vật phẩm" : "Không có vật phẩm",
          item
            ? problem === "collect"
              ? "Tăng biến đếm ở dòng kế tiếp."
              : "Đã có kết quả; return ngay và không đọc các ô còn lại."
            : "Bỏ qua nhánh if, chuyển index ở dòng kế tiếp.",
          `item → ${item}`,
        );
        if (item) {
          if (problem === "collect") {
            set("solve", "count", "int", get("solve", "count") + 1);
            add(
              "count",
              `count → ${get("solve", "count")}`,
              "Mỗi ô 2 chỉ được tính một lần trong thứ tự quét đã chọn.",
            );
          } else {
            cellStatus(id, "path");
            counts.processed++;
            finishReturn(
              "found",
              `Tìm thấy tại ${r} ${c}`,
              "Trả tọa độ đầu tiên theo thứ tự duyệt hiện tại. Những ô chưa đọc không cần xử lý nữa.",
            );
            return `${r} ${c}`;
          }
        }
        close(id);
        return null;
      };
      if (algorithm === "linear") {
        set("solve", "index", "int", 0);
        add(
          "indexInit",
          "index = 0",
          "Duyệt một mảng 1D bằng một biến chỉ số.",
        );
        for (let i = 0; i < rows * cols; i++) {
          add(
            "indexCheck",
            `index = ${i}`,
            "Chỉ truy cập flat[index] khi index < flat.length.",
            `${i} < ${rows * cols} → true`,
          );
          const r = Math.floor(i / cols),
            c = i % cols;
          set("solve", "r", "int", r);
          add(
            "indexR",
            `r = ${r}`,
            "Giải mã tọa độ để biểu diễn ô tương ứng trên grid.",
          );
          set("solve", "c", "int", c);
          point(r, c);
          add("indexC", `c = ${c}`, "Lấy cột từ phần dư.");
          const result = visit(r, c);
          if (result !== null) return result;
          set("solve", "index", "int", i + 1);
          add(
            "indexNext",
            `index → ${i + 1}`,
            "Kết thúc iteration hiện tại; không chạy lại các phép xử lý đã hoàn tất.",
          );
          drop("solve", "r", "c", "value", "item");
          current = null;
        }
        add(
          "indexCheck",
          "Đã hết mảng 1D",
          "index bằng flat.length, dừng.",
          `${rows * cols} < ${rows * cols} → false`,
        );
      } else {
        const column = algorithm === "column",
          outer = column ? "c" : "r",
          inner = column ? "r" : "c",
          outerLimit = column ? cols : rows,
          innerLimit = column ? rows : cols;
        set("solve", outer, "int", 0);
        add(
          "outerInit",
          `${outer} = 0`,
          column
            ? "Cố định cột, quét tất cả hàng trong cột đó."
            : "Cố định hàng, quét tất cả cột trong hàng đó.",
        );
        for (let o = 0; o < outerLimit; o++) {
          add(
            "outerCheck",
            `${outer} = ${o}`,
            "Kiểm tra chỉ số vòng ngoài.",
            `${o} < ${outerLimit} → true`,
          );
          const reverse = algorithm === "snake" && o % 2 === 1,
            delta = reverse ? -1 : 1;
          if (algorithm === "snake") {
            set("solve", "evenRow", "boolean", !reverse);
            add(
              "evenRow",
              `Hàng ${o} ${reverse ? "lẻ" : "chẵn"}`,
              "Hàng chẵn đi từ trái sang phải, hàng lẻ đi từ phải sang trái.",
            );
            add(
              "ifEven",
              reverse ? "Đi ngược chiều" : "Đi thuận chiều",
              "Chọn delta và cột xuất phát.",
              `evenRow → ${!reverse}`,
            );
            set("solve", "delta", "int", delta);
            add(
              reverse ? "backward" : "forward",
              `delta = ${delta}`,
              "Mỗi bước cộng delta vào c.",
            );
            set("solve", inner, "int", reverse ? cols - 1 : 0);
            point(o, reverse ? cols - 1 : 0);
            add(
              reverse ? "innerInitBackward" : "innerInitForward",
              `c = ${reverse ? cols - 1 : 0}`,
              "Đặt c ở đầu hàng theo hướng đã chọn.",
            );
          } else {
            set("solve", inner, "int", 0);
            point(column ? 0 : o, column ? o : 0);
            add(
              "innerInit",
              `${inner} = 0`,
              "Mỗi iteration ngoài khởi tạo lại chỉ số trong.",
            );
          }
          for (let j = 0; j < innerLimit; j++) {
            const i = reverse ? innerLimit - 1 - j : j,
              r = column ? i : o,
              c = column ? o : i;
            add(
              "innerCheck",
              `Xét [${r}][${c}]`,
              algorithm === "snake"
                ? `Kiểm tra 0 <= c < C với c = ${c}.`
                : "Chỉ truy cập ô mảng sau khi điều kiện vòng trong đúng.",
              `${inner} trong miền hợp lệ → true`,
            );
            const result = visit(r, c);
            if (result !== null) return result;
            drop("solve", "known");
            set("solve", inner, "int", i + delta);
            point(column ? i + delta : o, column ? o : i + delta);
            add(
              "innerNext",
              `${inner} → ${i + delta}`,
              "Hoàn tất logic cho ô cũ, chuẩn bị xét ô tiếp theo.",
            );
            drop("solve", "value", "item", "land", "known");
          }
          current = null;
          add(
            "innerCheck",
            "Kết thúc vòng trong",
            `Chỉ số ${inner} đã ngoài miền hợp lệ, không đọc ô tiếp theo.`,
            `${inner} trong miền hợp lệ → false`,
          );
          set("solve", outer, "int", o + 1);
          add(
            "outerNext",
            `${outer} → ${o + 1}`,
            "Tiến vòng ngoài; các biến của thân vòng ngoài sẽ hết scope.",
          );
          drop("solve", inner, "delta", "evenRow");
        }
        add(
          "outerCheck",
          "Đã duyệt hết vòng ngoài",
          "Mọi ô trong thứ tự quét đã được xét.",
          `${outerLimit} < ${outerLimit} → false`,
        );
      }
      const answer = counting ? String(get("solve", "count")) : "-1 -1";
      finishReturn(
        "scanReturn",
        `Trả về ${answer}`,
        counting
          ? "Chuyển số đếm thành chuỗi để main in một dòng cho test case."
          : "Không có vật phẩm trong toàn bộ grid.",
      );
      return answer;
    };
    const answer =
      problem === "reach" || problem === "shortest"
        ? walk(test.start.r, test.start.c, false)
        : scan();
    const solveSteps = steps.length - solveStart;
    leave("solve");
    phase = "result";
    mem({ privateActive: false });
    status = status.map((value) => (value === "queued" ? "skipped" : value));
    neighbor = null;
    set("main", "result", "String", answer);
    add(
      "solveCall",
      `Main nhận result = ${answer}`,
      "Frame solve đã kết thúc. Watch chỉ còn các biến đang tồn tại; bộ nhớ phụ trong visualization là snapshot trước return, không phải heap còn đang sống.",
    );
    outputs = [...outputs, answer];
    phase = "output";
    const report: CaseReport = {
      caseIndex: ti,
      rows,
      cols,
      output: answer,
      steps: steps.length - caseStart + 1,
      inputSteps,
      solveSteps,
      resultAt,
      counts: { ...counts },
    };
    reports = [...reports, report];
    add(
      "print",
      `Output test ${ti + 1}: ${answer}`,
      "System.out.println(result) in đúng một dòng. Bây giờ mới đối chiếu actual với expected, không lấy sẵn đáp án làm actual.",
    );
    caseGenerateMs.push(performance.now() - caseTime);
    set("main", "tc", "int", ti + 1);
    add(
      "caseNext",
      `tc → ${ti + 1}`,
      "Kết thúc test hiện tại. Lần lặp tiếp theo đọc header của test sau.",
    );
  }
  phase = "output";
  scopes.main = {
    args: scopes.main.args,
    source: scopes.main.source,
    tests: scopes.main.tests,
    tc: { type: "int", value: tests },
  };
  current = null;
  neighbor = null;
  add(
    "caseCheck",
    "Đã xử lý toàn bộ test case",
    "tc == tests, thoát main. Output và các snapshot đã giữ nguyên để Previous/Next hoặc tua lại.",
    `${tests} < ${tests} → false`,
  );
  const expected =
    expectedOverride ??
    cases.map((test) => referenceAnswer(test, problem, algorithm));
  return freeze({
    code,
    steps,
    cases,
    input,
    problem,
    algorithm,
    expected,
    generateMs: performance.now() - started,
    caseGenerateMs,
  });
}
