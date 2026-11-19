import { BACKUP_LIMIT, PHOTO_SIZE, validateGrove, validateTree, type Grove, type Photo, type Tree } from './memory-tree';

export type SavedGrove = { revision: number; grove: Grove };
export function emptyGrove(): SavedGrove { return { revision: 0, grove: { version: 1, activeId: '', trees: [] } }; }
function openGarden(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Browser storage is unavailable.')); return; }
    const request = indexedDB.open('dear-tomorrow-memory-tree', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('garden');
    request.onblocked = () => { blocked = true; reject(new Error('Close other Memory Tree tabs and try again.')); };
    request.onerror = () => reject(new Error('Browser storage is unavailable.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close();
      else resolve(db);
    };
  });
}
export async function loadGarden(): Promise<SavedGrove> {
  const db = await openGarden();
  try {
    const stored = await new Promise<SavedGrove | undefined>((resolve, reject) => {
      const transaction = db.transaction('garden', 'readonly');
      const request = transaction.objectStore('garden').get('trees');
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(new Error('Unable to read your saved trees.'));
    });
    if (stored === undefined) return emptyGrove();
    if (!stored || !Number.isSafeInteger(stored.revision) || stored.revision < 1) {
      throw new Error('This local library could not be read. Its stored contents were kept.');
    }
    return { revision: stored.revision, grove: validateGrove(stored.grove) };
  } finally { db.close(); }
}
export async function saveGarden(grove: Grove, revision: number): Promise<SavedGrove> {
  const validated = validateGrove(grove);
  const next = { revision: revision + 1, grove: validated };
  const db = await openGarden();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('garden', 'readwrite');
      const store = transaction.objectStore('garden');
      const request = store.get('trees');
      let conflict = false;
      request.onsuccess = () => {
        if ((request.result?.revision ?? 0) !== revision) { conflict = true; transaction.abort(); return; }
        store.put(next, 'trees');
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(conflict ?
        'Another tab saved a change. Export this draft, then reload before editing again.' :
        'This device could not save the change. The previous version is intact. Export a draft before leaving.'));
    });
    return next;
  } finally { db.close(); }
}
export async function importTree(file: File) {
  if (file.size > BACKUP_LIMIT) throw new Error('Choose a Memory Tree backup smaller than 40 MB.');
  return validateTree(JSON.parse(await file.text()));
}
export function downloadTree(tree: Tree | object, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(tree)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = (name.replace(/[^a-z0-9 -]/gi, '').trim().slice(0, 70) || 'memory-tree') + '.memory-tree.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function preparePhoto(file: File): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) {
    throw new Error('Choose JPEG, PNG, or WebP photographs under 10 MB each.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('This device cannot prepare photographs.');
    for (const [edge, quality] of [[1440, .84], [1120, .77], [840, .71], [620, .62]]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.fillStyle = '#f6f0e5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= PHOTO_SIZE) return { id: crypto.randomUUID(), name: file.name.slice(0, 150), data };
    }
    throw new Error('This photograph could not fit the local photo limit.');
  } finally { bitmap.close(); }
}
