"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  initialPlayback,
  transition,
  type PlaybackAction,
} from "@/engine/playback";
export function usePlayback(
  count: number,
  startIndex = 0,
  durations?: readonly number[],
) {
  const [state, dispatch] = useReducer(
    (s: typeof initialPlayback, a: PlaybackAction) => transition(s, a, count),
    { ...initialPlayback, index: Math.min(count - 1, Math.max(0, startIndex)) },
  );
  const [epoch, setEpoch] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const durationMs = reduced
    ? 0
    : (durations?.[state.index] ?? 520) / state.speed;
  const act = useCallback(
    (a: PlaybackAction) => {
      if (
        a.type === "seek" ||
        a.type === "restart" ||
        a.type === "pause" ||
        (a.type === "toggle" && state.playing)
      )
        setEpoch((e) => e + 1);
      if (a.type === "toggle" && state.playing) dispatch({ type: "pause" });
      else dispatch(a);
    },
    [state.playing],
  );
  useEffect(() => {
    if (!state.animating) return;
    const timer = setTimeout(
      () => dispatch({ type: "settled" }),
      durationMs + 40,
    );
    return () => clearTimeout(timer);
  }, [state.animating, state.index, durationMs]);
  useEffect(() => {
    if (!state.playing || state.animating) return;
    const timer = setTimeout(
      () => dispatch({ type: "next" }),
      750 / state.speed,
    );
    return () => clearTimeout(timer);
  }, [state.playing, state.animating, state.index, state.speed]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) act({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [act]);
  return {
    state,
    act,
    epoch,
    duration: durationMs / 1000,
    reduced,
  };
}
