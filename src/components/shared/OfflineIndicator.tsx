import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Upload } from 'lucide-react';
import { cn } from '~/lib/utils';
import { getPendingCount } from '~/lib/offline/queue';
import { syncPendingMedia, subscribeToOnlineStatus } from '~/lib/offline/sync';
import { Button } from '~/components/ui/button';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const refresh = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const result = await syncPendingMedia();
      setSyncResult(result);
      const count = await getPendingCount();
      setPendingCount(count);
      setTimeout(() => setSyncResult(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg',
        isOnline ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 border border-red-200 text-red-800'
      )}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4 text-amber-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600 animate-pulse" />
      )}

      <span>
        {!isOnline && 'Sin conexión'}
        {isOnline && pendingCount > 0 && (
          <>
            <Upload className="inline h-3 w-3 mr-1" />
            {pendingCount} {pendingCount === 1 ? 'archivo pendiente' : 'archivos pendientes de sincronizar'}
          </>
        )}
        {syncResult && ` · ${syncResult.synced} sincronizados`}
      </span>

      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      )}
    </div>
  );
}
