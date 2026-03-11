import { useState, useEffect, useCallback } from 'react';
import { getSyncQueueCount } from '@/lib/offlineDb';
import { onSyncQueueChange } from '@/lib/syncEngine';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to sync queue count changes
  useEffect(() => {
    // Initial count
    getSyncQueueCount().then(setPendingSyncCount);

    const unsub = onSyncQueueChange((count) => {
      setPendingSyncCount(count);
    });

    return unsub;
  }, []);

  const refreshSyncCount = useCallback(async () => {
    const count = await getSyncQueueCount();
    setPendingSyncCount(count);
  }, []);

  return { isOnline, pendingSyncCount, refreshSyncCount };
}
