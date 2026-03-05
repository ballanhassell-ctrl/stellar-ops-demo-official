import { RefreshCw } from 'lucide-react';
import { useVersionCheck } from '../hooks/useVersionCheck';

export default function VersionBanner() {
  const { updateAvailable, handleRefresh } = useVersionCheck();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
      <span>New updates available for Stellar Ops.</span>
      <button
        onClick={handleRefresh}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition-colors"
      >
        <RefreshCw size={13} />
        Refresh Browser
      </button>
    </div>
  );
}
