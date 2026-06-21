import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Collection, Entry } from './types';
import { isOPFSAvailable, snapshotToOPFS } from './backup';

function triggerSnapshot(): void {
  if (isOPFSAvailable()) snapshotToOPFS().catch(() => {});
}

interface FieldNotesDB extends DBSchema {
  collections: {
    key: string;
    value: Collection;
  };
  entries: {
    key: string;
    value: Entry;
    indexes: { 'by-collection': string };
  };
}

let db: IDBPDatabase<FieldNotesDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FieldNotesDB>> {
  if (!db) {
    db = await openDB<FieldNotesDB>('fieldnotes', 1, {
      upgrade(database) {
        database.createObjectStore('collections', { keyPath: 'id' });
        const entries = database.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('by-collection', 'collectionId');
      },
    });
  }
  return db;
}

export async function getCollections(): Promise<Collection[]> {
  const d = await getDB();
  return d.getAll('collections');
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  const d = await getDB();
  return d.get('collections', id);
}

export async function putCollection(collection: Collection): Promise<void> {
  const d = await getDB();
  await d.put('collections', collection);
  triggerSnapshot();
}

export async function deleteCollection(id: string): Promise<void> {
  const d = await getDB();
  const tx = d.transaction(['collections', 'entries'], 'readwrite');
  await tx.objectStore('collections').delete(id);
  const index = tx.objectStore('entries').index('by-collection');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
  triggerSnapshot();
}

export async function getEntries(collectionId: string): Promise<Entry[]> {
  const d = await getDB();
  return d.getAllFromIndex('entries', 'by-collection', collectionId);
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const d = await getDB();
  return d.get('entries', id);
}

export async function putEntry(entry: Entry): Promise<void> {
  const d = await getDB();
  await d.put('entries', entry);
  triggerSnapshot();
}

export async function deleteEntry(id: string): Promise<void> {
  const d = await getDB();
  await d.delete('entries', id);
  triggerSnapshot();
}
