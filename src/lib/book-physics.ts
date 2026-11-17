// A ruled paper surface: the arc length is fixed, the binding stays pinned,
// and the free edge trails the binding before catching up at either endpoint.
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const motionDuration = (reduced: boolean, duration: number) => reduced ? 0 : duration;
export function paperSurface(progress: number, count: number, corner: number, singleBack = false) {
  const p = clamp(progress), lift = Math.sin(Math.PI * p);
  const angles = Array.from({ length: count }, (_, i) => {
    const u = (i + .5) / count;
    return -Math.PI * p + lift * (.95 * (2 * u - 1) + corner * .13 * u);
  });
  const dx = angles.map(a => Math.cos(a) / count);
  const dz = angles.map(a => -Math.sin(a) / count);
  let x = singleBack ? 1 - dx.reduce((a, b) => a + b, 0) : 0;
  let z = singleBack ? dz.reduce((a, b) => a + b, 0) : 0;
  return angles.map((angle, i) => {
    const u = i / count;
    const result = { x, z, angle: singleBack ? -angle : angle,
      twist: lift * corner * .075 * u * u,
      shade: clamp(.055 + Math.abs(Math.sin(angle)) * .13 + lift * u * .035, 0, .25) };
    x += dx[i]; z += singleBack ? -dz[i] : dz[i];
    return result;
  });
}
export function lastSpread(pages: number, single: boolean) {
  return single ? pages - 1 : Math.ceil(pages / 2) * 2;
}
export function visiblePages(cursor: number, pages: number, single: boolean) {
  return (single ? [cursor] : [cursor - 1, cursor]).filter(i => i >= 0 && i < pages);
}
export function turnPages(cursor: number, direction: 1 | -1, single: boolean) {
  if (single) return { front: cursor, back: cursor + direction, under: cursor + direction };
  return direction === 1 ? { front: cursor, back: cursor + 1, under: cursor + 2 }
    : { front: cursor - 2, back: cursor - 1, under: cursor - 3 };
}
export function releaseTurn(travel: number, velocity: number, age: number, cancel: boolean) {
  return !cancel && (travel > .48 || (age < 120 && velocity > .45));
}
