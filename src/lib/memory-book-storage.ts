import { LIMITS, validateBook, type MemoryBookDocument } from './memory-books';
let loadedRevision: number | null = null;
let pendingLoad: Promise<MemoryBookDocument[]> | null = null;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dear-tomorrow-memory-books', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('library');
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(new Error('Browser storage is unavailable. Export your project to keep a copy.'));
    request.onblocked = () => reject(new Error('Close other Memory Book tabs, then retry saving.'));
  });
}
export function loadLibrary(): Promise<MemoryBookDocument[]> {
  if (pendingLoad) return pendingLoad;
  const request = readLibrary();
  pendingLoad = request;
  void request.finally(() => { if (pendingLoad === request) pendingLoad = null; }).catch(() => {});
  return request;
}
async function readLibrary(): Promise<MemoryBookDocument[]> {
  const db = await database();
  try {
    const data = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction('library', 'readonly');
      const request = tx.objectStore('library').get('books');
      const version = tx.objectStore('library').get('revision');
      tx.oncomplete = () => { loadedRevision = typeof version.result === 'number' ? version.result : 0; resolve(request.result); };
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(new Error('Unable to read your library. Your browser data has not been changed.'));
    });
    if (data === undefined) return [];
    if (!Array.isArray(data) || data.length > LIMITS.books) throw new Error('The saved library needs recovery. Existing browser data has not been overwritten.');
    return data.map(validateBook);
  } finally { db.close(); }
}
export async function saveLibrary(books: MemoryBookDocument[], expected?: MemoryBookDocument[]) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('library', 'readwrite');
      const store = tx.objectStore('library');
      const version = store.get('revision');
      const stored = store.get('books');
      let next = 0;
      let conflict = false;
      version.onsuccess = () => {
        const previous = typeof version.result === 'number' ? version.result : 0;
        if (loadedRevision === null || loadedRevision !== previous) {
          // A development module reload can lose the in-memory revision. Only
          // recover it when the caller's last saved snapshot still matches disk.
          if (!expected || JSON.stringify(stored.result ?? []) !== JSON.stringify(expected)) { conflict = true; tx.abort(); return; }
        }
        next = previous + 1;
        store.put(books, 'books'); store.put(next, 'revision');
      };
      // Both requests finish in order; make the comparison after reading books.
      stored.onsuccess = version.onsuccess;
      version.onsuccess = null;
      tx.oncomplete = () => { loadedRevision = next; resolve(); };
      tx.onabort = () => reject(new Error(conflict ? 'Another tab changed this library. Export your current book, then reload before editing again. Neither version was overwritten.' : 'Unable to save on this device. Storage may be full. Export a backup before leaving.'));
      tx.onerror = () => reject(new Error('Unable to save on this device. Export a backup before leaving.'));
    });
  } finally { db.close(); }
}

export async function readPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > LIMITS.uploadBytes) throw new Error('Choose an image smaller than 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo. Try another browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', .88);
  } finally { bitmap.close(); }
}
export function exportBook(book: MemoryBookDocument) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(book)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${book.title.replace(/[^a-z0-9 -]/gi, '').slice(0, 70) || 'memory-book'}.deartomorrow.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
