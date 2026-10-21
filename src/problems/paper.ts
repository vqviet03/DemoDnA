/** Stable strip IDs, bottom to top. Alternate mountain/valley folds (accordion). */
export function layerOrder(parts: number, anchor: number): readonly number[] {
  let order = [parts - 1];
  for (let b = parts - 2; b >= anchor; b--) {
    const reversed = [...order].reverse();
    order = (parts - 1 - b) % 2 === 1 ? [b, ...reversed] : [...reversed, b];
  }
  return order;
}
export function mappedColumn(c: number, width: number): number {
  const block = Math.floor(c / width),
    local = c % width;
  return block % 2 ? width - 1 - local : local;
}
export function foldPose(parts: number, folded: number) {
  const anchor = parts - 1 - Math.max(0, Math.min(parts - 1, folded));
  const order = layerOrder(parts, anchor);
  return { anchor, order, anchorRank: order.indexOf(anchor) };
}
/** Keep the destination's original paper plane at z=0, including under-folds. */
export function foldMotion(
  parts: number,
  completed: number,
  thickness: number,
) {
  const pose = foldPose(parts, completed);
  const over = completed % 2 === 0;
  const count = parts - pose.anchor;
  return {
    over,
    angle: over ? -180 : 180,
    zEnd: (over ? count - pose.anchorRank : -pose.anchorRank - 1) * thickness,
  };
}
