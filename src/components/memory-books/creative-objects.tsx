import type { BookElement, BookPage, DrawingStroke, MemoryBookDocument } from '@/lib/memory-books';
import type { CSSProperties } from 'react';

// Original code-drawn ornaments. Imported projects cannot supply SVG markup or paths.
export function CreativeGraphic({ element: e }: { element: BookElement }) {
  const common = { fill: e.fillNone ? 'none' : e.background, stroke: e.color, strokeWidth: e.strokeWidth ?? 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const heart = 'M50 86C39 75 10 56 10 34C10 9 41 6 50 28C59 6 90 9 90 34C90 56 61 75 50 86Z';
  const name = e.kind === 'shape' ? e.shape : e.sticker;
  return <svg viewBox="0 0 100 100" preserveAspectRatio={e.kind === 'shape' ? 'none' : 'xMidYMid meet'} width="100%" height="100%" aria-label={e.name || name || 'Decoration'} role="img" {...common}>
    {name === 'heart' && <path d={heart}/>}
    {name === 'rectangle' && <rect x="2" y="2" width="96" height="96" rx={e.radius ?? 0}/>}
    {name === 'ellipse' && <ellipse cx="50" cy="50" rx="48" ry="48"/>}
    {name === 'star' && <path d="m50 3 13 31 34 3-26 23 8 34-29-18-29 18 8-34L3 37l34-3Z"/>}
    {name === 'line' && <path d="M3 50H97" fill="none"/>}
    {name === 'arrow' && <path d="M3 50H94M75 30l20 20-20 20" fill="none"/>}
    {name === 'border' && <><rect x="3" y="3" width="94" height="94" rx={e.radius ?? 2} fill="none"/><rect x="7" y="7" width="86" height="86" rx={e.radius ?? 2} fill="none" strokeWidth=".4"/></>}
    {name === 'highlight' && <path d="m3 17 94-4-2 73-92-3Z" stroke="none"/>}
    {name === 'bow' && <><path d="M48 48C16 4-9 18 15 48c8 9 23 8 33 0Zm4 0C84 4 109 18 85 48c-8 9-23 8-33 0ZM48 52 32 92l-3-13-12 3 29-33M52 52l16 40 3-13 12 3-29-33"/><ellipse cx="50" cy="49" rx="7" ry="9"/></>}
    {name === 'branch' && <g fill="none"><path d="M25 94Q49 62 70 7M43 70 22 49M53 49l28-18M62 27 47 12"/>{[[24,49,-42],[42,68,30],[78,32,45],[48,15,-30],[65,14,30]].map(([cx,cy,r],i)=><ellipse key={i} cx={cx} cy={cy} rx="6" ry="16" transform={`rotate(${r} ${cx} ${cy})`} fill={e.background}/>)}</g>}
    {name === 'daisy' && <><path d="M50 94V55m0 17q-22-22-27-9 6 16 27 9" fill="none"/>{Array.from({length:8},(_,i)=><ellipse key={i} cx="50" cy="23" rx="8" ry="19" transform={`rotate(${i*45} 50 43)`}/>)}<circle cx="50" cy="43" r="11" fill={e.color}/></>}
    {name === 'rose' && <><path d="M51 57v39M51 78q27-24 28-9-11 15-28 9" fill="none"/><path d="M51 61Q14 48 23 24q9 6 12-13 21 10 32 0 0 18 15 15 3 29-31 35Z"/><path d="M32 28q27-18 34 8Q43 58 35 33q30-15 26 6M23 36l27 22 31-26" fill="none"/></>}
    {name === 'tape' && <><path d="m3 15 5 5-6 7 6 6-5 8 5 8-6 7 5 8-4 8 93 10-4-8 5-6-5-9 6-7-5-8 4-8-4-7 4-6Z" opacity=".82"/>{[20,35,50,65,80].map(x=><path key={x} d={`M${x} 23l-6 44`} strokeWidth=".4" opacity=".3"/>)}</>}
    {name === 'stamp' && <><path d="M10 8h80v84H10Z" strokeDasharray="3 3"/><rect x="18" y="17" width="64" height="66" fill="none"/><path d="M35 60q15-39 30 0M28 68h44" fill="none"/><text x="50" y="33" fontSize="7" stroke="none" fill={e.color} textAnchor="middle">WITH LOVE</text></>}
    {name === 'label' && <><path d="m4 27 15-14h77v74H19L4 73Z"/><circle cx="17" cy="50" r="4" fill="none"/><path d="M35 40h46M35 55h37M35 70h43" fill="none" strokeWidth=".5"/></>}
    {name === 'ticket' && <><path d="M3 24h94v16q-15 10 0 20v16H3V60q15-10 0-20Z"/><path d="M72 25v50" strokeDasharray="3 3"/><text x="39" y="48" textAnchor="middle" fontSize="8" fill={e.color} stroke="none">YOU &amp; ME</text><text x="39" y="61" textAnchor="middle" fontSize="5" fill={e.color} stroke="none">ONE BEAUTIFUL ADVENTURE</text></>}
    {name === 'postmark' && <g fill="none"><circle cx="39" cy="49" r="30"/><circle cx="39" cy="49" r="25"/><path d="M58 35q15-10 38 0M58 45q15-10 38 0M58 55q15-10 38 0M58 65q15-10 38 0"/><text x="39" y="47" fontSize="7" stroke="none" fill={e.color} textAnchor="middle">DEAR</text><text x="39" y="58" fontSize="6" stroke="none" fill={e.color} textAnchor="middle">TOMORROW</text></g>}
    {name === 'stars' && <g fill="none"><path d="m47 13 4 24 22 6-22 5-4 25-5-25-22-5 22-6Z"/><path d="m78 67 2 11 12 3-12 2-2 12-3-12-11-2 11-3ZM18 8v17M10 16h16"/></g>}
    {name === 'bookmark' && <><path d="M24 4h52v91L50 77 24 95Z"/><path d="M32 10v70M68 10v70" strokeWidth=".5"/></>}
  </svg>;
}
export function strokePath(s: DrawingStroke) { return s.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ') + (s.points.length === 1 ? 'l.01 .01' : ''); }
export function Drawing({ strokes }: { strokes: DrawingStroke[] }) {
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label="Personal drawing">{strokes.map(s => <path key={s.id} style={{pointerEvents:"visibleStroke"}} d={strokePath(s)} fill="none" stroke={s.color} strokeWidth={s.width} opacity={s.opacity * (s.tool === 'pencil' ? .72 : 1)} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
}
export function paperStyle(page: BookPage | undefined, book: MemoryBookDocument): CSSProperties {
  const pattern = page?.texture;
  const alpha = Math.round((page?.textureStrength ?? .35) * 100).toString(16).padStart(2, '0');
  const ink = `#817258${alpha}`;
  const image = page?.backgroundAssetId && book.assets[page.backgroundAssetId];
  const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='g'%3E%3CfeTurbulence baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath d='M0 0h150v150H0z' opacity='${(page?.textureStrength ?? .35) * .2}' filter='url(%23g)'/%3E%3C/svg%3E")`;
  const backgrounds = image ? [`url("${image.data}")`] : [];
  if (pattern === 'lines') backgrounds.push(`repeating-linear-gradient(transparent 0 4.8cqw,${ink} 4.8cqw 4.9cqw,transparent 4.9cqw 5cqw)`);
  if (pattern === 'graph') backgrounds.push(`repeating-linear-gradient(90deg,${ink} 0 .1cqw,transparent .1cqw 5cqw)`, `repeating-linear-gradient(${ink} 0 .1cqw,transparent .1cqw 5cqw)`);
  if (pattern === 'dots') backgrounds.push(`radial-gradient(${ink} .15cqw,transparent .18cqw)`);
  if (pattern === 'pattern') backgrounds.push(`repeating-linear-gradient(45deg,transparent 0 2cqw,${ink} 2cqw 2.1cqw,transparent 2.1cqw 4cqw)`);
  if (['grain', 'handmade', 'vintage'].includes(pattern || '')) backgrounds.push(grain);
  if (pattern === 'vintage') backgrounds.push('radial-gradient(ellipse,#fff0 40%,#9e773025)');
  if (page?.gradient) backgrounds.push(`linear-gradient(135deg,${page.paper},${page.gradient})`);
  const sizes = backgrounds.map((_value, i) => image && i === 0 ? 'cover' : pattern === 'dots' && i === (image ? 1 : 0) ? '4cqw 4cqw' : 'auto');
  return { backgroundColor: page?.paper || '#eee5d4', backgroundImage: backgrounds.join(',') || 'none', backgroundSize: sizes.join(','), backgroundPosition: `${page?.backgroundX ?? 50}% ${page?.backgroundY ?? 50}%` };
}
export function PaperBackground({page,book}:{page?:BookPage;book:MemoryBookDocument}) {
  return <div aria-hidden="true" style={{ position:'absolute',inset:0,pointerEvents:'none',...paperStyle(page,book) }}/>;
}
