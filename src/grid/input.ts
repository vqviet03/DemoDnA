import { freeze } from "@/engine/steps";
import {
  LIMITS,
  PROBLEMS,
  type GridCase,
  type GridProblem,
  type GridAlgorithm,
} from "./types";
export function parseGridInput(
  text: string,
  problem: GridProblem,
): readonly GridCase[] {
  const tokens = [...text.matchAll(/[^ \t\r\n\f]+/g)];
  let at = 0,
    total = 0;
  const read = (name: string) => {
    const token = tokens[at++];
    if (!token) throw new Error(`Thiếu ${name}, tại token ${at}.`);
    if (!/^-?\d+$/.test(token[0]) || !Number.isSafeInteger(Number(token[0])))
      throw new Error(
        `${name}: «${token[0]}» không phải số nguyên hợp lệ (token ${at}).`,
      );
    return Number(token[0]);
  };
  const count = read("T");
  if (count < 1 || count > LIMITS.cases)
    throw new Error(`T phải từ 1 đến ${LIMITS.cases}.`);
  const cases: GridCase[] = [];
  for (let i = 0; i < count; i++) {
    const prefix = `Test ${i + 1}`,
      rows = read(`${prefix}: R`),
      cols = read(`${prefix}: C`);
    if (rows < 1 || rows > LIMITS.rows || cols < 1 || cols > LIMITS.cols)
      throw new Error(
        `${prefix}: R từ 1–${LIMITS.rows}, C từ 1–${LIMITS.cols}.`,
      );
    total += rows * cols;
    if (total > LIMITS.totalCells)
      throw new Error(
        `Tổng số ô vượt ${LIMITS.totalCells}; giới hạn này giữ replay từng lệnh nhẹ và dễ quan sát.`,
      );
    const start = PROBLEMS[problem].hasPoints
      ? { r: read(`${prefix}: sr`), c: read(`${prefix}: sc`) }
      : { r: 0, c: 0 };
    const goal = PROBLEMS[problem].hasPoints
      ? { r: read(`${prefix}: tr`), c: read(`${prefix}: tc`) }
      : { r: rows - 1, c: cols - 1 };
    for (const p of [start, goal])
      if (p.r < 0 || p.r >= rows || p.c < 0 || p.c >= cols)
        throw new Error(
          `${prefix}: tọa độ phải nằm trong grid, dùng chỉ số từ 0.`,
        );
    const cells: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const value = read(`${prefix}: grid[${r}][${c}]`);
        if (value < 0 || value > (problem === "islands" ? 1 : 2))
          throw new Error(
            `${prefix}: grid[${r}][${c}] chỉ nhận ${problem === "islands" ? "0 hoặc 1" : "0, 1 hoặc 2"}.`,
          );
        row.push(value);
      }
      cells.push(row);
    }
    if (
      PROBLEMS[problem].hasPoints &&
      (cells[start.r][start.c] === 1 || cells[goal.r][goal.c] === 1)
    )
      throw new Error(`${prefix}: S và G không được nằm trên tường.`);
    cases.push({ rows, cols, cells, start, goal });
  }
  if (at !== tokens.length)
    throw new Error(
      `Dư ${tokens.length - at} token sau ${count} test case. Không lặp lại T ở đầu mỗi test.`,
    );
  return freeze(cases);
}
export function serializeGridInput(
  cases: readonly GridCase[],
  problem: GridProblem,
): string {
  return [
    String(cases.length),
    ...cases.flatMap((t) => [
      `${t.rows} ${t.cols}`,
      ...(PROBLEMS[problem].hasPoints
        ? [`${t.start.r} ${t.start.c} ${t.goal.r} ${t.goal.c}`]
        : []),
      ...t.cells.map((row) => row.join(" ")),
    ]),
  ].join("\n");
}
export function parseExpected(
  text: string,
  count: number,
): readonly string[] | null {
  if (!text.trim()) return null;
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "));
  if (lines.length !== count)
    throw new Error(
      `Expected cần đúng ${count} dòng, một dòng cho mỗi test case.`,
    );
  return lines;
}
export function gridExample(problem: GridProblem): readonly GridCase[] {
  const first: GridCase = {
    rows: 6,
    cols: 8,
    start: { r: 0, c: 0 },
    goal: { r: 5, c: 7 },
    cells: [
      [0, 0, 0, 2, 1, 0, 0, 0],
      [1, 1, 0, 0, 1, 0, 2, 0],
      [0, 0, 0, 1, 0, 0, 1, 0],
      [0, 1, 2, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 2, 1],
      [1, 0, 1, 1, 0, 0, 0, 0],
    ],
  };
  const second: GridCase = {
    rows: 3,
    cols: 4,
    start: { r: 0, c: 0 },
    goal: { r: 2, c: 3 },
    cells: [
      [0, 2, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 2, 0],
    ],
  };
  if (problem !== "islands") return freeze([first, second]);
  return freeze([
    {
      rows: 5,
      cols: 7,
      start: { r: 0, c: 0 },
      goal: { r: 4, c: 6 },
      cells: [
        [1, 1, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 0, 1],
        [0, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 0, 0],
        [1, 0, 0, 0, 0, 1, 1],
      ],
    },
    {
      rows: 2,
      cols: 4,
      start: { r: 0, c: 0 },
      goal: { r: 1, c: 3 },
      cells: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    },
  ]);
}
export function scanOrder(
  rows: number,
  cols: number,
  algorithm: GridAlgorithm,
): readonly number[] {
  const order: number[] = [];
  if (algorithm === "column") {
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) order.push(r * cols + c);
  } else
    for (let r = 0; r < rows; r++)
      for (let j = 0; j < cols; j++) {
        const c = algorithm === "snake" && r % 2 === 1 ? cols - 1 - j : j;
        order.push(r * cols + c);
      }
  return order;
}
// Independent answer oracle; it does not inspect or reuse replay snapshots.
export function referenceAnswer(
  test: GridCase,
  problem: GridProblem,
  algorithm: GridAlgorithm,
): string {
  const { rows, cols, cells, start, goal } = test;
  if (problem === "collect")
    return String(cells.flat().filter((value) => value === 2).length);
  if (problem === "find") {
    const id = scanOrder(rows, cols, algorithm).find(
      (id) => cells[Math.floor(id / cols)][id % cols] === 2,
    );
    return id === undefined ? "-1 -1" : `${Math.floor(id / cols)} ${id % cols}`;
  }
  const seen = new Set<number>(),
    directions = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ];
  const explore = (seed: number, land: boolean): number => {
    const queue: [number, number][] = [[seed, 0]];
    seen.add(seed);
    for (let head = 0; head < queue.length; head++) {
      const [id, distance] = queue[head],
        r = Math.floor(id / cols),
        c = id % cols;
      if (!land && r === goal.r && c === goal.c) return distance;
      for (const [dr, dc] of directions) {
        const nr = r + dr,
          nc = c + dc,
          next = nr * cols + nc;
        if (
          nr < 0 ||
          nr >= rows ||
          nc < 0 ||
          nc >= cols ||
          seen.has(next) ||
          (land ? cells[nr][nc] !== 1 : cells[nr][nc] === 1)
        )
          continue;
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
    return -1;
  };
  if (problem === "islands") {
    let count = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (cells[r][c] === 1 && !seen.has(r * cols + c)) {
          count++;
          explore(r * cols + c, true);
        }
    return String(count);
  }
  const distance = explore(start.r * cols + start.c, false);
  return problem === "reach"
    ? distance >= 0
      ? "YES"
      : "NO"
    : String(distance);
}
