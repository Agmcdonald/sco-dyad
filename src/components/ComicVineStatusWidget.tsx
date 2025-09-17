import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, AlertCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import comicVineService from '@/services/comicVineService';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import ComicVineStatusModal from './ComicVineStatusModal';

interface ComicVineStats {
  pending: number;
  fetched: number;
  failed: number;
  skipped: number;
}

interface RateLimitInfo {
  canProceed: boolean;
  requestsRemaining: number;
  nextReset?: string;
}

const ComicVineStatusWidget = () => {
  const { settings } = useSettings();
  const databaseService = useElectronDatabaseService();
  const [stats, setStats] = useState<ComicVineStats>({ pending: 0, fetched: 0, failed: 0, skipped: 0 });
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({ canProceed: true, requestsRemaining: 200 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (settings.comicVineApiKey && databaseService) {
      loadStatus();
      const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [settings.comicVineApiKey, databaseService]);

  const loadStatus = async () => {
    try {
      const status = await comicVineService.getStatus(databaseService);
      setStats(status.stats);
      setRateLimit({
        canProceed: status.requestsRemaining > 0,
        requestsRemaining: status.requestsRemaining,
        nextReset: status.nextResetTime
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load Comic Vine status:', error);
      setIsLoading(false);
    }
  };

  // Don't show widget if API key is not configured or Comic Vine is disabled
  if (!settings.comicVineApiKey || !settings.comicVineEnabled) {
    return null;
  }

  const totalComics = stats.pending + stats.fetched + stats.failed + stats.skipped;
  const hasComicsToProcess = stats.pending > 0;
  const rateLimitColor = rateLimit.requestsRemaining > 50 ? 'text-green-600' : 
                       rateLimit.requestsRemaining > 10 ? 'text-yellow-600' : 'text-red-600';

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsModalOpen(true)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Comic Vine</span>
              {hasComicsToProcess && (
                <Badge variant="secondary" className="text-xs">
                  {stats.pending} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3" />
              <span className={`font-mono ${rateLimitColor}`}>
                {rateLimit.requestsRemaining}/200
              </span>
            </div>
          </div>
          
          {/* Compact progress bar for rate limit */}
          <div className="mt-2">
            <Progress 
              value={(rateLimit.requestsRemaining / 200) * 100} 
              className="h-1" 
            />
            {rateLimit.nextReset && (
              <p className="text-xs text-muted-foreground mt-1">
                Resets: {new Date(rateLimit.nextReset).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Quick stats */}
          {totalComics > 0 && (
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>{stats.fetched} enhanced</span>
              <span>{stats.failed} failed</span>
              <span>Click for details</span>
            </div>
          )}
        </CardContent>
      </Card>

      <ComicVineStatusModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ComicVineStatusWidget;
