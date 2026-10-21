"use client";
import type { ProblemId } from "@/problems/types";
import type { TreeProblem } from "@/problems/tree/types";
export type AppProblem = ProblemId | TreeProblem;
export function ProblemsTabs({
  selected,
  onSelect,
}: {
  selected: AppProblem;
  onSelect: (p: AppProblem) => void;
}) {
  return (
    <nav className="pl-problem-tabs" aria-label="Bài tập PDF">
      {(
        [
          ["coloring", "01 · Tô màu ô"],
          ["origami", "02 · Origami"],
          ["leaves", "09 · Đếm nút lá"],
          ["depth", "10 · Độ sâu nút"],
        ] as const
      ).map(([id, title]) => (
        <button
          key={id}
          aria-pressed={selected === id}
          onClick={() => onSelect(id)}
        >
          {title}
        </button>
      ))}
    </nav>
  );
}
