/** Math of the photo lightbox, kept apart from the gestures so it can be tested. */

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
/** Smallest zoom a double tap goes to, so a small photo still visibly zooms. */
const MIN_DOUBLE_TAP_SCALE = 2;
const MAX_DOUBLE_TAP_SCALE = 5;

export type Size = { width: number; height: number };

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** The photo as drawn at scale 1 inside the view: as large as fits, keeping its shape. */
export function fitSize(natural: Size | null, view: Size): Size {
  'worklet';
  if (!natural || natural.width <= 0 || natural.height <= 0) return view;
  const ratio = Math.min(view.width / natural.width, view.height / natural.height);
  return { width: natural.width * ratio, height: natural.height * ratio };
}

/**
 * How far the photo may be moved from the centre at `scale` before an edge leaves its side of the
 * view. Zero when the zoomed photo is still smaller than the view along that axis.
 */
export function maxOffset(fitted: Size, view: Size, scale: number): { x: number; y: number } {
  'worklet';
  return {
    x: Math.max(0, (fitted.width * scale - view.width) / 2),
    y: Math.max(0, (fitted.height * scale - view.height) / 2),
  };
}

/**
 * The scale of a double tap: "actual size", where one pixel of the photo is one point of the
 * screen, but never less than 2 (a small photo would barely move) or more than 5.
 */
export function actualSizeScale(natural: Size | null, fitted: Size, density = 1): number {
  'worklet';
  if (!natural || fitted.width <= 0) return 2.5;
  const actual = natural.width / density / fitted.width;
  return clamp(actual, MIN_DOUBLE_TAP_SCALE, MAX_DOUBLE_TAP_SCALE);
}

/**
 * The offset that keeps the point under the fingers where it is while the scale changes from
 * `from` to `to`. `focal` and `offset` are measured from the centre of the view.
 */
export function offsetAfterZoom(
  focal: { x: number; y: number },
  offset: { x: number; y: number },
  from: number,
  to: number
): { x: number; y: number } {
  'worklet';
  const ratio = to / from;
  return {
    x: focal.x - (focal.x - offset.x) * ratio,
    y: focal.y - (focal.y - offset.y) * ratio,
  };
}
