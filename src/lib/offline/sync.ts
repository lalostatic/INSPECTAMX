import { getPendingMedia, updateMediaStatus, removeMedia } from './queue';
import { uploadMedia } from '../api';
import type { OfflineMediaItem } from '../types';

const MAX_ATTEMPTS = 3;

export async function syncPendingMedia(
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingMedia();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.attempts >= MAX_ATTEMPTS) {
      await updateMediaStatus(item.id, 'failed', item.attempts);
      failed++;
      continue;
    }

    try {
      await updateMediaStatus(item.id, 'syncing', item.attempts + 1);

      const file = new File([item.file_blob], item.filename, { type: item.mime_type });
      await uploadMedia(item.entity_type, item.entity_id, file);

      await removeMedia(item.id);
      synced++;
      onProgress?.(synced, pending.length);
    } catch (error) {
      console.warn(`Failed to sync media ${item.id}:`, error);
      await updateMediaStatus(item.id, 'failed', item.attempts + 1);
      failed++;
    }
  }

  return { synced, failed };
}

// Register service worker and background sync
export async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration.sync as { register(tag: string): Promise<void> }).register('sync-media');
    }
  } catch (error) {
    console.warn('Background sync registration failed:', error);
  }
}

// Online/offline event handlers
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000): void {
  if (syncInterval) return;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start interval if online
  if (navigator.onLine) {
    syncInterval = setInterval(() => {
      if (navigator.onLine) syncPendingMedia();
    }, intervalMs);
  }
}

export function stopAutoSync(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function handleOnline(): void {
  console.log('[INSPECTAMX] Online - starting sync');
  syncPendingMedia();
}

function handleOffline(): void {
  console.log('[INSPECTAMX] Offline - queuing enabled');
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Subscribe to online status changes
export function subscribeToOnlineStatus(
  callback: (online: boolean) => void
): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
