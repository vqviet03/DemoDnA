import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  TREE_PROBLEMS,
  type TreeProblem,
  type TreeCase,
} from "../src/problems/tree/types";
import {
  TREE_SAMPLES,
  parseTreeInput,
  treeReference,
  treeOutput,
  serializeTreeCases,
} from "../src/problems/tree/input";
import { treeSource } from "../src/problems/tree/source";
import { solveTree } from "../src/problems/tree/execute";
const dir = mkdtempSync(join(tmpdir(), "tree-pdf-java-"));
let checked = 0;
try {
  for (const problem of ["leaves", "depth"] as TreeProblem[]) {
    const tests: TreeCase[] = [
      ...parseTreeInput(TREE_SAMPLES[problem].input, problem),
      { n: 1, edges: [], queries: problem === "depth" ? [1, 1, 1] : [] },
      {
        n: 5,
        edges: [
          [5, 2],
          [1, 5],
          [3, 4],
          [5, 3],
        ],
        queries: problem === "depth" ? [4, 1, 2, 5, 4] : [],
      },
    ];
    for (const kind of ["chain", "star"]) {
      const n = 10000;
      tests.push({
        n,
        edges: Array.from(
          { length: n - 1 },
          (_, i) => [kind === "chain" ? i + 1 : 1, i + 2] as const,
        ).reverse(),
        queries: problem === "depth" ? [10000, 1, 5000, 10000] : [],
      });
    }
    const input = serializeTreeCases(tests, problem),
      expected = tests
        .map((t, i) => treeOutput(i, treeReference(t, problem)))
        .join("\n");
    for (const method of TREE_PROBLEMS[problem].methods) {
      if (
        tests
          .map((t, i) => treeOutput(i, solveTree(t, problem, method).values))
          .join("\n") !== expected
      )
        throw Error("Simulator mismatch");
      writeFileSync(join(dir, "Main.java"), treeSource(problem, method).text);
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
          throw Error(`${problem}/${method}: Java stdout mismatch`);
      }
      console.log(
        `✓ ${problem}/${method} · ${tests.length} tests · PDF + N=1 + shuffled labels + N=10000 chain/star · System.in + file`,
      );
      checked++;
    }
  }
  console.log(`Verified ${checked} complete Java programs.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
