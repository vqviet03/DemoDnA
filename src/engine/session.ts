import { createRun, LESSONS } from "@/data/lessons";
import { freeze } from "./steps";
import type { LessonRun, OperationRequest, Structure } from "./types";
export interface Session {
  readonly run: LessonRun;
  readonly segments: readonly {
    label: string;
    complexity: string;
    start: number;
    end: number;
    code: LessonRun["code"];
    expectedOutput?: string;
  }[];
  readonly startIndex: number;
  readonly revision: number;
}
export function newSession(structure: Structure): Session {
  const run = createRun(
    structure,
    LESSONS.find((l) => l.id === structure)!.operations[0].id,
  );
  return freeze({
    run,
    segments: [
      {
        label: run.operation,
        complexity: run.complexity,
        start: 0,
        end: run.steps.length - 1,
        code: run.code,
        expectedOutput: run.expectedOutput,
      },
    ],
    startIndex: 0,
    revision: 0,
  });
}
export function appendOperations(
  structure: Structure,
  session: Session,
  requests: readonly OperationRequest[],
): Session {
  if (!requests.length || requests.length > 3)
    throw new RangeError("Mỗi lần nối cần 1–3 thao tác.");
  let steps = [...session.run.steps],
    seed = steps.at(-1)!.state;
  const segments = [...session.segments];
  for (const request of requests) {
    const lesson = LESSONS.find((l) => l.id === structure)!;
    if (!lesson.operations.some((op) => op.id === request.operation))
      throw new RangeError("Operation không thuộc cấu trúc này.");
    const run = createRun(
      structure,
      request.operation,
      request.at,
      request.value,
      seed,
      request,
    );
    const segment = segments.length,
      start = steps.length,
      previousConsole = steps.at(-1)!.console;
    const label = `${request.operation}${structure === "array" ? `(${request.operation === "add" ? request.value : request.at + (request.operation === "insert" ? ", " + request.value : "")})` : structure === "tree" && ["search", "insert", "delete"].includes(request.operation) ? `(${request.value})` : ""}`;
    steps = [
      ...steps,
      ...run.steps.map((step, i) => ({
        ...step,
        id: `step-${start + i}`,
        source: run.code,
        segment,
        operationLabel: label,
        console: [...previousConsole, ...step.console],
      })),
    ];
    seed = run.steps.at(-1)!.state;
    segments.push({
      label,
      complexity: run.complexity,
      start,
      end: steps.length - 1,
      code: run.code,
      expectedOutput: run.expectedOutput,
    });
  }
  return freeze({
    run: {
      ...session.run,
      key: `${structure}-session-${session.revision + 1}`,
      steps,
      operation: requests.at(-1)!.operation,
    },
    segments,
    startIndex: session.run.steps.length,
    revision: session.revision + 1,
  });
}
