import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Upload, 
  Link, 
  Image as ImageIcon, 
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

interface FixCoverModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const FixCoverModal = ({ comic, isOpen, onClose }: FixCoverModalProps) => {
  const { updateComic } = useAppContext();
  const { isElectron, electronAPI } = useElectron();
  const [isExtracting, setIsExtracting] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [pageLoadError, setPageLoadError] = useState("");

  // Load available pages from the comic file
  useEffect(() => {
    const loadPages = async () => {
      if (!isElectron || !electronAPI || !comic.filePath) return;
      
      setIsLoadingPages(true);
      setPageLoadError("");
      try {
        console.log('[FIX-COVER] Loading pages for:', comic.filePath);
        const pages = await electronAPI.getComicPages(comic.filePath);
        console.log('[FIX-COVER] Found pages:', pages);
        
        if (!pages || pages.length === 0) {
          setPageLoadError("No pages found in comic file. The file might be corrupted or in an unsupported format.");
          setAvailablePages([]);
          return;
        }
        
        setAvailablePages(pages.slice(0, 10)); // Show first 10 pages
        
        // Load thumbnails for the first few pages
        const thumbnails: Record<string, string> = {};
        for (let i = 0; i < Math.min(pages.length, 5); i++) {
          try {
            console.log(`[FIX-COVER] Loading thumbnail for page: ${pages[i]}`);
            const pageDataUrl = await electronAPI.getComicPageDataUrl(comic.filePath!, pages[i]);
            thumbnails[pages[i]] = pageDataUrl;
            console.log(`[FIX-COVER] Successfully loaded thumbnail for page: ${pages[i]}`);
          } catch (error) {
            console.warn(`[FIX-COVER] Could not load thumbnail for page ${pages[i]}:`, error);
          }
        }
        setPageImages(thumbnails);
      } catch (error) {
        console.error('[FIX-COVER] Error loading comic pages:', error);
        setPageLoadError(`Error loading pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAvailablePages([]);
      } finally {
        setIsLoadingPages(false);
      }
    };

    if (isOpen) {
      loadPages();
    }
  }, [isOpen, isElectron, electronAPI, comic.filePath]);

  const handleReextractCover = async () => {
    if (!isElectron || !electronAPI || !comic.filePath) {
      showError("Cover re-extraction is only available in the desktop app.");
      return;
    }

    setIsExtracting(true);
    try {
      const newCoverUrl = await electronAPI.extractCover(comic.filePath);
      const updatedComic = { ...comic, coverUrl: newCoverUrl };
      await updateComic(updatedComic);
      showSuccess("Cover re-extracted successfully!");
      onClose();
    } catch (error) {
      console.error('Error re-extracting cover:', error);
      showError("Failed to re-extract cover from comic file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUseCustomUrl = async () => {
    if (!customUrl.trim()) {
      showError("Please enter a valid image URL.");
      return;
    }

    try {
      console.log('[FIX-COVER] Setting custom URL:', customUrl.trim());
      const updatedComic = { ...comic, coverUrl: customUrl.trim() };
      await updateComic(updatedComic);
      showSuccess("Custom cover image set successfully!");
      onClose();
    } catch (error) {
      console.error('[FIX-COVER] Error setting custom URL:', error);
      showError("Failed to set custom cover URL.");
    }
  };

  const handleUsePageAsCover = async (pageName: string) => {
    if (!isElectron || !electronAPI || !comic.filePath) return;

    try {
      console.log('[FIX-COVER] Using page as cover:', pageName);
      // Get the page as a data URL
      const pageDataUrl = await electronAPI.getComicPageDataUrl(comic.filePath, pageName);
      
      // Use the data URL directly as the cover
      const updatedComic = { ...comic, coverUrl: pageDataUrl };
      await updateComic(updatedComic);
      showSuccess(`Set page "${pageName}" as the cover!`);
      onClose();
    } catch (error) {
      console.error('[FIX-COVER] Error using page as cover:', error);
      showError("Failed to use page as cover.");
    }
  };

  const handlePreviewUrl = () => {
    if (!customUrl.trim()) {
      setPreviewError("Please enter a URL first");
      return;
    }

    console.log('[FIX-COVER] Testing preview URL:', customUrl.trim());
    setPreviewError("");
    setPreviewUrl("");

    // Test if the URL is a valid image
    const img = new Image();
    img.crossOrigin = "anonymous"; // Try to handle CORS
    img.onload = () => {
      console.log('[FIX-COVER] Preview image loaded successfully');
      setPreviewUrl(customUrl.trim());
      setPreviewError("");
    };
    img.onerror = (error) => {
      console.error('[FIX-COVER] Preview image failed to load:', error);
      setPreviewError("Could not load image from URL. This might be due to CORS restrictions or an invalid URL.");
      setPreviewUrl("");
    };
    img.src = customUrl.trim();
  };

  // Clear preview when URL changes
  useEffect(() => {
    setPreviewUrl("");
    setPreviewError("");
  }, [customUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Fix Cover for "{comic.series} #{comic.issue}"
          </DialogTitle>
          <DialogDescription>
            Choose a method to fix or replace the cover image for this comic.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="re-extract" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="re-extract">Re-extract</TabsTrigger>
            <TabsTrigger value="custom-url">Custom URL</TabsTrigger>
            <TabsTrigger value="select-page">Select Page</TabsTrigger>
          </TabsList>

          <TabsContent value="re-extract" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-32 h-48 bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={comic.coverUrl} 
                    alt="Current cover" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-medium">Re-extract from Comic File</h4>
                <p className="text-sm text-muted-foreground">
                  Extract the cover again from the original comic file. This might fix corrupted covers.
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

          <TabsContent value="custom-url" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cover-url">Image URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="cover-url"
                    placeholder="https://example.com/cover.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                  <Button variant="outline" onClick={handlePreviewUrl}>
                    Preview
                  </Button>
                </div>
                {previewError && (
                  <p className="text-sm text-red-500 mt-1">{previewError}</p>
                )}
              </div>
              
              {previewUrl && (
                <div className="text-center">
                  <div className="w-32 h-48 bg-muted rounded-lg overflow-hidden mx-auto">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={() => {
                        setPreviewUrl("");
                        setPreviewError("Failed to load preview image");
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Preview</p>
                </div>
              )}

              <div>
                <h4 className="font-medium">Use Custom Image URL</h4>
                <p className="text-sm text-muted-foreground">
                  Enter a direct link to an image file to use as the cover. Note: Some websites block external access to their images (CORS policy).
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Tip:</strong> Even if the preview doesn't work, you can still try using the URL - it might work as a cover even if preview fails.
                </p>
              </div>
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
                  <p className="text-sm text-muted-foreground">Loading pages...</p>
                </div>
              ) : pageLoadError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-500 font-medium">Page Loading Failed</p>
                  <p className="text-xs text-muted-foreground mt-2">{pageLoadError}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This comic file format might not support page extraction, or the file could be corrupted.
                  </p>
                </div>
              ) : availablePages.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pages found in comic file.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This might happen if the file is corrupted or in an unsupported format.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-3 gap-3">
                    {availablePages.map((pageName, index) => (
                      <div key={pageName} className="text-center">
                        <div 
                          className="w-full aspect-[2/3] bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => handleUsePageAsCover(pageName)}
                        >
                          {pageImages[pageName] ? (
                            <img 
                              src={pageImages[pageName]} 
                              alt={`Page ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-xs text-muted-foreground">
                                Page {index + 1}
                              </div>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {customUrl && (
            <Button onClick={handleUseCustomUrl}>
              <Link className="mr-2 h-4 w-4" />
              Use Custom URL
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FixCoverModal;