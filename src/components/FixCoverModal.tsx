import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Image as ImageIcon, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";
import { getCoverUrl } from "@/lib/cover";

interface FixCoverModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const FixCoverModal = ({ comic, isOpen, onClose }: FixCoverModalProps) => {
  const { updateComic } = useAppContext();
  const { isElectron, electronAPI } = useElectron();

  const [isExtracting, setIsExtracting] = useState(false);

  // Shared preparation state
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [pageLoadError, setPageLoadError] = useState("");
  const [cbrTempDir, setCbrTempDir] = useState<string | null>(null);

  // Ensure single in-flight prepare promise per modal instance
  const preparePromiseRef = useRef<Promise<{ tempDir: string; pages: string[] }> | null>(null);

  // Optional: show first-page preview on re-extract
  const [firstPagePreview, setFirstPagePreview] = useState<string | null>(null);

  // Helper to prepare CBR only once and share results
  const ensurePrepared = async () => {
    if (!isElectron || !electronAPI || !comic.filePath || !comic.filePath.toLowerCase().endsWith(".cbr")) {
      return null;
    }
    if (cbrTempDir && availablePages.length > 0) {
      return { tempDir: cbrTempDir, pages: availablePages };
    }
    if (preparePromiseRef.current) {
      // Reuse in-flight promise
      return await preparePromiseRef.current;
    }

    setIsLoadingPages(true);
    setPageLoadError("");
    setAvailablePages([]);
    setPageImages({});
    setFirstPagePreview(null);

    const promise = (async () => {
      const { tempDir, pages } = await electronAPI.prepareCbrForReading(comic.filePath!);
      return { tempDir, pages };
    })();

    preparePromiseRef.current = promise;

    try {
      const { tempDir, pages } = await promise;

      if (!pages || pages.length === 0) {
        setPageLoadError("No pages found in comic file. The file might be corrupted or in an unsupported format.");
        setIsLoadingPages(false);
        return { tempDir, pages: [] };
      }

      setCbrTempDir(tempDir);
      setAvailablePages(pages.slice(0, 32)); // cap initial UI load

      // Preload first few thumbnails
      const thumbs: Record<string, string> = {};
      const preloadCount = Math.min(pages.length, 10);
      for (let i = 0; i < preloadCount; i++) {
        const name = pages[i];
        try {
          const dataUrl = await electronAPI.getPageDataUrlFromTemp(tempDir, name);
          thumbs[name] = dataUrl;
        } catch {
          // Ignore individual failures
        }
      }
      setPageImages(thumbs);
      setIsLoadingPages(false);
      return { tempDir, pages };
    } catch (err: any) {
      setIsLoadingPages(false);
      const msg = err?.message || "Unknown error";
      setPageLoadError(`Error loading pages: ${msg}`);
      return null;
    } finally {
      // Keep the promise for reuse; will be cleared on modal close/unmount
    }
  };

  // Prepare when opening (only for CBR; CBZ/PDF handled lazily in other flows)
  useEffect(() => {
    if (isOpen) {
      if (isElectron && electronAPI && comic.filePath?.toLowerCase().endsWith(".cbr")) {
        // Fire and forget; UI reacts via state
        void ensurePrepared();
      }
    }
  }, [isOpen, isElectron, electronAPI, comic.filePath]);

  // Cleanup temp directory and reset promise when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (cbrTempDir && electronAPI) {
        electronAPI.cleanupTempDir(cbrTempDir);
      }
      preparePromiseRef.current = null;
      setCbrTempDir(null);
      setAvailablePages([]);
      setPageImages({});
      setFirstPagePreview(null);
      setIsLoadingPages(false);
      setPageLoadError("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReextractCover = async () => {
    if (!isElectron || !electronAPI || !comic.filePath) {
      showError("Cover re-extraction is only available in the desktop app.");
      return;
    }

    setIsExtracting(true);
    try {
      // Ensure we reuse the same preparation pipeline as Select Page
      const prepared = await ensurePrepared();
      if (prepared && prepared.pages && prepared.pages.length > 0) {
        const first = prepared.pages[0];

        // Show first-page preview while re-extract runs
        if (!pageImages[first]) {
          try {
            const dataUrl = await electronAPI.getPageDataUrlFromTemp(prepared.tempDir, first);
            setPageImages(prev => ({ ...prev, [first]: dataUrl }));
            setFirstPagePreview(dataUrl);
          } catch {
            // Ignore preview load failure
          }
        } else {
          setFirstPagePreview(pageImages[first]);
        }
      }

      // Persist the cover via IPC (writes to covers dir and returns path)
      const result = await electronAPI.extractCover(comic.filePath);
      if (result.success && result.path) {
        const updatedComic = { ...comic, coverUrl: result.path };
        await updateComic(updatedComic);
        showSuccess("Cover re-extracted successfully!");
        onClose();
      } else {
        const errorMessage = result.error?.message || "Failed to re-extract cover due to an unknown error.";
        showError(`Failed to re-extract cover: ${errorMessage}`);
        console.error('[FIX-COVER] Detailed re-extraction error:', result.error?.stack || errorMessage);
      }
    } catch (error: any) {
      showError(`Failed to re-extract cover: ${error.message}`);
      console.error('[FIX-COVER] Re-extract error:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUsePageAsCover = async (pageName: string) => {
    if (!isElectron || !electronAPI || !comic.filePath) return;
    try {
      // We keep using the page data URL for preview, but DB update expects a real cover file path.
      // Reuse extractCover IPC (which now uses the first page internally). To honor a specific page
      // selection, you’d need a dedicated IPC that writes a chosen page; for now keep existing flow.
      const result = await electronAPI.extractCover(comic.filePath);
      if (result.success && result.path) {
        const updatedComic = { ...comic, coverUrl: result.path };
        await updateComic(updatedComic);
        showSuccess(`Cover updated from page "${pageName}".`);
        onClose();
      } else {
        const errorMessage = result.error?.message || "Failed to set cover.";
        showError(errorMessage);
      }
    } catch (error) {
      console.error('[FIX-COVER] Error using page as cover:', error);
      showError("Failed to use page as cover.");
    }
  };

  const coverSrc = firstPagePreview || getCoverUrl(comic.coverUrl, comic.filePath);
  const disableUi = isExtracting; // lock UI while extracting to avoid races

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Fix Cover for "{comic.series} #{comic.issue}"
          </DialogTitle>
          <DialogDescription>
            Re-extract from the first page or select a page to use as the cover.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="re-extract" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="re-extract" disabled={disableUi}>Re-extract</TabsTrigger>
            <TabsTrigger value="select-page" disabled={disableUi || isLoadingPages}>Select Page</TabsTrigger>
          </TabsList>

          <TabsContent value="re-extract" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-32 h-48 bg-muted rounded-lg overflow-hidden">
                  {isExtracting ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <img 
                      src={coverSrc} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium">Re-extract from Comic File</h4>
                <p className="text-sm text-muted-foreground">
                  Uses the first image page in the archive. Thumbnails for the first page will appear while processing.
                </p>
              </div>
              <Button 
                onClick={handleReextractCover} 
                disabled={!isElectron || isExtracting}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Re-extracting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-extract Cover
                  </>
                )}
              </Button>
              {!isElectron && (
                <p className="text-xs text-muted-foreground">
                  This feature is only available in the desktop app.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="select-page" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Select a Page as Cover</h4>
                <p className="text-sm text-muted-foreground">
                  Choose any page from the comic to use as the cover image.
                </p>
              </div>
              
              {!isElectron ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  This feature is only available in the desktop app.
                </p>
              ) : isLoadingPages ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Preparing pages...</p>
                </div>
              ) : pageLoadError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-500 font-medium">Page Loading Failed</p>
                  <p className="text-xs text-muted-foreground mt-2">{pageLoadError}</p>
                </div>
              ) : availablePages.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pages found in comic file.</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-3 gap-3">
                    {availablePages.map((pageName, index) => (
                      <div
                        key={pageName}
                        className={`text-center ${disableUi ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <div 
                          className="w-full aspect-[2/3] bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => handleUsePageAsCover(pageName)}
                          title={`Use page ${index + 1} as cover`}
                        >
                          {pageImages[pageName] ? (
                            <img 
                              src={pageImages[pageName]} 
                              alt={`Page ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {pageName}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExtracting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FixCoverModal;