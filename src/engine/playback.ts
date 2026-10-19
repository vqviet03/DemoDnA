export interface Playback {
  readonly index: number;
  readonly playing: boolean;
  readonly speed: number;
  readonly animating: boolean;
}
export type PlaybackAction =
  | { type: "next" | "previous" | "toggle" | "restart" | "pause" | "settled" }
  | { type: "seek"; index: number }
  | { type: "speed"; speed: number };
export const initialPlayback: Playback = {
  index: 0,
  playing: false,
  speed: 1,
  animating: false,
};
export const motionDuration = (speed: number, reduced = false) =>
  reduced ? 0 : 520 / speed;
export function transition(
  state: Playback,
  action: PlaybackAction,
  count: number,
): Playback {
  const last = Math.max(0, count - 1);
  if (action.type === "restart")
    return { ...initialPlayback, speed: state.speed };
  if (action.type === "settled") return { ...state, animating: false };
  if (action.type === "pause")
    return { ...state, playing: false, animating: false };
  if (action.type === "speed") return { ...state, speed: action.speed };
  if (action.type === "toggle")
    return { ...state, playing: state.index === last ? false : !state.playing };
  if (action.type === "seek")
    return {
      ...state,
      index: Math.max(0, Math.min(last, Math.round(action.index))),
      playing: false,
      animating: false,
    };
  if (state.animating) return state;
  const index = Math.max(
    0,
    Math.min(last, state.index + (action.type === "next" ? 1 : -1)),
  );
  return {
    ...state,
    index,
    animating: index !== state.index,
    playing: index === last ? false : state.playing,
  };
}
