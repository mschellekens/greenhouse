/** Move one item from index `from` to index `to`, returning a new array. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length) return out;
  const clamped = Math.max(0, Math.min(out.length - 1, to));
  const [x] = out.splice(from, 1);
  out.splice(clamped, 0, x);
  return out;
}

/**
 * Index the dragged item should land on, given the pointer's Y and the
 * vertical midpoints of the rows (in the current, un-reordered layout).
 */
export function dropIndex(pointerY: number, midpoints: readonly number[], from: number): number {
  let i = 0;
  for (const m of midpoints) if (pointerY > m) i++;
  // rows after the dragged one shift up by one when it is lifted out
  return i > from ? i - 1 : i;
}
