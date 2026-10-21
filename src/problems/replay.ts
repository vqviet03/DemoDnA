import { freeze } from "@/engine/steps";
import type { Matrix, Scope, WatchData } from "@/grid/types";
import { problemSource } from "./source";
import type {
  MethodId,
  Neighbor,
  ProblemCase,
  ProblemId,
  ProblemRun,
  ProblemStep,
  SolveResult,
} from "./types";
const zeros = (r: number, c: number): Matrix<number> =>
  Array.from({ length: r }, () => Array<number>(c).fill(0));
const write = (
  matrix: Matrix<number>,
  r: number,
  c: number,
  v: number,
): Matrix<number> =>
  matrix.map((row, i) =>
    i === r ? row.map((x, j) => (j === c ? v : x)) : row,
  );
const scope = (values: Record<string, WatchData>): Scope =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      {
        type: Array.isArray(value)
          ? Array.isArray(value[0])
            ? "int[][]"
            : "int[]"
          : typeof value === "boolean"
            ? "boolean"
            : typeof value === "number"
              ? "int"
              : "reference",
        value,
      },
    ]),
  );
export function generateProblemRun(
  test: ProblemCase,
  problem: ProblemId,
  method: MethodId,
  options: {
    caseIndex?: number;
    tests?: number;
    detail?: boolean;
    focus?: readonly [number, number];
    record?: boolean;
  } = {},
): ProblemRun {
  const started = performance.now(),
    record = options.record !== false,
    code = problemSource(problem, method),
    ci = options.caseIndex ?? 0;
  const detailed = (options.detail ?? true) && test.rows * test.cols <= 144,
    focus = options.focus ?? null;
  const steps: ProblemStep[] = [];
  let tick = 0,
    current: readonly [number, number] | null = null,
    target: readonly [number, number] | null = null,
    neighbors: readonly Neighbor[] = [],
    signs: number[] = [],
    sum: number | null = null;
  let results = zeros(
      test.rows,
      problem === "origami" ? test.cols / test.parts : test.cols,
    ),
    marks = zeros(test.rows, test.cols),
    folded = 0,
    foldFrom: number | null = null,
    answer = 0,
    phase: ProblemStep["phase"] = "input",
    output: string | null = null;
  let main: Record<string, WatchData> = {
      tests: options.tests ?? 1,
      tc: ci + 1,
    },
    local: Record<string, WatchData> = {},
    frames: Record<string, Record<string, WatchData>> = {},
    stack: string[] = ["main(String[] args)"];
  let detail = true;
  function emit(
    marker: string,
    title: string,
    explanation: string,
    keep = false,
  ) {
    tick++;
    if (!record || (!detail && !keep)) return;
    const line = code.markers[marker];
    if (!line) throw new Error(`Missing marker ${method}/${marker}`);
    const scopes: Record<string, Scope> = { main: scope(main) };
    if (phase === "solve") scopes.solve = scope(local);
    scopes.static = scope({
      reader: "BufferedReader (input)",
      tokenizer: "StringTokenizer (helper nextInt)",
      ...(problem === "coloring"
        ? { DR: [-1, 0, 1, 0], DC: [0, 1, 0, -1] }
        : {}),
    });
    for (const [name, vars] of Object.entries(frames))
      scopes[name] = scope(vars);
    steps.push(
      freeze({
        id: `${ci}-${steps.length}`,
        marker,
        activeLines: [line],
        title,
        explanation,
        scopes,
        callStack: [...stack],
        current,
        target,
        neighbors,
        signs: [...signs],
        sum,
        results,
        marks,
        folded,
        foldFrom,
        answer,
        output,
        phase,
        tick,
        detail,
      }),
    );
    foldFrom = null;
  }
  emit(
    "tests",
    "Đọc số lượng test case",
    "BufferedReader + StringTokenizer đọc token T; nextInt là helper đã thu gọn.",
  );
  emit(
    "testLoop",
    `Bắt đầu test #${ci + 1}`,
    "Timeline tập trung vào test đang chọn. Chọn test khác để xem từ trạng thái ban đầu.",
  );
  main = { ...main, n: test.rows };
  emit("n", "Đọc N", `n = ${test.rows}.`);
  main = { ...main, m: problem === "origami" ? test.parts : test.cols };
  emit(
    "m",
    problem === "origami" ? "Đọc M dải giấy" : "Đọc M cột",
    `m = ${main.m}.`,
  );
  main = { ...main, cols: test.cols };
  emit(
    "cols",
    "Xác định số cột",
    `Ma trận đầu vào có ${test.rows} hàng × ${test.cols} cột.`,
  );
  main = { ...main, a: zeros(test.rows, test.cols) };
  emit(
    "allocate",
    "Cấp phát int[][]",
    "Các ô ban đầu bằng 0; màu nhạt biểu thị chưa đọc input.",
  );
  for (let r = 0; r < test.rows; r++) {
    main = { ...main, r };
    detail = detailed;
    emit("inputRow", "Đọc một hàng", `r = ${r}.`);
    for (let c = 0; c < test.cols; c++) {
      current = [r, c];
      detail = detailed || (!!focus && focus[0] === r && focus[1] === c);
      main = { ...main, c };
      emit("inputCol", "Đọc ô tiếp theo", `c = ${c}.`);
      main = {
        ...main,
        a: record
          ? write(main.a as Matrix<number>, r, c, test.cells[r][c])
          : test.cells,
      };
      marks = write(marks, r, c, 1);
      emit(
        "read",
        `a[${r}][${c}] ← ${test.cells[r][c]}`,
        "Chuyển một token input thành số nguyên rồi lưu vào ma trận.",
        c === test.cols - 1 && !detailed,
      );
    }
  }
  main = {
    tests: options.tests ?? 1,
    tc: ci + 1,
    n: test.rows,
    m: problem === "origami" ? test.parts : test.cols,
    cols: test.cols,
    a: test.cells,
  };
  current = null;
  detail = true;
  marks = zeros(test.rows, test.cols);
  emit(
    "solve",
    "Gọi solve(a, parts)",
    "Main giữ ma trận input; biến cục bộ của solve nằm trong frame riêng.",
  );
  phase = "solve";
  stack = ["solve(a, parts)", "main(String[] args)"];
  local = { a: test.cells, parts: test.parts };
  const set = (name: string, value: WatchData) => {
    local = { ...local, [name]: value };
  };
  function point(r: number, c: number) {
    current = [r, c];
    target = null;
    detail = detailed || (!!focus && focus[0] === r && focus[1] === c);
  }
  if (problem === "coloring") {
    set("count", 0);
    emit(
      "countZero",
      "Khởi tạo kết quả",
      "count = 0: chưa có ô nào được chấp nhận.",
      true,
    );
    for (let r = 0; r < test.rows; r++) {
      set("r", r);
      emit("rowLoop", "Quét hàng", `r = ${r}.`);
      for (let c = 0; c < test.cols; c++) {
        point(r, c);
        neighbors = [];
        signs = [];
        sum = null;
        set("c", c);
        emit(
          "colLoop",
          `Kiểm tra ô [${r}, ${c}]`,
          `Giá trị đích là ${test.cells[r][c]}.`,
          true,
        );
        let values = Array<number>(4).fill(0),
          k = 0;
        set("values", values);
        emit(
          "values",
          "Bộ nhớ tạm int[4]",
          "Tối đa bốn số kề; k đếm số ô thực sự nằm trong biên.",
        );
        set("k", k);
        emit("kZero", "Chưa có số kề", "k = 0.");
        for (let d = 0; d < 4; d++) {
          for (const name of ["nr", "nc", "inside"]) delete local[name];
          set("d", d);
          emit(
            "neighborLoop",
            "Xét một hướng",
            `Hướng ${["trên", "phải", "dưới", "trái"][d]}.`,
          );
          const nr = r + [-1, 0, 1, 0][d],
            nc = c + [0, 1, 0, -1][d];
          set("nr", nr);
          emit("nr", "Tính hàng kề", `nr = ${r} + DR[${d}] = ${nr}.`);
          set("nc", nc);
          emit("nc", "Tính cột kề", `nc = ${c} + DC[${d}] = ${nc}.`);
          const inside = nr >= 0 && nr < test.rows && nc >= 0 && nc < test.cols;
          set("inside", inside);
          emit(
            "inside",
            "Kiểm tra biên",
            `[${nr}, ${nc}] ${inside ? "nằm trong" : "nằm ngoài"} ma trận.`,
          );
          emit(
            "ifInside",
            inside ? "Nhận ô kề" : "Bỏ hướng ngoài biên",
            inside
              ? "Được phép đọc a[nr][nc]."
              : "Không đọc mảng tại tọa độ này.",
          );
          if (inside) {
            values = values.map((v, i) => (i === k ? test.cells[nr][nc] : v));
            set("values", values);
            neighbors = [
              ...neighbors,
              { r: nr, c: nc, value: test.cells[nr][nc] },
            ];
            emit(
              "readNeighbor",
              `values[${k}] = ${values[k]}`,
              "Giữ thứ tự: trên → phải → dưới → trái, bỏ các hướng ngoài biên.",
            );
            k++;
            set("k", k);
            emit("kNext", "Tăng số láng giềng", `k = ${k}.`);
          }
        }
        for (const name of ["d", "nr", "nc", "inside"]) delete local[name];
        emit(
          "accept",
          "Gọi accepts",
          `Dùng đủ ${k} số để tạo tổng ${test.cells[r][c]}.`,
        );
        const goal = test.cells[r][c];
        let ok = false;
        const acc: Record<string, WatchData> = { values, k, target: goal };
        frames = { accepts: acc };
        stack = [
          "accepts(values, k, target)",
          "solve(a, parts)",
          "main(String[] args)",
        ];
        if (method === "dfs") {
          emit(
            "startDfs",
            "Gọi choose(…, 0, 0)",
            "Mỗi frame giữ depth và sum riêng. Độ sâu tối đa là 4.",
          );
          const choose = (depth: number, running: number): boolean => {
            const name = `choose${depth}`;
            const vars: Record<string, WatchData> = {
              values,
              k,
              target: goal,
              depth,
              sum: running,
            };
            frames = { ...frames, [name]: vars };
            stack = [`choose(${depth}, ${running})`, ...stack];
            sum = running;
            emit(
              "leaf",
              "Đã dùng đủ số chưa?",
              `depth = ${depth}, k = ${k}; ${depth === k ? "đã đủ" : "còn số cần chọn dấu"}.`,
            );
            let found: boolean;
            if (depth === k) {
              found = running === goal;
              emit(
                "leafReturn",
                found ? "Tổng bằng ô trung tâm" : "Tổng chưa khớp",
                `${running} == ${goal} → ${found}.`,
              );
            } else {
              signs = signs.slice(0, depth);
              signs[depth] = 1;
              vars.next = running + values[depth];
              emit(
                "dfsPlus",
                "Chọn nhánh +",
                `${running} + (${values[depth]}) = ${vars.next}.`,
              );
              emit(
                "recursePlus",
                "Đi sâu nhánh +",
                "Đẩy một frame choose mới vào Call Stack.",
              );
              found = choose(depth + 1, vars.next as number);
              vars.found = found;
              sum = running;
              emit("found", "Nhánh + đã tìm được chưa?", `found = ${found}.`);
              if (found)
                emit(
                  "dfsYes",
                  "Return true ngược lên",
                  "Dừng sớm: đã có một cách gán dấu hợp lệ.",
                );
              else {
                signs = signs.slice(0, depth);
                signs[depth] = -1;
                vars.next = running - values[depth];
                emit(
                  "dfsMinus",
                  "Backtrack · thử dấu −",
                  `${running} − (${values[depth]}) = ${vars.next}.`,
                );
                emit(
                  "recurseMinus",
                  "Đi sâu nhánh −",
                  "Thử lựa chọn còn lại; trả kết quả đệ quy cho caller.",
                );
                found = choose(depth + 1, vars.next as number);
              }
            }
            frames = { ...frames };
            delete frames[name];
            stack = stack.slice(1);
            return found;
          };
          ok = choose(0, 0);
        } else {
          let wanted = goal,
            allowed = true;
          if (method === "subset") {
            acc.total = 0;
            emit("totalZero", "Tính tổng tất cả", "total = 0.");
            for (let j = 0; j < k; j++) {
              acc.j = j;
              emit("totalLoop", "Đọc số để tính total", `j = ${j}.`);
              acc.total = (acc.total as number) + values[j];
              emit("totalAdd", "Cộng vào total", `total = ${acc.total}.`);
            }
            delete acc.j;
            acc.adjusted = goal + (acc.total as number);
            emit(
              "adjusted",
              "Biến đổi phương trình",
              `adjusted = target + total = ${acc.adjusted}.`,
            );
            allowed = (acc.adjusted as number) % 2 === 0;
            emit(
              "odd",
              "Kiểm tra tính chẵn",
              `${acc.adjusted} ${allowed ? "chẵn, có thể chia 2" : "lẻ, không thể có nghiệm nguyên"}.`,
            );
            if (!allowed)
              emit(
                "oddReturn",
                "Loại ngay ô này",
                "Tổng của một nhóm số nguyên không thể là nửa số lẻ.",
              );
            else {
              wanted = (acc.adjusted as number) / 2;
              acc.wanted = wanted;
              emit(
                "wanted",
                "Tổng cần tìm cho nhóm +",
                `wanted = ${wanted}; không loại số âm.`,
              );
            }
          }
          if (allowed) {
            const limit = 1 << k;
            acc.limit = limit;
            emit("limit", "Số tổ hợp dấu", `1 << ${k} = ${limit}.`);
            for (let mask = 0; mask < limit; mask++) {
              delete acc.sum;
              acc.mask = mask;
              signs = [];
              emit(
                "maskLoop",
                `Thử mask ${mask.toString(2).padStart(k, "0")}`,
                `Bit 1 chọn +; bit 0 ${method === "subset" ? "không nằm trong nhóm +" : "chọn −"}.`,
              );
              let running = 0;
              sum = 0;
              acc.sum = 0;
              emit("sumZero", "Đặt lại tổng", "sum = 0 cho tổ hợp mới.");
              for (let j = 0; j < k; j++) {
                acc.j = j;
                emit(
                  "signLoop",
                  "Xét một số kề",
                  `values[${j}] = ${values[j]}.`,
                );
                const plus = !!(mask & (1 << j));
                acc.plus = plus;
                signs = [...signs, plus ? 1 : -1];
                emit("plus", "Đọc bit chọn dấu", `Bit ${j} = ${plus ? 1 : 0}.`);
                emit(
                  "ifPlus",
                  plus ? "Nhánh +" : "Nhánh không chọn +",
                  `plus = ${plus}.`,
                );
                if (plus || method === "mask") {
                  running += plus ? values[j] : -values[j];
                  sum = running;
                  acc.sum = running;
                  emit(
                    plus ? "add" : "subtract",
                    "Cập nhật tổng",
                    `${method === "subset" ? "Tổng nhóm +" : "Tổng có dấu"} hiện tại = ${running}.`,
                  );
                }
              }
              delete acc.j;
              delete acc.plus;
              ok = running === wanted;
              emit(
                "match",
                ok ? "Tìm thấy cách gán dấu" : "Chưa khớp",
                `${running} == ${wanted} → ${ok}.`,
              );
              if (ok) {
                emit(
                  "yes",
                  "Return true",
                  "Chỉ cần tồn tại một cách gán dấu, không đếm số cách.",
                );
                break;
              }
            }
            if (!ok)
              emit(
                "no",
                "Đã thử hết · return false",
                "Không có tổ hợp nào tạo được tổng yêu cầu.",
              );
          }
        }
        frames = {};
        stack = ["solve(a, parts)", "main(String[] args)"];
        set("ok", ok);
        emit("accept", "accepts trả kết quả", `ok = ${ok}.`);
        marks = write(marks, r, c, ok ? 2 : 3);
        emit(
          "ifOk",
          ok ? "Tô ô hợp lệ" : "Không tô ô",
          `a[${r}][${c}] = ${goal}; ${ok ? "có" : "không có"} cách gán đủ dấu.`,
          true,
        );
        if (ok) {
          answer++;
          set("count", answer);
          emit("countNext", "Tăng số ô được tô", `count = ${answer}.`, true);
        }
        for (const name of ["values", "k", "ok"]) delete local[name];
      }
      delete local.c;
    }
    delete local.r;
    current = null;
    neighbors = [];
    signs = [];
    sum = null;
    detail = true;
  } else {
    const n = test.rows,
      width = n / test.parts;
    set("n", n);
    emit("solveN", "Số hàng giấy", `n = ${n}.`, true);
    set("width", width);
    emit(
      "width",
      "Chiều rộng sau gấp",
      `width = ${n} / ${test.parts} = ${width}.`,
      true,
    );
    if (method === "fold") {
      let held = zeros(n, width);
      set("current", held);
      emit(
        "currentNew",
        "Giữ dải ngoài cùng bên phải",
        "current là ma trận số của chồng giấy đang gấp.",
        true,
      );
      for (let r = 0; r < n; r++) {
        set("r", r);
        emit("copyRow", "Sao chép dải đầu", "Giữ nguyên hàng.");
        for (let c = 0; c < width; c++) {
          point(r, (test.parts - 1) * width + c);
          target = [r, c];
          set("c", c);
          emit("copyCol", "Sao chép một ô", "Bắt đầu từ dải phải nhất.");
          held = write(held, r, c, test.cells[r][current![1]]);
          marks = write(marks, r, current![1], 2);
          results = held;
          set("current", held);
          emit(
            "copy",
            "Lưu ô vào chồng giấy",
            `current[${r}][${c}] = ${held[r][c]}.`,
            true,
          );
        }
      }
      delete local.r;
      delete local.c;
      for (let block = test.parts - 2; block >= 0; block--) {
        detail = true;
        set("block", block);
        current = null;
        target = null;
        emit(
          "blockLoop",
          `Dải đích ${block}`,
          "Gấp toàn bộ chồng giấy bên phải sang dải liền trái.",
          true,
        );
        foldFrom = test.parts - 1 - folded;
        folded++;
        emit(
          "fold",
          `Gấp ${folded % 2 ? "lên" : "xuống"} · lần ${folded} / ${test.parts - 1}`,
          "Lật quanh nếp dọc: cột c của dải trái chồng với cột width−1−c của chồng bên phải. Hình giấy mô tả hình học; next được tính từng ô ngay sau đây.",
          true,
        );
        let next = zeros(n, width);
        frames = {
          foldLeft: { current: held, a: test.cells, block, width, next },
        };
        stack = [
          "foldLeft(current, a, block, width)",
          "solve(a, parts)",
          "main(String[] args)",
        ];
        results = next;
        emit(
          "nextNew",
          "Cấp phát next",
          "Mảng kết quả của lần gấp này bắt đầu từ 0.",
          true,
        );
        for (let r = 0; r < n; r++) {
          frames.foldLeft = { ...frames.foldLeft, r };
          emit("foldRow", "Giữ nguyên hàng", `r = ${r}.`);
          for (let c = 0; c < width; c++) {
            point(r, block * width + c);
            target = [r, c];
            frames.foldLeft = { ...frames.foldLeft, c };
            emit("foldCol", "Chọn ô đích", `next[${r}][${c}].`);
            const mirrored = width - 1 - c,
              left = test.cells[r][block * width + c],
              right = held[r][mirrored];
            frames.foldLeft = { ...frames.foldLeft, mirrored };
            emit(
              "mirrored",
              "Đảo chiều cột",
              `mirrored = ${width} − 1 − ${c} = ${mirrored}.`,
            );
            frames.foldLeft = { ...frames.foldLeft, left };
            emit(
              "leftValue",
              "Đọc số ở dải trái",
              `a[${r}][${block * width + c}] = ${left}.`,
            );
            frames.foldLeft = { ...frames.foldLeft, right };
            emit(
              "rightValue",
              "Đọc chồng giấy sau lật",
              `current[${r}][${mirrored}] = ${right}.`,
            );
            next = write(next, r, c, left + right);
            results = next;
            sum = left + right;
            marks = write(marks, r, block * width + c, 2);
            frames.foldLeft = { ...frames.foldLeft, next };
            emit(
              "foldAdd",
              "Cộng hai lớp chồng",
              `${left} + ${right} = ${left + right}.`,
              true,
            );
          }
        }
        detail = true;
        current = null;
        target = null;
        delete frames.foldLeft.r;
        delete frames.foldLeft.c;
        delete frames.foldLeft.mirrored;
        delete frames.foldLeft.left;
        delete frames.foldLeft.right;
        emit("foldReturn", "Trả next", "Hoàn tất các ô của lần gấp.");
        held = next;
        frames = {};
        stack = ["solve(a, parts)", "main(String[] args)"];
        set("current", held);
        emit(
          "fold",
          "Gán current sau return",
          "current tham chiếu ma trận vừa tính xong.",
          true,
        );
      }
      delete local.block;
      set("result", held);
      results = held;
      emit(
        "resultAssign",
        "Giấy đã gấp xong",
        "result và current cùng tham chiếu một ma trận.",
        true,
      );
    } else {
      set("result", results);
      emit(
        "resultNew",
        "Cấp phát ma trận kết quả",
        `int[${n}][${width}] chứa tổng chồng lớp.`,
        true,
      );
      const add = (r: number, c: number, dest: number, marker: string) => {
        target = [r, dest];
        const previous = results[r][dest],
          v = test.cells[r][c];
        results = write(results, r, dest, previous + v);
        sum = previous + v;
        set("result", results);
        marks = write(marks, r, c, 2);
        emit(
          marker,
          `Cộng vào result[${r}][${dest}]`,
          `${previous} + a[${r}][${c}] (${v}) = ${previous + v}.`,
          true,
        );
      };
      if (method === "mapping")
        for (let r = 0; r < n; r++) {
          set("r", r);
          emit("mapRow", "Quét hàng giấy", `r = ${r}.`);
          for (let c = 0; c < n; c++) {
            point(r, c);
            set("c", c);
            emit(
              "mapCol",
              "Chọn ô nguồn",
              `a[${r}][${c}] = ${test.cells[r][c]}.`,
            );
            const block = Math.floor(c / width),
              pos = c % width;
            let dest = pos;
            set("block", block);
            emit(
              "block",
              "Xác định dải giấy",
              `block = ${c} / ${width} = ${block} (chia nguyên).`,
            );
            set("local", pos);
            emit("local", "Cột trong dải", `local = ${c} % ${width} = ${pos}.`);
            set("dest", dest);
            target = [r, dest];
            emit("dest", "Mặc định giữ chiều", `dest = ${dest}.`);
            emit(
              "reverseCheck",
              "Dải lẻ có bị lật?",
              `${block} % 2 != 0 → ${block % 2 !== 0}.`,
            );
            if (block % 2) {
              dest = width - 1 - pos;
              set("dest", dest);
              target = [r, dest];
              emit(
                "reverse",
                "Đảo cột ở dải lẻ",
                `dest = ${width} − 1 − ${pos} = ${dest}.`,
              );
            }
            add(r, c, dest, "accumulate");
          }
        }
      else
        for (let r = 0; r < n; r++) {
          set("r", r);
          emit("layerRow", "Chọn hàng kết quả", `r = ${r}.`);
          for (let dest = 0; dest < width; dest++) {
            set("dest", dest);
            emit("layerDest", "Chọn cột đích", `dest = ${dest}.`);
            for (let block = 0; block < test.parts; block++) {
              const pos = block % 2 ? width - 1 - dest : dest,
                c = block * width + pos;
              point(r, c);
              target = [r, dest];
              set("block", block);
              emit(
                "layerBlock",
                "Xét một lớp giấy",
                `Dải ${block} đóng góp một số cho ô đích.`,
              );
              set("local", dest);
              emit("layerLocal", "Cột nguồn nếu giữ chiều", `local = ${dest}.`);
              emit(
                "layerReverseCheck",
                "Kiểm tra dải lẻ",
                `${block} % 2 != 0 → ${block % 2 !== 0}.`,
              );
              if (block % 2) {
                set("local", pos);
                emit(
                  "layerReverse",
                  "Đảo cột nguồn",
                  `local = ${width} − 1 − ${dest} = ${pos}.`,
                );
              }
              set("c", c);
              emit(
                "sourceCol",
                "Tính cột trong giấy ban đầu",
                `c = ${block} × ${width} + ${pos} = ${c}.`,
              );
              add(r, c, dest, "layerAdd");
            }
          }
        }
      // Geometric folded view is separate from the actual result accumulation.
      for (const key of ["r", "c", "block", "dest", "local"]) delete local[key];
      current = null;
      target = null;
      detail = true;
    }
    set("best", 0);
    emit(
      "bestZero",
      "Tìm tổng lớn nhất",
      "best = 0; các số trong đề đều dương.",
      true,
    );
    for (let r = 0; r < n; r++) {
      set("r", r);
      emit("maxRow", "Quét hàng kết quả", `r = ${r}.`);
      for (let c = 0; c < width; c++) {
        detail = detailed || (!!focus && focus[0] === r && focus[1] === c);
        target = [r, c];
        current = null;
        set("c", c);
        emit(
          "maxCol",
          "Xét ô chồng lớp",
          `result[${r}][${c}] = ${results[r][c]}.`,
        );
        answer = Math.max(answer, results[r][c]);
        set("best", answer);
        emit(
          "best",
          "Cập nhật best",
          `best = max(best, ${results[r][c]}) = ${answer}.`,
          true,
        );
      }
    }
    delete local.r;
    delete local.c;
    current = null;
    target = null;
    sum = null;
    detail = true;
  }
  emit(
    "return",
    `Return ${answer}`,
    "Rời solve; các biến cục bộ biến mất khỏi Call Stack.",
    true,
  );
  main = { ...main, answer };
  phase = "output";
  frames = {};
  local = {};
  stack = ["main(String[] args)"];
  emit("solve", "solve trả kết quả cho main", `answer = ${answer}.`, true);
  output = `#${ci + 1} ${answer}`;
  emit(
    "print",
    "In kết quả",
    `System.out.println ghi đúng định dạng: ${output}.`,
    true,
  );
  return freeze({
    problem,
    method,
    test,
    caseIndex: ci,
    code,
    steps,
    operations: tick,
    generateMs: performance.now() - started,
    answer,
    result: results,
    marks,
    detailed,
    focus,
  });
}
export function solveProblem(
  test: ProblemCase,
  problem: ProblemId,
  method: MethodId,
): SolveResult {
  const run = generateProblemRun(test, problem, method, {
    record: false,
    detail: false,
  });
  return {
    answer: run.answer,
    result: run.result,
    marks: run.marks,
    operations: run.operations,
  };
}
