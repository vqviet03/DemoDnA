import type {
  AnimationInstruction,
  DebugStep,
  JavaSource,
  Scene,
  Variable,
} from "./types";
export function java(source: string): JavaSource {
  const markers: Record<string, number> = {};
  const lines = source
    .trim()
    .split("\n")
    .map((line, index) => {
      const marker = line.match(/\s*\/\/ @([\w-]+)\s*$/);
      if (marker) markers[marker[1]] = index + 1;
      return line.replace(/\s*\/\/ @[\w-]+\s*$/, "");
    });
  return { text: lines.join("\n"), markers };
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
export function recorder(
  code: JavaSource,
  callStack: readonly string[] = ["main(String[] args)"],
) {
  const steps: DebugStep[] = [];
  let output: string[] = [];
  return {
    steps,
    add(
      state: Scene,
      marker: string,
      title: string,
      description: string,
      variables: Record<string, Variable>,
      focus: readonly string[] = [],
      animations: readonly AnimationInstruction[] = [],
      consoleLine?: string,
      explanation = description,
      stack: readonly string[] = callStack,
    ) {
      const line = code.markers[marker];
      if (!line) throw new Error(`Unknown Java marker: ${marker}`);
      if (consoleLine !== undefined) output = [...output, consoleLine];
      steps.push(
        freeze(
          structuredClone({
            id: `step-${steps.length}`,
            title,
            description,
            explanation,
            activeLines: [line],
            variables,
            state,
            focus,
            animations,
            console: output,
            callStack: stack,
          }),
        ),
      );
    },
  };
}
