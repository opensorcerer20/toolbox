import { openDB } from 'idb';
import type { Collection, Entry } from './types';

// Avoids a circular import with db.ts by talking to IndexedDB directly.

const BACKUP_FILENAME = 'fieldnotes-backup.json';
const DB_NAME = 'fieldnotes';
const DB_VERSION = 1;

interface BackupFile {
  version: 1;
  collections: Collection[];
  entries: Entry[];
}

export function isOPFSAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage
  );
}

async function readAllFromIDB(): Promise<{ collections: Collection[]; entries: Entry[] }> {
  const db = await openDB(DB_NAME, DB_VERSION);
  const collections = await db.getAll('collections') as Collection[];
  const entries = await db.getAll('entries') as Entry[];
  db.close();
  return { collections, entries };
}

async function writeAllToIDB(collections: Collection[], entries: Entry[]): Promise<void> {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('collections'))
        database.createObjectStore('collections', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('entries')) {
        const store = database.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('by-collection', 'collectionId');
      }
    },
  });
  const tx = db.transaction(['collections', 'entries'], 'readwrite');
  for (const col of collections) await tx.objectStore('collections').put(col);
  for (const entry of entries) await tx.objectStore('entries').put(entry);
  await tx.done;
  db.close();
}

export async function snapshotToOPFS(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const { collections, entries } = await readAllFromIDB();
  const backup: BackupFile = { version: 1, collections, entries };
  const fileHandle = await root.getFileHandle(BACKUP_FILENAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(backup));
  await writable.close();
}

// Returns true if data was restored from OPFS into an empty IndexedDB.
export async function restoreFromOPFS(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(BACKUP_FILENAME); // throws NotFoundError if absent
    const file = await fileHandle.getFile();
    const backup: BackupFile = JSON.parse(await file.text());

    if (backup.version !== 1 || !backup.collections?.length) return false;

    const { collections: existing } = await readAllFromIDB();
    if (existing.length > 0) return false;

    await writeAllToIDB(backup.collections, backup.entries);
    return true;
  } catch {
    return false;
  }
}
