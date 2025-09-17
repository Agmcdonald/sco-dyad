import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, Clock, CheckCircle, XCircle, Sparkles, Play, Pause, ChevronDown, ChevronRight, RotateCcw, X, EyeOff } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { showError, showSuccess } from '@/utils/toast';
import comicVineService from '@/services/comicVineService';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { Comic } from '@/types';

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

const ComicVineStatusModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { settings } = useSettings();
  const { isComicVineProcessing, comicVineProgress, startComicVineProcessing, stopComicVineProcessing } = useAppContext();
  const databaseService = useElectronDatabaseService();
  const [stats, setStats] = useState<ComicVineStats>({ pending: 0, fetched: 0, failed: 0, skipped: 0 });
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({ canProceed: true, requestsRemaining: 200 });
  const [isLoading, setIsLoading] = useState(true);
  
  // State for detailed comic lists
  const [comicDetails, setComicDetails] = useState<{
    pending: Comic[];
    failed: Comic[];
    fetched: Comic[];
    skipped: Comic[];
  }>({ pending: [], failed: [], fetched: [], skipped: [] });
  
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState<{
    pending: boolean;
    failed: boolean;
    fetched: boolean;
    skipped: boolean;
  }>({ pending: false, failed: false, fetched: false, skipped: false });

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      const interval = setInterval(loadStatus, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

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

  const handleStartProcessing = async () => {
    if (!settings.comicVineApiKey) {
      showError('Comic Vine API key not configured. Please set it in Settings.');
      return;
    }

    if (!settings.comicVineEnabled) {
      showError('Comic Vine integration is disabled. Please enable it in Settings > Metadata Sources.');
      return;
    }

    try {
      await startComicVineProcessing();
      await loadStatus(); // Refresh status after processing
    } catch (error) {
      showError(`Failed to start processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStopProcessing = () => {
    stopComicVineProcessing();
    showSuccess('Comic Vine processing stopped');
  };

  const loadComicsByStatus = async (status: string) => {
    if (!databaseService) return;
    
    try {
      const comics = await databaseService.getComicsByComicVineStatus(status, 20); // Limit to 20 for better performance
      setComicDetails(prev => ({ ...prev, [status]: comics }));
    } catch (error) {
      console.error(`Failed to load ${status} comics:`, error);
    }
  };

  const toggleSection = (status: string) => {
    const isCurrentlyExpanded = expandedSections[status as keyof typeof expandedSections];
    
    setExpandedSections(prev => ({ 
      ...prev, 
      [status]: !isCurrentlyExpanded 
    }));
    
    // Load comics when expanding a section for the first time
    if (!isCurrentlyExpanded && comicDetails[status as keyof typeof comicDetails].length === 0) {
      loadComicsByStatus(status);
    }
  };

  const handleResetComicVineStatus = async (status: string, newStatus: string = 'pending') => {
    if (!databaseService) return;
    
    try {
      const comics = comicDetails[status as keyof typeof comicDetails];
      if (comics.length === 0) {
        showError('No comics to reset');
        return;
      }
      
      const comicIds = comics.map(comic => comic.id);
      const updatedCount = await databaseService.resetComicVineStatus(comicIds, newStatus);
      
      if (updatedCount > 0) {
        showSuccess(`Reset ${updatedCount} comics to ${newStatus} status`);
        // Refresh the status and clear the details to force reload
        await loadStatus();
        setComicDetails(prev => ({ ...prev, [status]: [] }));
        setExpandedSections(prev => ({ ...prev, [status]: false }));
      } else {
        showError('No comics were updated');
      }
    } catch (error) {
      console.error(`Failed to reset ${status} comics:`, error);
      showError(`Failed to reset comics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleIgnoreInAutoScans = async (status: string) => {
    if (!databaseService) return;
    
    try {
      const comics = comicDetails[status as keyof typeof comicDetails];
      if (comics.length === 0) {
        showError('No comics to ignore');
        return;
      }
      
      // Update comics to set ignoreInScans = true
      const updates = comics.map(comic => ({ id: comic.id, ignoreInScans: true }));
      const updatedCount = await databaseService.batchUpdateComics(updates);
      
      if (updatedCount > 0) {
        showSuccess(`Ignored ${updatedCount} comics in auto scans`);
        // Refresh the status and clear the details to force reload
        await loadStatus();
        setComicDetails(prev => ({ ...prev, [status]: [] }));
        setExpandedSections(prev => ({ ...prev, [status]: false }));
      } else {
        showError('No comics were updated');
      }
    } catch (error) {
      console.error(`Failed to ignore ${status} comics:`, error);
      showError(`Failed to ignore comics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  const totalComics = stats.pending + stats.fetched + stats.failed + stats.skipped;
  const processedComics = stats.fetched + stats.failed + stats.skipped;
  const progressPercentage = totalComics > 0 ? (processedComics / totalComics) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Comic Vine Processing Status
          </h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        {!settings.comicVineApiKey || !settings.comicVineEnabled ? (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {!settings.comicVineApiKey 
                    ? "Comic Vine API key not configured. Please set it in Settings to enable processing."
                    : "Comic Vine integration is disabled. Please enable it in Settings > Metadata Sources."
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Rate Limit Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Rate Limit Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span>Requests Remaining:</span>
                  <Badge variant={rateLimit.requestsRemaining > 50 ? 'default' : rateLimit.requestsRemaining > 10 ? 'secondary' : 'destructive'}>
                    {rateLimit.requestsRemaining} / 200
                  </Badge>
                </div>
                <Progress value={(rateLimit.requestsRemaining / 200) * 100} className="mb-2" />
                {rateLimit.nextReset && (
                  <p className="text-sm text-muted-foreground">
                    Resets at: {new Date(rateLimit.nextReset).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Processing Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Processing Status
                  {isComicVineProcessing && (
                    <Badge variant="default" className="ml-2">
                      Processing...
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isComicVineProcessing ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Progress:</span>
                      <span>{comicVineProgress.processed} / {comicVineProgress.total}</span>
                    </div>
                    <Progress value={(comicVineProgress.processed / comicVineProgress.total) * 100} />
                    {comicVineProgress.current && (
                      <p className="text-sm text-muted-foreground">
                        Currently processing: {comicVineProgress.current}
                      </p>
                    )}
                    <Button onClick={handleStopProcessing} variant="destructive" className="w-full">
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Processing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.fetched}</div>
                        <div className="text-sm text-muted-foreground">Enhanced</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </div>
                    </div>

                    {/* Detailed Comic Lists */}
                    <div className="space-y-2">
                      {/* Pending Comics */}
                      {stats.pending > 0 && (
                        <Collapsible open={expandedSections.pending} onOpenChange={() => toggleSection('pending')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/20">
                            <div className="flex items-center gap-2">
                              {expandedSections.pending ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="font-medium text-blue-600">Pending Comics ({stats.pending})</span>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1 mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleResetComicVineStatus('pending', 'skipped')}
                                className="text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Skip All
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleIgnoreInAutoScans('pending')}
                                className="text-xs"
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Ignore All
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {comicDetails.pending.map((comic) => (
                                <div key={comic.id} className="flex items-center justify-between p-2 text-sm bg-muted/10 rounded">
                                  <span className="font-medium">{comic.series} #{comic.issue}</span>
                                  <span className="text-muted-foreground">({comic.year})</span>
                                </div>
                              ))}
                              {comicDetails.pending.length === 0 && (
                                <div className="text-center py-2 text-muted-foreground">Loading...</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Failed Comics */}
                      {stats.failed > 0 && (
                        <Collapsible open={expandedSections.failed} onOpenChange={() => toggleSection('failed')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/20">
                            <div className="flex items-center gap-2">
                              {expandedSections.failed ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="font-medium text-red-600">Failed Comics ({stats.failed})</span>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1 mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleResetComicVineStatus('failed', 'pending')}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry All
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleResetComicVineStatus('failed', 'skipped')}
                                className="text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Skip All
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleIgnoreInAutoScans('failed')}
                                className="text-xs"
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Ignore All
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {comicDetails.failed.map((comic) => (
                                <div key={comic.id} className="flex items-center justify-between p-2 text-sm bg-muted/10 rounded">
                                  <span className="font-medium">{comic.series} #{comic.issue}</span>
                                  <span className="text-muted-foreground">({comic.year})</span>
                                </div>
                              ))}
                              {comicDetails.failed.length === 0 && (
                                <div className="text-center py-2 text-muted-foreground">Loading...</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Enhanced Comics */}
                      {stats.fetched > 0 && (
                        <Collapsible open={expandedSections.fetched} onOpenChange={() => toggleSection('fetched')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/20">
                            <div className="flex items-center gap-2">
                              {expandedSections.fetched ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="font-medium text-green-600">Enhanced Comics ({stats.fetched})</span>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1 mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleResetComicVineStatus('fetched', 'pending')}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reprocess All
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {comicDetails.fetched.map((comic) => (
                                <div key={comic.id} className="flex items-center justify-between p-2 text-sm bg-muted/10 rounded">
                                  <span className="font-medium">{comic.series} #{comic.issue}</span>
                                  <span className="text-muted-foreground">({comic.year})</span>
                                </div>
                              ))}
                              {comicDetails.fetched.length === 0 && (
                                <div className="text-center py-2 text-muted-foreground">Loading...</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Skipped Comics */}
                      {stats.skipped > 0 && (
                        <Collapsible open={expandedSections.skipped} onOpenChange={() => toggleSection('skipped')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/20">
                            <div className="flex items-center gap-2">
                              {expandedSections.skipped ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="font-medium text-gray-600">Skipped Comics ({stats.skipped})</span>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1 mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleResetComicVineStatus('skipped', 'pending')}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry All
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleIgnoreInAutoScans('skipped')}
                                className="text-xs"
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Ignore All
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {comicDetails.skipped.map((comic) => (
                                <div key={comic.id} className="flex items-center justify-between p-2 text-sm bg-muted/10 rounded">
                                  <span className="font-medium">{comic.series} #{comic.issue}</span>
                                  <span className="text-muted-foreground">({comic.year})</span>
                                </div>
                              ))}
                              {comicDetails.skipped.length === 0 && (
                                <div className="text-center py-2 text-muted-foreground">Loading...</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                    <Button 
                      onClick={handleStartProcessing} 
                      disabled={stats.pending === 0 || !rateLimit.canProceed}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Processing ({stats.pending} comics)
                    </Button>
                    {!rateLimit.canProceed && (
                      <p className="text-sm text-red-600 text-center">
                        Rate limit reached. Processing will resume when limit resets.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Progress</CardTitle>
                <CardDescription>
                  {processedComics} of {totalComics} comics processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} className="mb-4" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progressPercentage.toFixed(1)}% Complete</span>
                  <span>{stats.pending} Remaining</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ComicVineStatusModal;
