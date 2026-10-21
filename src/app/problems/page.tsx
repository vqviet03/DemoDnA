import type { Metadata } from "next";
import ProblemsHome from "@/components/problems/ProblemsHome";
import "../grid/grid.css";
import "./problems.css";
import "./tree-problems.css";
export const metadata: Metadata = {
  title: "Bài tập PDF · Ma trận, Origami & Cây | Structure Lab",
  description:
    "Mười bốn cách giải Java: tô màu, Origami, đếm nút lá và độ sâu cây; debugger từng lệnh và kiểm tra testcase gốc.",
};
export default function ProblemsPage() {
  return <ProblemsHome />;
}
