"use client";
import type { DebugStep } from "@/engine/types";
import { ArrayVisualizer } from "./ArrayVisualizer";
import { LinkedListVisualizer } from "./LinkedListVisualizer";
import { StackVisualizer } from "./StackVisualizer";
import { QueueVisualizer } from "./QueueVisualizer";
import { TreeVisualizer } from "./TreeVisualizer";
import { GraphVisualizer } from "./GraphVisualizer";
export function SceneRenderer({ step }: { step: DebugStep }) {
  const state = step.state;
  switch (state.kind) {
    case "array":
      return <ArrayVisualizer state={state} step={step} />;
    case "linked":
      return <LinkedListVisualizer state={state} step={step} />;
    case "stack":
      return <StackVisualizer state={state} step={step} />;
    case "queue":
      return <QueueVisualizer state={state} step={step} />;
    case "tree":
      return <TreeVisualizer state={state} step={step} />;
    case "graph":
      return <GraphVisualizer state={state} step={step} />;
  }
}
