import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  PROBLEMS,
  type ProblemId,
  type ProblemCase,
} from "../src/problems/types";
import { SAMPLES } from "../src/problems/samples";
import { parseProblemInput, referenceAnswer } from "../src/problems/input";
import { problemSource } from "../src/problems/source";
import { solveProblem } from "../src/problems/replay";
const dir = mkdtempSync(join(tmpdir(), "problems-java-"));
let count = 0;
try {
  for (const p of ["coloring", "origami"] as ProblemId[]) {
    const sample = parseProblemInput(SAMPLES[p].input, p);
    const cases: ProblemCase[] = [...sample];
    for (const n of p === "origami" ? [1, 6, 12, 100] : [5, 7, 50])
      for (const m of p === "origami"
        ? [1, n, ...(n === 12 ? [2, 3, 4, 6] : [])]
        : [5, n]) {
        const cells = Array.from({ length: n }, (_, r) =>
          Array.from({ length: p === "origami" ? n : m }, (_, c) =>
            p === "origami"
              ? ((r * 37 + c * 19) % 100) + 1
              : ((r * 17 + c * 7) % 41) - 20,
          ),
        );
        cases.push({
          rows: n,
          cols: p === "origami" ? n : m,
          parts: p === "origami" ? m : 1,
          cells,
        });
      }
    if (p === "coloring")
      cases.push({
        rows: 5,
        cols: 5,
        parts: 1,
        cells: Array.from({ length: 5 }, () => Array<number>(5).fill(0)),
      });
    const input = [
      cases.length,
      ...cases.flatMap((t) => [
        `${t.rows} ${p === "origami" ? t.parts : t.cols}`,
        ...t.cells.map((row) => row.join(" ")),
      ]),
    ].join("\n");
    const expected = cases
      .map((t, i) => `#${i + 1} ${referenceAnswer(t, p)}`)
      .join("\n");
    for (const m of PROBLEMS[p].methods) {
      const replay = cases
        .map((t, i) => `#${i + 1} ${solveProblem(t, p, m).answer}`)
        .join("\n");
      if (replay !== expected) throw new Error(`${p}/${m} replay mismatch`);
      writeFileSync(join(dir, "Main.java"), problemSource(p, m).text);
      execFileSync(process.env.JAVAC ?? "javac", [
        "-encoding",
        "UTF-8",
        "-d",
        dir,
        join(dir, "Main.java"),
      ]);
      for (const file of [false, true]) {
        writeFileSync(join(dir, "input.txt"), input);
        const actual = execFileSync(
          process.env.JAVA ?? "java",
          [
            "-Dfile.encoding=UTF-8",
            "-cp",
            dir,
            "Main",
            ...(file ? [join(dir, "input.txt")] : []),
          ],
          { input: file ? undefined : input, encoding: "utf8" },
        ).trim();
        if (actual !== expected)
          throw new Error(`${p}/${m} Java mismatch: ${actual}`);
      }
      count++;
      console.log(
        `✓ ${p}/${m}: ${cases.length} cases · Java System.in + file + replay match independent oracle`,
      );
    }
  }
  console.log(
    `${count} complete Java solutions verified, including all 7 supplied PDF inputs and maximum dimensions.`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
