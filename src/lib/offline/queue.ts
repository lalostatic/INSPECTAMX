import { openDB, type IDBPDatabase } from 'idb';
import type { OfflineMediaItem } from '../types';
import { generateLocalId } from '../utils';

const DB_NAME = 'inspectamx-offline';
const DB_VERSION = 1;
const MEDIA_STORE = 'media_queue';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('entity_id', 'entity_id');
          store.createIndex('created_at', 'created_at');
        }
      },
    });
  }
  return dbPromise;
}

export async function queueMedia(
  entityType: OfflineMediaItem['entity_type'],
  entityId: string,
  file: File
): Promise<OfflineMediaItem> {
  const db = await getDB();

  const item: OfflineMediaItem = {
    id: generateLocalId(),
    entity_type: entityType,
    entity_id: entityId,
    file_blob: file,
    filename: file.name,
    mime_type: file.type,
    created_at: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };

  await db.add(MEDIA_STORE, item);
  return item;
}

export async function getPendingMedia(): Promise<OfflineMediaItem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(MEDIA_STORE, 'status', 'pending');
  const failed = await db.getAllFromIndex(MEDIA_STORE, 'status', 'failed');
  return [...all, ...failed].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const pending = await db.countFromIndex(MEDIA_STORE, 'status', 'pending');
  const failed = await db.countFromIndex(MEDIA_STORE, 'status', 'failed');
  return pending + failed;
}

export async function updateMediaStatus(
  id: string,
  status: OfflineMediaItem['status'],
  attempts?: number
): Promise<void> {
  const db = await getDB();
  const item = await db.get(MEDIA_STORE, id);
  if (item) {
    await db.put(MEDIA_STORE, {
      ...item,
      status,
      attempts: attempts !== undefined ? attempts : item.attempts,
    });
  }
}

export async function removeMedia(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(MEDIA_STORE, id);
}

export async function getMediaByEntity(entityId: string): Promise<OfflineMediaItem[]> {
  const db = await getDB();
  return db.getAllFromIndex(MEDIA_STORE, 'entity_id', entityId);
}

export async function clearSyncedMedia(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(MEDIA_STORE, 'readwrite');
  const store = tx.objectStore(MEDIA_STORE);
  const synced = await store.index('status').getAll('synced');
  for (const item of synced) {
    await store.delete(item.id);
  }
  await tx.done;
}

// Persist inspection data for offline use
const DATA_STORE_PREFIX = 'inspectamx-data-';

export function saveOfflineData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(DATA_STORE_PREFIX + key, JSON.stringify(data));
  } catch {
    // Storage full, ignore
  }
}

export function getOfflineData<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(DATA_STORE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function removeOfflineData(key: string): void {
  localStorage.removeItem(DATA_STORE_PREFIX + key);
}
