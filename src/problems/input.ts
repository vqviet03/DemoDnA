import { freeze } from "@/engine/steps";
import type { ProblemCase, ProblemId } from "./types";
export function parseProblemInput(
  text: string,
  problem: ProblemId,
): readonly ProblemCase[] {
  const tokens = text.trim().split(/\s+/);
  let at = 0;
  const read = () => {
    const t = tokens[at++];
    if (t === undefined || !/^-?\d+$/.test(t))
      throw new Error(
        `Token ${at}: cần số nguyên${t === undefined ? " (input bị thiếu)" : ""}.`,
      );
    const n = Number(t);
    if (!Number.isSafeInteger(n)) throw new Error(`Token ${at}: số quá lớn.`);
    return n;
  };
  const count = read();
  if (count < 1 || count > 100)
    throw new Error("Lab hỗ trợ từ 1 đến 100 test case mỗi bộ.");
  const cases: ProblemCase[] = [];
  let cellsTotal = 0;
  for (let t = 0; t < count; t++) {
    const n = read(),
      m = read();
    if (problem === "coloring" && (n < 5 || n > 50 || m < 5 || m > 50))
      throw new Error(`Test #${t + 1}: N, M phải từ 5 đến 50 theo đề.`);
    if (
      problem === "origami" &&
      (n < 1 || n > 100 || m < 1 || m > n || n % m !== 0)
    )
      throw new Error(
        `Test #${t + 1}: 1 ≤ N ≤ 100; 1 ≤ M ≤ N và N phải chia hết cho M.`,
      );
    const cols = problem === "coloring" ? m : n;
    cellsTotal += n * cols;
    if (cellsTotal > 100000)
      throw new Error(
        "Một bộ input trong lab hỗ trợ tối đa 100.000 ô. Hãy chia nhỏ bộ test lớn hơn.",
      );
    const cells = Array.from({ length: n }, () =>
      Array.from({ length: cols }, () => {
        const x = read();
        if (problem === "coloring" ? x < -20 || x > 20 : x < 1 || x > 100)
          throw new Error(`Test #${t + 1}: giá trị ô ngoài miền của đề.`);
        return x;
      }),
    );
    cases.push(
      freeze({ rows: n, cols, parts: problem === "origami" ? m : 1, cells }),
    );
  }
  if (at !== tokens.length)
    throw new Error(
      `Input còn ${tokens.length - at} token thừa sau ${count} test case.`,
    );
  return freeze(cases);
}
export function expectedLines(text: string, count: number): readonly string[] {
  if (!text.trim()) return [];
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((x) => x.trim().replace(/\s+/g, " "));
  if (
    lines.length !== count ||
    lines.some((s, i) => !new RegExp(`^#${i + 1} -?\\d+$`).test(s))
  )
    throw new Error(`Expected cần đúng ${count} dòng dạng #1 18, #2 9, …`);
  return lines;
}
// Independent oracles: signed reachable sums, and physical right-to-left folding.
export function referenceAnswer(test: ProblemCase, problem: ProblemId): number {
  if (problem === "coloring") {
    let count = 0;
    for (let r = 0; r < test.rows; r++)
      for (let c = 0; c < test.cols; c++) {
        let sums = new Set([0]);
        for (const [dr, dc] of [
          [-1, 0],
          [0, 1],
          [1, 0],
          [0, -1],
        ]) {
          const nr = r + dr,
            nc = c + dc;
          if (nr < 0 || nr >= test.rows || nc < 0 || nc >= test.cols) continue;
          const v = test.cells[nr][nc];
          sums = new Set([...sums].flatMap((x) => [x + v, x - v]));
        }
        if (sums.has(test.cells[r][c])) count++;
      }
    return count;
  }
  const k = test.cols / test.parts;
  let folded = test.cells.map((row) => row.slice(-k));
  for (let b = test.parts - 2; b >= 0; b--)
    folded = folded.map((row, r) =>
      row.map((_, c) => test.cells[r][b * k + c] + row[k - 1 - c]),
    );
  return Math.max(...folded.map((row) => Math.max(...row)));
}
