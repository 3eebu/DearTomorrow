import { blankPage, newElement, uid, type BookElement, type BookPage, type TextRun } from './memory-books';

// Safe mixed formatting is data, never user-supplied HTML.
export function formatRange(text: string, runs: TextRun[] | undefined, start: number, end: number, patch: Partial<Omit<TextRun, 'text'>>): TextRun[] {
  const source = runs?.map(r => r.text).join('') === text ? runs! : [{ text }];
  let cursor = 0;
  return source.flatMap(run => {
    const from = cursor; cursor += run.text.length;
    const a = Math.max(0, start - from), b = Math.min(run.text.length, end - from);
    if (b <= a) return [{ ...run }];
    return [a > 0 ? { ...run, text: run.text.slice(0, a) } : null, { ...run, ...patch, text: run.text.slice(a, b) }, b < run.text.length ? { ...run, text: run.text.slice(b) } : null].filter((r): r is TextRun => r !== null);
  });
}
export function editText(previous: string, next: string, runs?: TextRun[]): TextRun[] | undefined {
  if (!runs) return undefined;
  let a = 0, tail = 0;
  while (a < Math.min(previous.length, next.length) && previous[a] === next[a]) a++;
  while (tail < Math.min(previous.length, next.length) - a && previous[previous.length - tail - 1] === next[next.length - tail - 1]) tail++;
  const take = (start: number, end: number) => { let cursor = 0; return runs.flatMap(r => { const from = cursor; cursor += r.text.length; const text = r.text.slice(Math.max(0, start - from), Math.min(r.text.length, end - from)); return cursor > start && from < end && text ? [{ ...r, text }] : []; }); };
  const head = take(0, a), suffix = take(previous.length - tail, previous.length), inserted = next.slice(a, next.length - tail);
  const style = head[head.length - 1] || suffix[0] || runs[0];
  return [...head, ...(inserted ? [{ ...style, text: inserted }] : []), ...suffix];
}
export const textStyles = [
  ['Title', 8, 'serif', 'A day worth keeping.'], ['Subtitle', 5, 'serif', 'Our beautifully ordinary story.'],
  ['Paragraph', 3.6, 'serif', 'There are a hundred little things I want to remember about you.'], ['Handwritten letter', 4.2, 'hand', 'My dearest,\n\nI hope you always know…'],
  ['Quote', 5, 'serif', '“You feel like coming home.”'], ['Caption', 2.8, 'sans', 'A little moment, forever ours.'],
  ['Date', 2.6, 'mono', '14 February 2026'], ['List', 3.5, 'serif', '• Your laugh\n• Our mornings\n• Everything still ahead'], ['Small note', 3, 'hand', 'Always, yours.'],
] as const;
export const templateNames = ['The day we met', 'A letter to you', 'A collection of Polaroids', 'Reasons I love you', 'Our adventures', 'Our anniversary', 'Minimal photography', 'A handwritten diary', 'Blank page'] as const;
export function templatePage(name: string, chapterId: string): BookPage {
  const p = blankPage(chapterId);
  const text = (value: string, x: number, y: number, w: number, h: number, size: number, font: BookElement['font'] = 'serif'): BookElement => ({ ...newElement('text'), x, y, width: w, height: h, text: value, fontSize: size, font });
  if (name === 'Blank page') return p;
  p.elements.push(text(name === 'Our anniversary' ? 'Another year of us.' : name, 10, 9, 80, 17, 7, name === 'A handwritten diary' ? 'hand' : 'serif'));
  if (['A letter to you', 'A handwritten diary', 'Reasons I love you'].includes(name)) {
    p.elements.push(text(name === 'Reasons I love you' ? '01  The way you make ordinary days beautiful.\n\n02  Your kindness.\n\n03  A thousand little things…' : 'My dearest,\n\nHere is a little piece of our story.\n\nThere is so much I want to tell you…\n\nAlways, yours.', 12, 30, 76, 60, 3.8, 'hand'));
    p.texture = name === 'A handwritten diary' ? 'lines' : 'grain';
  } else if (name === 'A collection of Polaroids') {
    p.elements.push(...[-8, 6, -3].map((rotation, i) => ({ ...newElement('polaroid'), x: 9 + i * 23, y: 32 + i * 10, width: 39, height: 43, rotation })));
  } else {
    p.elements.push({ ...newElement('photo'), x: 12, y: 30, width: 76, height: 49, rotation: 0 });
    p.elements.push(text('The small things are the big things.', 12, 84, 76, 10, 3, 'hand'));
  }
  return p;
}
export function clonePage(page: BookPage, chapterId = page.chapterId): BookPage {
  const groups = new Map<string, string>();
  return { ...page, id: uid(), chapterId, elements: page.elements.map(e => {
    if (e.groupId && !groups.has(e.groupId)) groups.set(e.groupId, uid());
    return { ...e, id: uid(), groupId: e.groupId ? groups.get(e.groupId) : undefined };
  }) };
}
