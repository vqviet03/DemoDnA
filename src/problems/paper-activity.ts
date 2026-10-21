import type { ProblemCase, ProblemRun, ProblemStep } from "./types";
export interface PaperVisit {
  readonly r: number;
  readonly c: number;
  readonly block: number;
  readonly role: "read" | "stack" | "context";
}
export interface PaperActivity {
  readonly kind: "read" | "stack" | "write" | "position";
  readonly label: string;
  readonly value: number | null;
  readonly cells: readonly PaperVisit[];
}
export function projectedPaperColumn(
  column: number,
  width: number,
  anchor: number,
): number {
  const block = Math.floor(column / width),
    local = column % width;
  return block < anchor
    ? column
    : anchor * width + ((block - anchor) % 2 ? width - 1 - local : local);
}
export function paperContributors(
  test: ProblemCase,
  anchor: number,
  r: number,
  dest: number,
  firstBlock = anchor,
): readonly PaperVisit[] {
  const width = test.cols / test.parts;
  return Array.from({ length: test.parts - firstBlock }, (_, i) => {
    const block = firstBlock + i;
    return {
      r,
      c: block * width + ((block - anchor) % 2 ? width - 1 - dest : dest),
      block,
      role: "stack" as const,
    };
  });
}
/** Derived from the SAME debug snapshot. Origin highlights are provenance, not extra array reads. */
export function paperActivity(
  run: ProblemRun,
  step: ProblemStep,
): PaperActivity | null {
  const test = run.test,
    width = test.cols / test.parts;
  const single = (
    kind: PaperActivity["kind"],
    label: string,
    value: number | null,
  ): PaperActivity | null =>
    step.current
      ? {
          kind,
          label,
          value,
          cells: [
            {
              r: step.current[0],
              c: step.current[1],
              block: Math.floor(step.current[1] / width),
              role: kind === "position" ? "context" : "read",
            },
          ],
        }
      : null;
  if (step.phase === "input")
    return single(
      step.marker === "read" ? "read" : "position",
      step.marker === "read" ? "Input → a[r][c]" : "Vị trí đang nạp input",
      step.marker === "read" && step.current
        ? test.cells[step.current[0]][step.current[1]]
        : null,
    );
  if (step.target && ["maxCol", "best"].includes(step.marker)) {
    const [r, c] = step.target;
    return {
      kind: "stack",
      label: `Đọc result[${r}][${c}] · các ô đã góp tổng`,
      value: step.results[r][c],
      cells: paperContributors(test, 0, r, c),
    };
  }
  if (
    run.method === "fold" &&
    step.target &&
    step.scopes.foldLeft &&
    ["foldCol", "mirrored", "leftValue", "rightValue", "foldAdd"].includes(
      step.marker,
    )
  ) {
    const [r, c] = step.target,
      block = Number(step.scopes.foldLeft.block.value);
    const left: PaperVisit = { r, c: block * width + c, block, role: "read" };
    if (step.marker === "leftValue")
      return {
        kind: "read",
        label: `Đọc a[${r}][${left.c}] · dải D${block}`,
        value: test.cells[r][left.c],
        cells: [left],
      };
    if (step.marker === "rightValue")
      return {
        kind: "stack",
        label: `Đọc current[${r}][${width - 1 - c}] · một ô tổng, nhiều lớp góp số`,
        value: Number(step.scopes.foldLeft.right.value),
        cells: paperContributors(test, block, r, c, block + 1),
      };
    return {
      kind: step.marker === "foldAdd" ? "write" : "position",
      label:
        step.marker === "foldAdd"
          ? `left + right → next[${r}][${c}]`
          : `Định vị next[${r}][${c}] · chưa đọc các số này`,
      value: step.marker === "foldAdd" ? step.results[r][c] : null,
      cells: [
        { ...left, role: "context" },
        ...paperContributors(test, block, r, c, block + 1),
      ],
    };
  }
  if (step.current) {
    const [r, c] = step.current;
    const reading = ["copy", "accumulate", "layerAdd"].includes(step.marker);
    return single(
      reading ? "read" : "position",
      reading
        ? step.marker === "copy"
          ? `a[${r}][${c}] → current[${r}][${step.target?.[1]}]`
          : `a[${r}][${c}] → result[${r}][${step.target?.[1]}]`
        : `Định vị ô nguồn a[${r}][${c}]`,
      reading ? test.cells[r][c] : null,
    );
  }
  return null;
}
