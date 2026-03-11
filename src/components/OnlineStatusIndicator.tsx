import { Wifi, WifiOff, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { processSyncQueue } from '@/lib/syncEngine';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function OnlineStatusIndicator() {
  const { isOnline, pendingSyncCount } = useOnlineStatus();

  const handleManualSync = () => {
    if (isOnline && pendingSyncCount > 0) {
      processSyncQueue();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pending sync badge */}
      {pendingSyncCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualSync}
              className="relative shrink-0 h-8 w-8"
              disabled={!isOnline}
            >
              <CloudUpload className="h-4 w-4 text-amber-500" />
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isOnline
              ? `${pendingSyncCount} changes pending sync — click to sync now`
              : `${pendingSyncCount} changes will sync when online`}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Online/offline indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-600'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline
            ? 'Connected — data syncing with server'
            : 'Offline — orders are saved locally and will sync when internet returns'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
