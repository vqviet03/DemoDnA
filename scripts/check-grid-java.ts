import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { PROBLEMS, type GridProblem } from "../src/grid/types";
import { generateGridRun } from "../src/grid/replay";
import {
  gridExample,
  serializeGridInput,
  referenceAnswer,
} from "../src/grid/input";
const directory = mkdtempSync(join(tmpdir(), "grid-java-"));
const javac = process.env.JAVAC ?? "javac",
  java = process.env.JAVA ?? "java";
let checked = 0;
try {
  for (const problem of Object.keys(PROBLEMS) as GridProblem[])
    for (const algorithm of PROBLEMS[problem].algorithms) {
      const cases = [
          ...gridExample(problem),
          {
            rows: 1,
            cols: 1,
            cells: [[0]],
            start: { r: 0, c: 0 },
            goal: { r: 0, c: 0 },
          },
          {
            rows: 1,
            cols: 4,
            cells: [problem === "islands" ? [1, 0, 1, 1] : [0, 0, 0, 0]],
            start: { r: 0, c: 0 },
            goal: { r: 0, c: 3 },
          },
          {
            rows: 3,
            cols: 1,
            cells: problem === "islands" ? [[1], [0], [1]] : [[0], [1], [0]],
            start: { r: 0, c: 0 },
            goal: { r: 2, c: 0 },
          },
        ],
        input = serializeGridInput(cases, problem),
        run = generateGridRun(input, problem, algorithm),
        expected = cases
          .map((c) => referenceAnswer(c, problem, algorithm))
          .join("\n");
      if (run.steps.at(-1)!.outputs.join("\n") !== expected)
        throw new Error("Replay mismatch");
      writeFileSync(join(directory, "Main.java"), run.code.text, "utf8");
      execFileSync(
        javac,
        ["-encoding", "UTF-8", "-d", directory, join(directory, "Main.java")],
        { stdio: "pipe" },
      );
      const actual = execFileSync(
        java,
        ["-Dfile.encoding=UTF-8", "-cp", directory, "Main"],
        { input, encoding: "utf8" },
      ).trim();
      if (actual !== expected)
        throw new Error(
          `${problem}/${algorithm}: expected ${expected}, got ${actual}`,
        );
      const file = join(directory, "input.txt");
      writeFileSync(file, input, "utf8");
      const fromFile = execFileSync(
        java,
        ["-Dfile.encoding=UTF-8", "-cp", directory, "Main", file],
        { encoding: "utf8" },
      ).trim();
      if (fromFile !== expected)
        throw new Error("File input differs from System.in");
      checked++;
      process.stdout.write(`✓ ${problem}/${algorithm} · System.in + file\n`);
    }
  process.stdout.write(
    `Verified ${checked} Grid Java programs against independent expected output.\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
