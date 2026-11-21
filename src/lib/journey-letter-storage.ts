import { journeyLimits, makeJourneyBackup, summarizeJourney, validateJourney, validateJourneyBackup, validateJourneySummary,
  type Journey, type JourneySummary } from './journey-letters';

export type SavedJourney = { revision: number; journey: Journey };
type CatalogEntry = { revision: number; summary: JourneySummary };
const recovery = 'This change could not be saved. The last saved journey is intact.';
const conflict = 'Another tab changed this journey. Export any draft in progress, then reload to open the saved version.';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Browser storage is unavailable.')); return; }
    const request = indexedDB.open('dear-tomorrow-journeys', 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore('catalog');
      request.result.createObjectStore('journeys');
    };
    request.onblocked = () => { blocked = true; reject(new Error('Close other Journey Letters tabs and try again.')); };
    request.onerror = () => reject(new Error('This browser could not open your journey library.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close(); else resolve(db);
    };
  });
}

async function read<T>(store: 'catalog' | 'journeys', key?: string): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store);
      const records = tx.objectStore(store);
      const request = key === undefined ? records.getAll() : records.get(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(new Error('Unable to read the journey library. Your saved journeys were kept.'));
    });
  } finally { db.close(); }
}

export async function listJourneys() {
  const entries = await read<CatalogEntry[]>('catalog');
  return entries.map(entry => validateJourneySummary(entry?.summary)).sort((a,b) => b.updatedAt-a.updatedAt);
}

function revisionValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export async function loadJourney(id: string): Promise<SavedJourney> {
  const entry = await read<SavedJourney | undefined>('journeys', id);
  if (!entry) throw new Error('This journey could not be found on this device.');
  const journey = validateJourney(entry.journey);
  if (journey.id !== id || !revisionValid(entry.revision)) throw new Error('This journey needs recovery. The saved record was kept.');
  return { journey, revision: entry.revision };
}

async function change(id: string, previous: number, next?: SavedJourney) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['catalog','journeys'], 'readwrite');
      const catalog = tx.objectStore('catalog');
      const journeys = tx.objectStore('journeys');
      let failure = recovery;
      const check = journeys.get(id);
      check.onsuccess = () => {
        const current = check.result as SavedJourney | undefined;
        if ((current?.revision ?? 0) !== previous || (current && !revisionValid(current.revision))) {
          failure = conflict;
          tx.abort();
          return;
        }
        function write() {
          try {
            if (next) {
              journeys.put(next,id);
              catalog.put({ revision: next.revision, summary: summarizeJourney(next.journey) },id);
            } else {
              journeys.delete(id);
              catalog.delete(id);
            }
          } catch { tx.abort(); }
        }
        if (previous !== 0) { write(); return; }
        const count = catalog.count();
        count.onsuccess = () => {
          if (count.result < journeyLimits.collection) { write(); return; }
          failure = 'This library holds 30 journeys. Export one before making room for another.';
          tx.abort();
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error(failure));
    });
  } finally { db.close(); }
}

function backupBlob(journey: Journey) {
  const blob = new Blob([JSON.stringify(makeJourneyBackup(journey))], {type:'application/json'});
  if (blob.size > journeyLimits.backup) throw new Error('This journey exceeds the 48 MB limit. Try fewer photographs or recordings.');
  return blob;
}

export async function saveJourney(journey: Journey, previous = 0): Promise<SavedJourney> {
  validateJourney(journey);
  backupBlob(journey);
  const next = { journey, revision: previous+1 };
  await change(journey.id, previous, next);
  return next;
}

export function deleteJourney(entry: SavedJourney) {
  return change(entry.journey.id, entry.revision);
}

export async function readJourneyBackup(file: File) {
  if (file.size > journeyLimits.backup) throw new Error('Choose a Journey Letters backup smaller than 48 MB.');
  let value: unknown;
  try { value = JSON.parse(await file.text()); }
  catch { throw new Error('This file is not a readable Journey Letters backup.'); }
  return validateJourneyBackup(value);
}

export function downloadJourney(journey: Journey) {
  const url = URL.createObjectURL(backupBlob(journey));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = (journey.name.replace(/[^a-z0-9 -]/gi,'').trim().slice(0,70) || 'journey') + '.dear-journey.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
