import type { BookElement, DrawingStroke } from './memory-books';
export const constrain = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export type Size = { width: number; height: number };
export function strokeHit(e: BookElement, stroke: DrawingStroke, point: [number,number,number], page: Size, radius = 2) {
  const a=e.rotation*Math.PI/180, ratio=page.height/page.width;
  const points=stroke.points.map(([x,y])=>{const dx=(x/100-.5)*e.width,dy=(y/100-.5)*e.height*ratio;return {x:e.x+e.width/2+dx*Math.cos(a)-dy*Math.sin(a),y:(e.y+e.height/2)*ratio+dx*Math.sin(a)+dy*Math.cos(a)};});
  const px=point[0],py=point[1]*ratio;
  return points.some((p,i)=>{const next=points[i+1]||p,dx=next.x-p.x,dy=next.y-p.y,len=dx*dx+dy*dy,t=len?constrain(((px-p.x)*dx+(py-p.y)*dy)/len,0,1):0;return Math.hypot(px-p.x-t*dx,py-p.y-t*dy)<=radius;});
}
export function bounds(e: BookElement, page: Size) {
  const a = e.rotation * Math.PI / 180;
  const w = Math.abs(e.width * Math.cos(a)) + Math.abs(e.height * page.height / page.width * Math.sin(a));
  const h = Math.abs(e.height * Math.cos(a)) + Math.abs(e.width * page.width / page.height * Math.sin(a));
  return { x: e.x + (e.width - w) / 2, y: e.y + (e.height - h) / 2, width: w, height: h };
}
export function outside(e: BookElement, page: Size) {
  const b = bounds(e, page); return b.x < -.01 || b.y < -.01 || b.x + b.width > 100.01 || b.y + b.height > 100.01;
}
export function resizeObject(e: BookElement, dx: number, dy: number, handle: string, page: Size, lock = e.aspectLocked) {
  const sx = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
  const sy = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
  const a = e.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const oldW = e.width / 100 * page.width, oldH = e.height / 100 * page.height;
  const localX = dx * c + dy * s, localY = -dx * s + dy * c;
  let w = constrain(oldW + sx * localX, page.width / 100, page.width * 2);
  let h = constrain(oldH + sy * localY, page.height / 100, page.height * 2);
  if (lock) {
    const factor = sx && sy ? Math.abs(w / oldW - 1) > Math.abs(h / oldH - 1) ? w / oldW : h / oldH : sx ? w / oldW : h / oldH;
    const scale = constrain(factor, Math.max(page.width / 100 / oldW, page.height / 100 / oldH), Math.min(page.width * 2 / oldW, page.height * 2 / oldH));
    w = oldW * scale; h = oldH * scale;
  }
  const shiftX = (w - oldW) * sx / 2, shiftY = (h - oldH) * sy / 2;
  const cx = (e.x + e.width / 2) / 100 * page.width + shiftX * c - shiftY * s;
  const cy = (e.y + e.height / 2) / 100 * page.height + shiftX * s + shiftY * c;
  return { ...e, x: (cx - w / 2) / page.width * 100, y: (cy - h / 2) / page.height * 100, width: w / page.width * 100, height: h / page.height * 100 };
}
export function selectionBounds(elements: BookElement[]) {
  const x = Math.min(...elements.map(e => e.x)), y = Math.min(...elements.map(e => e.y));
  return { x, y, width: Math.max(...elements.map(e => e.x + e.width)) - x, height: Math.max(...elements.map(e => e.y + e.height)) - y };
}
export function transformSelection(elements: BookElement[], page: Size, scale: number, rotation: number) {
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(rotation)) throw new Error('Choose a valid scale and rotation.');
  if (!elements.length || elements.some(e => e.locked)) return elements;
  const boxes = elements.map(e => bounds(e, page));
  const cx = (Math.min(...boxes.map(b => b.x)) + Math.max(...boxes.map(b => b.x + b.width))) / 2;
  const cy = (Math.min(...boxes.map(b => b.y)) + Math.max(...boxes.map(b => b.y + b.height))) / 2;
  const angle = rotation * Math.PI / 180;
  const next = elements.map(e => {
    const x = (e.x + e.width / 2 - cx) * page.width, y = (e.y + e.height / 2 - cy) * page.height;
    const width = e.width * scale, height = e.height * scale;
    return { ...e, width, height, x: cx + (x * Math.cos(angle) - y * Math.sin(angle)) / page.width * scale - width / 2, y: cy + (x * Math.sin(angle) + y * Math.cos(angle)) / page.height * scale - height / 2, rotation: ((e.rotation + rotation + 540) % 360) - 180 };
  });
  if (next.some(e => e.width < 1 || e.height < 1 || e.width > 200 || e.height > 200 || e.x < -100 || e.y < -100 || e.x > 200 || e.y > 200)) throw new Error('That transformation exceeds the canvas limits. Try a smaller change. Your selection was kept.');
  return next;
}
export function alignObjects(items: BookElement[], selected: Set<string>, axis: 'x' | 'y', mode: 'start' | 'center' | 'end' | 'distribute', page: Size = {width:100,height:100}) {
  const picked = items.filter(e => selected.has(e.id) && !e.locked), size = axis === 'x' ? 'width' : 'height';
  if (!picked.length || (mode === 'distribute' && picked.length < 3)) return items;
  const boxes = new Map(picked.map(e => [e.id,bounds(e,page)]));
  const start = picked.length === 1 ? 0 : Math.min(...picked.map(e => boxes.get(e.id)![axis]));
  const end = picked.length === 1 ? 100 : Math.max(...picked.map(e => boxes.get(e.id)![axis] + boxes.get(e.id)![size]));
  const sorted = [...picked].sort((a, b) => boxes.get(a.id)![axis] - boxes.get(b.id)![axis]);
  const gap = (end - start - picked.reduce((n, e) => n + boxes.get(e.id)![size], 0)) / Math.max(1, picked.length - 1);
  let cursor = start;
  const positions = new Map(sorted.map(e => { const box=boxes.get(e.id)!; const pos = mode === 'distribute' ? cursor : mode === 'start' ? start : mode === 'end' ? end - box[size] : (start + end - box[size]) / 2; cursor += box[size] + gap; return [e.id, e[axis]+pos-box[axis]]; }));
  return items.map(e => positions.has(e.id) ? { ...e, [axis]: positions.get(e.id)! } : e);
}
export function snapPosition(e: BookElement, others: BookElement[], threshold = .7) {
  const guides: { x?: number; y?: number } = {}, result = { ...e };
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height';
    const targets = [0, 50, 100, ...others.filter(o => !o.hidden).flatMap(o => [o[axis], o[axis] + o[size] / 2, o[axis] + o[size]])];
    let best = threshold;
    for (const offset of [0, e[size] / 2, e[size]]) for (const target of targets) {
      const d = Math.abs(e[axis] + offset - target);
      if (d < best) { best = d; result[axis] = target - offset; guides[axis] = target; }
    }
  }
  return { element: result, guides };
}
