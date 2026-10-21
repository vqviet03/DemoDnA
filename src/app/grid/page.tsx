import type { Metadata } from "next";
import GridLab from "@/components/grid/GridLab";
import "./grid.css";
export const metadata: Metadata = {
  title: "Grid Lab · Java Visual Debug | Structure Lab",
  description:
    "Duyệt mảng, ma trận, BFS và DFS trên grid; Java từng lệnh, nhiều test case và bộ nhớ trực quan.",
};
export default function GridPage() {
  return <GridLab />;
}
