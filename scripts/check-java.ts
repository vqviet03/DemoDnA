import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRun, LESSONS } from "../src/data/lessons";
const dir = mkdtempSync(join(tmpdir(), "structure-java-"));
const javac = process.env.JAVAC ?? "javac",
  java = process.env.JAVA ?? "java";
import { arrayRun } from "../src/algorithms/array";
import { linkedRun } from "../src/algorithms/linked";
import { stackRun, queueRun } from "../src/algorithms/stack-queue";
import { treeRun } from "../src/algorithms/tree";
import { traversalRun, parseGraphInput } from "../src/algorithms/graph";
import { appendOperations, newSession } from "../src/engine/session";
import type { LessonRun, Scene } from "../src/engine/types";
let checked = 0;
const final = (run: LessonRun): Scene => run.steps.at(-1)!.state;
function verify(label: string, code: string, expected?: string) {
  const file = join(dir, "Demo.java");
  writeFileSync(file, code, "utf8");
  execFileSync(javac, ["-encoding", "UTF-8", "-d", dir, file], {
    stdio: "pipe",
  });
  const actual = execFileSync(
    java,
    ["-Dfile.encoding=UTF-8", "-cp", dir, "Demo"],
    { encoding: "utf8" },
  ).trim();
  if (actual !== expected?.trim())
    throw new Error(`${label}\nExpected: ${expected}\nActual: ${actual}`);
  checked++;
  process.stdout.write(`✓ ${label}\n`);
}
try {
  for (const lesson of LESSONS)
    for (const op of lesson.operations) {
      const run = createRun(lesson.id, op.id);
      verify(`${lesson.id}/${op.id}`, run.code.text, run.expectedOutput);
    }
  for (const structure of [
    "array",
    "linked",
    "stack",
    "queue",
    "tree",
    "graph",
  ] as const) {
    const operations =
      structure === "array"
        ? ["insert", "remove", "get"]
        : structure === "linked"
          ? ["removeAfter", "addFirst", "traversal"]
          : structure === "stack"
            ? ["pop", "pop", "push"]
            : structure === "queue"
              ? ["poll", "poll", "offer"]
              : structure === "tree"
                ? ["insert", "delete", "inorder"]
                : ["load", "dfs", "bfs"];
    const session = appendOperations(
      structure,
      newSession(structure),
      operations.map((operation) => ({
        operation,
        at: structure === "linked" ? 48 : 5,
        value: structure === "tree" ? 50 : 49,
        representation: "matrix",
      })),
    );
    for (const [i, segment] of session.segments.slice(1).entries())
      verify(
        `chain/${structure}/${i + 1}`,
        segment.code.text,
        segment.expectedOutput,
      );
  }
  const full = final(arrayRun("resize"));
  if (full.kind !== "array") throw Error();
  for (const op of ["add", "insert"] as const) {
    const run = arrayRun(op, 3, 123, {
      ...full,
      slots: full.slots.slice(0, full.size),
    });
    verify(`full-array/${op}`, run.code.text, run.expectedOutput);
  }
  const emptyStack = { kind: "stack" as const, items: [], editor: [] };
  for (const op of ["pop", "peek", "isEmpty", "push"] as const) {
    const run = stackRun(op, emptyStack);
    verify(`empty-stack/${op}`, run.code.text, run.expectedOutput);
  }
  const emptyQueue = {
    kind: "queue" as const,
    items: [],
    completed: [],
    processing: null,
    worker: "idle" as const,
  };
  for (const op of ["poll", "peek", "isEmpty", "offer"] as const) {
    const run = queueRun(op, emptyQueue);
    verify(`empty-queue/${op}`, run.code.text, run.expectedOutput);
  }
  const tiny = final(treeRun("build", undefined, undefined, [10, 5, 15, 12]));
  if (tiny.kind !== "tree") throw Error();
  for (const key of [10, 5, 15, 999]) {
    const run = treeRun("delete", key, tiny);
    verify(`tree-delete/${key}`, run.code.text, run.expectedOutput);
  }
  const input = parseGraphInput("A>B, A>C, B>D, C>D, D>A, Isolated");
  for (const rep of ["list", "matrix"] as const) {
    const seed = final(traversalRun("load", undefined, rep, input));
    if (seed.kind !== "graph") throw Error();
    for (const op of ["load", "dfs", "bfs"] as const) {
      const run = traversalRun(op, seed, rep, input, "A", "D");
      verify(`custom-graph/${rep}/${op}`, run.code.text, run.expectedOutput);
    }
    const run = traversalRun("bfs", seed, rep, input, "A", "Isolated");
    verify(`unreachable/${rep}`, run.code.text, run.expectedOutput);
  }
  process.stdout.write(`Compiled and verified ${checked} Java programs.\n`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
