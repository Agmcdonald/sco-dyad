import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  BookOpen,
  Columns2,
  PanelBottom,
  X,
} from "lucide-react";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
}

const ComicReader = ({ comic, onClose }: ComicReaderProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "double">("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);

  // Mock pages
  const totalPages = 22;
  const mockPages = Array.from({ length: totalPages }, (_, i) => ({
    id: i + 1,
    url: "placeholder.svg",
  }));

  // --- Core Navigation Logic ---
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

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextPage();
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, onClose]);

  // --- Control Visibility ---
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

  // --- Fullscreen Handling ---
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
    return (
      <img
        src={mockPages[pageNumber - 1].url}
        alt={`Page ${pageNumber}`}
        className="max-w-full max-h-full object-contain shadow-lg"
      />
    );
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
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

        {/* Main Reader Area */}
        <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
          <div
            className="transition-transform duration-200 flex gap-4 items-center justify-center"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              width: "100%",
              height: "100%",
            }}
          >
            {viewMode === "double" && renderPage(currentPage)}
            {renderPage(viewMode === "double" ? currentPage + 1 : currentPage)}
          </div>
        </main>

        {/* Thumbnail Strip */}
        <div
          className={cn(
            "bg-background/80 backdrop-blur-sm absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
            !showThumbnails && "translate-y-full"
          )}
        >
          <div className="flex overflow-x-auto p-2 gap-2">
            {mockPages.map((page) => (
              <img
                key={page.id}
                src={page.url}
                alt={`Thumbnail ${page.id}`}
                className={cn(
                  "h-24 w-auto rounded-sm cursor-pointer border-2",
                  currentPage === page.id
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground"
                )}
                onClick={() => goToPage(page.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <footer
          className={cn(
            "bg-background/80 backdrop-blur-sm flex items-center justify-center gap-4 p-2 absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
            !showControls && "translate-y-full",
            showThumbnails && "-translate-y-[112px]" // Adjust based on thumbnail height
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