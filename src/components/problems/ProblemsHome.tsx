"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import ProblemsLab from "./ProblemsLab";
import type { AppProblem } from "./ProblemsTabs";
const TreeProblemsLab = dynamic(() => import("./tree/TreeProblemsLab"), {
  loading: () => <div className="gl-loading">Đang mở bài cây…</div>,
});
const hashes: Record<AppProblem, string> = {
  origami: "origami",
  coloring: "to-mau",
  leaves: "bai-9",
  depth: "bai-10",
};
export default function ProblemsHome() {
  const [problem, setProblem] = useState<AppProblem>("origami");
  useEffect(() => {
    const read = () => {
      const id = location.hash.slice(1);
      const entry = (Object.entries(hashes) as [AppProblem, string][]).find(
        ([, value]) => value === id,
      );
      if (entry) setProblem(entry[0]);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function select(p: AppProblem) {
    setProblem(p);
    history.replaceState(null, "", `#${hashes[p]}`);
  }
  return problem === "leaves" || problem === "depth" ? (
    <TreeProblemsLab key={problem} problem={problem} onSelect={select} />
  ) : (
    <ProblemsLab key={problem} initialProblem={problem} onSelect={select} />
  );
}
