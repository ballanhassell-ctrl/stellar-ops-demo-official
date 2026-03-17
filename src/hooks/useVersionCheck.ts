import { useState, useEffect, useCallback } from 'react';

const CURRENT_VERSION = '1.0.0';
const CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== CURRENT_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      // Silently fail - version check is non-critical
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkVersion]);

  const handleRefresh = useCallback(() => {
    // Unregister service workers and hard reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }
    window.location.reload();
  }, []);

  return { updateAvailable, handleRefresh };
}
