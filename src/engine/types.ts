export type Structure =
  "array" | "linked" | "stack" | "queue" | "tree" | "graph";
export type Variable =
  string | number | boolean | null | readonly (string | number)[];
export interface Item {
  readonly id: string;
  readonly value: number | string;
  readonly slot: number;
}
export interface DataVersion {
  readonly generation?: number;
}
export interface ArrayState extends DataVersion {
  readonly kind: "array";
  readonly slots: readonly (number | null)[];
  readonly items: readonly Item[];
  readonly size: number;
  readonly target: number;
  readonly oldSlots?: readonly (number | null)[];
  readonly copying?: boolean;
}
export interface LinkNode {
  readonly id: string;
  readonly value: number;
  readonly next: string | null;
  readonly slot: number;
  readonly floating?: boolean;
}
export interface LinkedState extends DataVersion {
  readonly kind: "linked";
  readonly nodes: readonly LinkNode[];
  readonly head: string | null;
  readonly tail: string | null;
}
export interface StackState extends DataVersion {
  readonly kind: "stack";
  readonly items: readonly Item[];
  readonly editor: readonly string[];
  readonly removed?: Item;
}
export interface QueueState extends DataVersion {
  readonly kind: "queue";
  readonly items: readonly Item[];
  readonly processing: Item | null;
  readonly completed: readonly Item[];
  readonly worker: "idle" | "processing" | "done";
}
export interface TreeNode {
  readonly id: string;
  readonly key: number;
  readonly lesson: string;
  readonly left: string | null;
  readonly right: string | null;
}
export interface TreeState extends DataVersion {
  readonly kind: "tree";
  readonly nodes: readonly TreeNode[];
  readonly root: string | null;
  readonly path: readonly string[];
  readonly output: readonly number[];
  readonly frontier: readonly string[];
  readonly found: string | null;
  readonly target: number;
}
export interface Edge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}
export interface GraphState extends DataVersion {
  readonly kind: "graph";
  readonly nodes: readonly string[];
  readonly edges: readonly Edge[];
  readonly degrees: Readonly<Record<string, number>>;
  readonly ready: readonly string[];
  readonly order: readonly string[];
  readonly current: string | null;
  readonly processedEdges: readonly string[];
  readonly cycle: boolean;
  readonly algorithm?: "load" | "dfs" | "bfs";
  readonly representation?: "list" | "matrix";
  readonly visited?: readonly string[];
  readonly parents?: Readonly<Record<string, string | null>>;
  readonly path?: readonly string[];
  readonly stack?: readonly string[];
  readonly returning?: boolean;
  readonly loaded?: readonly string[];
  readonly inputEdges?: readonly Edge[];
  readonly goal?: string;
  readonly activeCell?: readonly [string, string];
}
export type Scene =
  ArrayState | LinkedState | StackState | QueueState | TreeState | GraphState;
export interface AnimationInstruction {
  readonly kind:
    "move" | "copy" | "insert" | "remove" | "reference" | "visit" | "edge";
  readonly ids: readonly string[];
  readonly from?: number;
  readonly to?: number;
}
export interface DebugStep {
  readonly id: string;
  readonly source?: JavaSource;
  readonly segment?: number;
  readonly operationLabel?: string;
  readonly title: string;
  readonly description: string;
  readonly explanation: string;
  readonly activeLines: readonly number[];
  readonly variables: Readonly<Record<string, Variable>>;
  readonly state: Scene;
  readonly focus: readonly string[];
  readonly animations: readonly AnimationInstruction[];
  readonly console: readonly string[];
  readonly callStack: readonly string[];
}
export interface JavaSource {
  readonly text: string;
  readonly markers: Readonly<Record<string, number>>;
}
export interface LessonRun {
  readonly key: string;
  readonly code: JavaSource;
  readonly steps: readonly DebugStep[];
  readonly complexity: string;
  readonly operation: string;
  readonly expectedOutput?: string;
}

export interface OperationRequest {
  readonly operation: string;
  readonly at: number;
  readonly value: number;
  readonly text?: string;
  readonly input?: string;
  readonly representation?: "list" | "matrix";
  readonly start?: string;
  readonly goal?: string;
}
