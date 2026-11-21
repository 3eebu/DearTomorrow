import type { JourneyPoint } from './journey-letters';

type XY = { x: number; y: number };
const width = 720;
const height = 332;

export function journeyRoute(from: JourneyPoint | null, to: JourneyPoint | null) {
  const lonDelta = from && to ? ((to.lon - from.lon + 540) % 360) - 180 : 0;
  const latDelta = from && to ? to.lat - from.lat : 0;
  const geographic = !!(from && to && Math.abs(lonDelta) + Math.abs(latDelta) > .02);
  const zoom = geographic ? Math.min(480 / Math.max(7,Math.abs(lonDelta)), 126 / Math.max(2,Math.abs(latDelta))) : 2.72;
  const midLon = geographic && from ? from.lon + lonDelta/2 : 20;
  const midLat = geographic && from ? from.lat + latDelta/2 : 19;
  const mapX = width/2 - (midLon+180)*zoom;
  const mapY = 188 - (90-midLat)*zoom;
  const a = geographic ? { x: 360-lonDelta*zoom/2, y: 188+latDelta*zoom/2 } : { x: 104,y: 216 };
  const b = geographic ? { x: 360+lonDelta*zoom/2, y: 188-latDelta*zoom/2 } : { x: 616,y: 175 };
  const vertical = Math.abs(a.x-b.x) < 90;
  const c = vertical
    ? {x: (a.x+b.x)/2+170, y: (a.y+b.y)/2-64}
    : {x: (a.x+b.x)/2, y: Math.min(a.y,b.y)-Math.min(145,90+Math.abs(a.x-b.x)*.105)};
  const path = `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
  function point(t: number): XY {
    const remaining = 1-t;
    return {x:remaining**2*a.x+2*remaining*t*c.x+t**2*b.x, y:remaining**2*a.y+2*remaining*t*c.y+t**2*b.y};
  }
  const segments = 80;
  const distances = [0];
  for (let n=1;n<=segments;n++) {
    const last=point((n-1)/segments), next=point(n/segments);
    distances.push(distances[n-1]+Math.hypot(next.x-last.x,next.y-last.y));
  }
  function at(progress: number) {
    const goal = Math.max(0,Math.min(1,progress))*distances[segments];
    const right = distances.findIndex(length => length >= goal);
    const t = right <= 0 ? 0 : (right-1+(goal-distances[right-1])/(distances[right]-distances[right-1]))/segments;
    const {x,y} = point(t);
    const heading = Math.atan2((1-t)*(c.y-a.y)+t*(b.y-c.y), (1-t)*(c.x-a.x)+t*(b.x-c.x)) * 180 / Math.PI;
    return {x,y,heading};
  }
  return { width,height, path, at, a,b, geographic, mapX,mapY,scale:zoom/2, span:distances[segments] };
}
