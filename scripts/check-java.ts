import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRun, LESSONS } from "../src/data/lessons";
const dir = mkdtempSync(join(tmpdir(), "structure-java-"));
const javac = process.env.JAVAC ?? "javac",
  java = process.env.JAVA ?? "java";
let checked = 0;
try {
  for (const lesson of LESSONS)
    for (const op of lesson.operations) {
      const run = createRun(lesson.id, op.id);
      const file = join(dir, "Demo.java");
      writeFileSync(file, run.code.text, "utf8");
      execFileSync(javac, ["-encoding", "UTF-8", "-d", dir, file], {
        stdio: "pipe",
      });
      const result = execFileSync(
        java,
        ["-Dfile.encoding=UTF-8", "-cp", dir, "Demo"],
        { encoding: "utf8" },
      ).trim();
      if (result !== run.expectedOutput?.trim())
        throw new Error(
          `${lesson.id}/${op.id}\nExpected: ${run.expectedOutput}\nActual: ${result}`,
        );
      checked++;
      process.stdout.write(`✓ ${lesson.id}/${op.id}\n`);
    }
  process.stdout.write(`Compiled and verified ${checked} Java programs.\n`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
