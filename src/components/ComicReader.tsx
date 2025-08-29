import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Maximize,
  Minimize,
  BookOpen,
  Columns2,
  PanelBottom,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";
import { useElectron } from "@/hooks/useElectron";
import { useAppContext } from "@/context/AppContext";
import { showError, showSuccess } from "@/utils/toast";
import { RATING_EMOJIS } from "@/lib/ratings";
import RatingSelector from "./RatingSelector";
import NextIssuePreview from "./NextIssuePreview";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
  comicList?: Comic[];
  currentIndex?: number;
}

const ComicReader = ({ comic: initialComic, onClose, comicList, currentIndex }: ComicReaderProps) => {
  const { isElectron, electronAPI } = useElectron();
  const { comics, readingList, updateReadingHistory, updateComicRating, toggleComicReadStatus, updateComicProgress } = useAppContext();
  
  const [comicIndex, setComicIndex] = useState(currentIndex ?? -1);
  const [internalComic, setInternalComic] = useState(initialComic);
  
  const [pages, setPages] = useState<string[]>([]);
  const [pageImageUrls, setPageImageUrls] = useState<Record<number, string>>({});
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(internalComic.lastReadPage || 1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "double">("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading pages...");
  const [cbrTempDir, setCbrTempDir] = useState<string | null>(null);
  const fetchedPages = useRef(new Set());

  const comic = useMemo(() => {
    return comics.find(c => c.id === internalComic.id) || internalComic;
  }, [comics, internalComic]);

  const nextComic = comicList && comicIndex !== -1 && comicIndex + 1 < comicList.length ? comicList[comicIndex + 1] : null;

  const canReadComic = isElectron && !!comic.filePath;
  const isCbr = comic.filePath?.toLowerCase().endsWith('.cbr');

  const readingListItem = readingList.find(item => item.comicId === comic.id);
  const rating = comic.rating;
  const isMarkedAsRead = readingListItem?.completed || false;

  useEffect(() => {
    if (comicList && comicIndex >= 0 && comicIndex < comicList.length) {
      const newComic = comicList[comicIndex];
      if (newComic.id !== internalComic.id) {
        setInternalComic(newComic);
        setCurrentPage(newComic.lastReadPage || 1);
        setPages([]);
        setPageImageUrls({});
        fetchedPages.current.clear();
        setIsLoading(true);
        setLoadingMessage("Loading pages...");
      }
    }
  }, [comicIndex, comicList, internalComic.id]);

  useEffect(() => {
    const fetchPages = async () => {
      if (!canReadComic || !electronAPI) {
        setIsLoading(false);
        setTotalPages(isElectron ? 0 : 22);
        return;
      }

      setIsLoading(true);
      try {
        if (isCbr) {
          setLoadingMessage("Preparing comic archive...");
          const { tempDir, pages: pageList } = await electronAPI.prepareCbrForReading(comic.filePath!);
          setCbrTempDir(tempDir);
          setPages(pageList);
          setTotalPages(pageList.length);
        } else {
          setLoadingMessage("Loading pages...");
          const pageList = await electronAPI.getComicPages(comic.filePath!);
          setPages(pageList);
          setTotalPages(pageList.length);
        }
      } catch (error) {
        console.error("Failed to fetch comic pages:", error);
        showError("Failed to load comic. The file might be corrupted or too large.");
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPages();

    return () => {
      if (cbrTempDir && electronAPI) {
        electronAPI.cleanupTempDir(cbrTempDir);
      }
    };
  }, [canReadComic, electronAPI, comic.filePath, isCbr, comic.id]);

  useEffect(() => {
    const preloadPage = async (pageNumber: number, pageName: string) => {
      if (!canReadComic || !electronAPI || !pageName || fetchedPages.current.has(pageNumber)) {
        return;
      }
      fetchedPages.current.add(pageNumber);

      try {
        let dataUrl;
        if (isCbr && cbrTempDir) {
          dataUrl = await electronAPI.getPageDataUrlFromTemp(cbrTempDir, pageName);
        } else if (!isCbr) {
          dataUrl = await electronAPI.getComicPageDataUrl(comic.filePath!, pageName);
        }
        
        if (dataUrl) {
          setPageImageUrls(prev => ({ ...prev, [pageNumber]: dataUrl }));
        }
      } catch (error) {
        console.error(`Failed to load page ${pageNumber}:`, error);
        setPageImageUrls(prev => ({ ...prev, [pageNumber]: '/placeholder.svg' }));
      }
    };

    if (pages.length > 0) {
      const pagesToPreload = [currentPage];
      if (viewMode === 'double' && currentPage + 1 <= totalPages) pagesToPreload.push(currentPage + 1);
      for (let i = 1; i <= 3; i++) {
        if (currentPage + i <= totalPages) pagesToPreload.push(currentPage + i);
      }
      if (currentPage > 1) pagesToPreload.push(currentPage - 1);

      pagesToPreload.forEach(pageNum => {
        if (pageNum >= 1 && pageNum <= totalPages) {
          preloadPage(pageNum, pages[pageNum - 1]);
        }
      });
    }
  }, [canReadComic, electronAPI, comic.filePath, pages, currentPage, viewMode, totalPages, isCbr, cbrTempDir]);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(newPage);
  }, [totalPages]);

  const loadNextComic = useCallback(() => {
    if (nextComic) {
      setComicIndex(prev => prev + 1);
    }
  }, [nextComic]);

  const nextPage = useCallback(() => {
    if (currentPage === totalPages && nextComic) {
      loadNextComic();
    } else {
      goToPage(currentPage + (viewMode === "double" ? 2 : 1));
    }
  }, [currentPage, totalPages, nextComic, goToPage, viewMode, loadNextComic]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - (viewMode === "double" ? 2 : 1));
  }, [currentPage, goToPage, viewMode]);

  const handleMarkAsRead = () => {
    toggleComicReadStatus(comic);
    if (!isMarkedAsRead) {
      updateComicProgress(comic.id, totalPages, totalPages);
    }
  };

  const handleRateComic = async (newRating: number) => {
    await updateComicRating(comic.id, newRating);
    if (readingListItem && !readingListItem.completed) {
      toggleComicReadStatus(comic);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextPage();
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === "Escape") onClose();
      if (e.key === "r" || e.key === "R") handleMarkAsRead();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, onClose, handleMarkAsRead]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    
    // Save progress on unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
      if (totalPages > 0) {
        updateComicProgress(comic.id, currentPage, totalPages);
        updateReadingHistory(comic, currentPage, totalPages);
      }
    };
  }, [comic, currentPage, totalPages, updateComicProgress, updateReadingHistory]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return null;
    const imageUrl = pageImageUrls[pageNumber];
    return (
      <div className="w-full h-full flex items-center justify-center">
        {!imageUrl ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <img
            src={imageUrl || '/placeholder.svg'}
            alt={`Page ${pageNumber}`}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <header
          className={cn(
            "bg-background/80 backdrop-blur-sm text-foreground p-2 flex items-center justify-between transition-transform duration-300 absolute top-0 left-0 right-0 z-20",
            !showControls && "-translate-y-full"
          )}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="font-semibold text-sm truncate flex items-center">
                {comic.series} #{comic.issue}
                {rating !== undefined && (
                  <span className="ml-2 text-lg" title={RATING_EMOJIS[rating as keyof typeof RATING_EMOJIS]?.label}>
                    {RATING_EMOJIS[rating as keyof typeof RATING_EMOJIS]?.emoji}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Page {currentPage} / {totalPages}
            </Badge>
            {isMarkedAsRead && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Read
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="font-semibold">{loadingMessage}</p>
              <p className="text-sm mt-1">This can take a moment for large files.</p>
            </div>
          ) : !canReadComic || totalPages === 0 ? (
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4" />
              <h3 className="font-semibold">Cannot Read Comic</h3>
              <p className="text-sm max-w-xs mt-2">
                {isElectron 
                  ? "Could not load pages from the comic file. The file may be missing or corrupted."
                  : "Reading comics is only supported in the desktop application."
                }
              </p>
            </div>
          ) : currentPage === totalPages && nextComic && viewMode === 'single' ? (
            <NextIssuePreview nextComic={nextComic} onReadNext={loadNextComic} />
          ) : (
            <div
              className="transition-transform duration-200 flex gap-4 items-center justify-center"
              style={{
                transform: `scale(1) rotate(${rotation}deg)`,
                width: "100%",
                height: "100%",
              }}
            >
              {viewMode === "double" && renderPage(currentPage)}
              {renderPage(viewMode === "double" ? currentPage + 1 : currentPage)}
            </div>
          )}
        </main>

        <div
          className={cn(
            "bg-background/80 backdrop-blur-sm absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
            !showThumbnails && "translate-y-full"
          )}
        >
          <div className="flex overflow-x-auto p-2 gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageId) => (
              <div
                key={pageId}
                className={cn(
                  "h-24 w-16 rounded-sm cursor-pointer border-2 flex-shrink-0 bg-muted flex items-center justify-center",
                  currentPage === pageId
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground"
                )}
                onClick={() => goToPage(pageId)}
              >
                {pageImageUrls[pageId] ? (
                  <img
                    src={pageImageUrls[pageId]}
                    alt={`Thumbnail ${pageId}`}
                    className="w-full h-full object-cover rounded-sm"
                  />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        <footer
          className={cn(
            "bg-background/80 backdrop-blur-sm flex items-center justify-center gap-2 p-2 absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
            !showControls && "translate-y-full",
            showThumbnails && "-translate-y-[112px]"
          )}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Slider
            value={[currentPage]}
            onValueChange={([value]) => goToPage(value)}
            max={totalPages}
            min={1}
            step={1}
            className="w-32"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={nextPage}
            disabled={currentPage >= totalPages && !nextComic}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="h-6 border-l mx-2" />
          
          <RatingSelector 
            currentRating={rating} 
            onRatingChange={handleRateComic}
            size="sm"
          />

          <div className="h-6 border-l mx-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMarkedAsRead ? "default" : "outline"}
                size="icon"
                onClick={handleMarkAsRead}
                className={isMarkedAsRead ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMarkedAsRead ? "Mark as Unread" : "Mark as Read"} (R)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode(viewMode === "single" ? "double" : "single")
                }
              >
                {viewMode === "single" ? (
                  <BookOpen className="h-4 w-4" />
                ) : (
                  <Columns2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {viewMode === "single"
                  ? "Two-Page View"
                  : "Single Page View"}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rotate</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowThumbnails(!showThumbnails)}
              >
                <PanelBottom className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Thumbnails</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
            </TooltipContent>
          </Tooltip>
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default ComicReader;