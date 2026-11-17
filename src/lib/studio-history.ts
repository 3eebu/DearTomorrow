import type { MemoryBookDocument } from './memory-books';

// Snapshots use structural sharing: immutable photo strings are never serialized
// or cloned for history. The live asset pool survives undo so uploads stay reusable.
export class StudioHistory {
  past: MemoryBookDocument[] = [];
  future: MemoryBookDocument[] = [];
  private key = '';
  private time = 0;
  record(current: MemoryBookDocument, next: MemoryBookDocument, key = '', now = Date.now()) {
    if (current === next) return;
    if (!key || key !== this.key || now - this.time > 700) this.past = [...this.past.slice(-59), current];
    this.key = key; this.time = now; this.future = [];
  }
  undo(current: MemoryBookDocument) {
    const previous = this.past.pop(); if (!previous) return null;
    this.future.push(current); this.key = '';
    return { ...previous, assets: { ...previous.assets, ...current.assets } };
  }
  redo(current: MemoryBookDocument) {
    const next = this.future.pop(); if (!next) return null;
    this.past.push(current); this.key = '';
    return { ...next, assets: { ...next.assets, ...current.assets } };
  }
}
