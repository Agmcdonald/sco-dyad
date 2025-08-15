import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";
import { useElectron } from "@/hooks/useElectron";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
}

const ComicReader = ({ comic, onClose }: ComicReaderProps) => {
  const { isElectron, electronAPI } = useElectron();
  const [pages, setPages] = useState<string[]>([]);
  const [pageImageUrls, setPageImageUrls] = useState<Record<number, string>>({});
  const [totalPages, setTotalPages] = useState(22); // Default for web mode
  const [currentPage, setCurrentPage] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "double">("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canReadComic = isElectron && !!comic.filePath;
  const fetchedPages = useRef(new Set());

  // Fetch page list from Electron backend
  useEffect(() => {
    const fetchPages = async () => {
      if (canReadComic && electronAPI) {
        try {
          setIsLoading(true);
          const pageList = await electronAPI.getComicPages(comic.filePath!);
          setPages(pageList);
          setTotalPages(pageList.length);
        } catch (error) {
          console.error("Failed to fetch comic pages:", error);
          setTotalPages(0);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchPages();
  }, [canReadComic, electronAPI, comic.filePath]);

  // Fetch image data for pages
  useEffect(() => {
    const fetchPageImage = async (pageNumber: number, pageName: string) => {
      if (!canReadComic || !electronAPI || !pageName || fetchedPages.current.has(pageNumber)) {
        return;
      }
      fetchedPages.current.add(pageNumber);

      try {
        const dataUrl = await electronAPI.getComicPageDataUrl(comic.filePath!, pageName);
        setPageImageUrls(prev => ({ ...prev, [pageNumber]: dataUrl }));
      } catch (error) {
        console.error(`Failed to load page ${pageNumber}:`, error);
        setPageImageUrls(prev => ({ ...prev, [pageNumber]: '/placeholder.svg' }));
      }
    };

    if (pages.length > 0) {
      // Fetch current page(s) with priority
      fetchPageImage(currentPage, pages[currentPage - 1]);
      if (viewMode === 'double' && currentPage + 1 <= totalPages) {
        fetchPageImage(currentPage + 1, pages[currentPage]);
      }

      // Lazily fetch all other pages for thumbnails
      const timer = setTimeout(() => {
        pages.forEach((pageName, index) => {
          fetchPageImage(index + 1, pageName);
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [canReadComic, electronAPI, comic.filePath, pages, currentPage, viewMode, totalPages]);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(newPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + (viewMode === "double" ? 2 : 1));
  }, [currentPage, goToPage, viewMode]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - (viewMode === "double" ? 2 : 1));
  }, [currentPage, goToPage, viewMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextPage();
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, onClose]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
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
              <h2 className="font-semibold text-sm truncate">
                {comic.series} #{comic.issue}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Page {currentPage} / {totalPages}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                  "h-24 w-16 rounded-sm cursor-pointer border-2 flex-shrink-0 bg-muted",
                  currentPage === pageId
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground"
                )}
                onClick={() => goToPage(pageId)}
              >
                {pageImageUrls[pageId] && (
                  <img
                    src={pageImageUrls[pageId]}
                    alt={`Thumbnail ${pageId}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <footer
          className={cn(
            "bg-background/80 backdrop-blur-sm flex items-center justify-center gap-4 p-2 absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
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
          <div className="flex items-center gap-2">
            <Slider
              value={[currentPage]}
              onValueChange={([value]) => goToPage(value)}
              max={totalPages}
              min={1}
              step={1}
              className="w-48"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="h-6 border-l mx-2" />

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