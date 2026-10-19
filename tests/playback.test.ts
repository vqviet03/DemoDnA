import { expect, it } from "vitest";
import { initialPlayback, motionDuration, transition } from "@/engine/playback";
it("Previous then Next returns the exact same snapshot index", () => {
  let s = transition(initialPlayback, { type: "seek", index: 7 }, 15);
  s = transition(s, { type: "previous" }, 15);
  s = transition(s, { type: "settled" }, 15);
  s = transition(s, { type: "next" }, 15);
  expect(s.index).toBe(7);
});
it("blocks rapid steps until motion settles", () => {
  const next = transition(initialPlayback, { type: "next" }, 8);
  expect(next.animating).toBe(true);
  expect(transition(next, { type: "next" }, 8)).toBe(next);
  expect(transition(next, { type: "previous" }, 8)).toBe(next);
});
it("seeking cancels playback and stale motion", () => {
  let s = transition(initialPlayback, { type: "toggle" }, 10);
  s = transition(s, { type: "next" }, 10);
  s = transition(s, { type: "seek", index: 6 }, 10);
  expect(s).toMatchObject({ index: 6, playing: false, animating: false });
  expect(transition(s, { type: "settled" }, 10)).toEqual(s);
});
it("stops autoplay at end and clamps the timeline", () => {
  let s = transition(initialPlayback, { type: "seek", index: 8 }, 10);
  s = transition(s, { type: "toggle" }, 10);
  s = transition(s, { type: "next" }, 10);
  expect(s.index).toBe(9);
  expect(s.playing).toBe(false);
  expect(transition(s, { type: "seek", index: 999 }, 10).index).toBe(9);
  expect(transition(s, { type: "seek", index: -3 }, 10).index).toBe(0);
});
it("restart preserves speed and pause cancels motion", () => {
  let s = transition(initialPlayback, { type: "speed", speed: 2 }, 10);
  s = transition(s, { type: "next" }, 10);
  expect(transition(s, { type: "pause" }, 10).animating).toBe(false);
  expect(transition(s, { type: "restart" }, 10)).toEqual({
    ...initialPlayback,
    speed: 2,
  });
  expect(motionDuration(2)).toBe(260);
  expect(motionDuration(1, true)).toBe(0);
});
