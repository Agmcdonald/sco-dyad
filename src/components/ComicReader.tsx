import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useElectron } from '@/hooks/useElectron';
import { Comic } from '@/types';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Book,
  Maximize,
  Minimize,
  RefreshCw,
} from 'lucide-react';
import RatingSelector from './RatingSelector';
import NextIssuePreview from './NextIssuePreview';

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
}

const ComicReader = ({ comic: initialComic, onClose }: ComicReaderProps) => {
  const { electronAPI } = useElectron();
  const { comics, updateComicRating, toggleComicReadStatus, readingList } = useAppContext();
  const [comic, setComic] = useState(initialComic);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const cbrTempDir = useRef<string | null>(null);

  const isMarkedAsRead = useMemo(() => {
    return readingList.some(item => item.comicId === comic.id && item.completed);
  }, [readingList, comic.id]);

  const nextComicInSeries = useMemo(() => {
    const seriesComics = comics
      .filter(c => c.series === comic.series && c.publisher === comic.publisher)
      .sort((a, b) => parseInt(a.issue) - parseInt(b.issue));
    const currentIndex = seriesComics.findIndex(c => c.id === comic.id);
    return currentIndex !== -1 && currentIndex < seriesComics.length - 1
      ? seriesComics[currentIndex + 1]
      : null;
  }, [comics, comic]);

  const loadPages = useCallback(async () => {
    if (!electronAPI || !comic.filePath) {
      setError("This comic cannot be read in the current environment.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setPages([]);
    setPageImages({});

    try {
      let pageList: string[];
      if (comic.filePath.toLowerCase().endsWith('.cbr')) {
        const { tempDir, pages } = await electronAPI.prepareCbrForReading(comic.filePath);
        cbrTempDir.current = tempDir;
        pageList = pages;
      } else {
        pageList = await electronAPI.getComicPages(comic.filePath);
      }
      setPages(pageList);
    } catch (err: any) {
      setError(err.message || "Failed to load comic pages.");
    } finally {
      setIsLoading(false);
    }
  }, [electronAPI, comic.filePath]);

  useEffect(() => {
    loadPages();
    return () => {
      if (cbrTempDir.current && electronAPI) {
        electronAPI.cleanupTempDir(cbrTempDir.current);
        cbrTempDir.current = null;
      }
    };
  }, [loadPages, electronAPI]);

  const loadPageImage = useCallback(async (pageName: string) => {
    if (!electronAPI || !comic.filePath || pageImages[pageName]) return;
    try {
      let dataUrl;
      if (cbrTempDir.current) {
        dataUrl = await electronAPI.getPageDataUrlFromTemp(cbrTempDir.current, pageName);
      } else {
        dataUrl = await electronAPI.getComicPageDataUrl(comic.filePath, pageName);
      }
      setPageImages(prev => ({ ...prev, [pageName]: dataUrl }));
    } catch (err) {
      console.error(`Failed to load page ${pageName}:`, err);
    }
  }, [electronAPI, comic.filePath, pageImages]);

  useEffect(() => {
    if (pages.length > 0) {
      const preloadPages = [currentPage - 1, currentPage, currentPage + 1];
      preloadPages.forEach(pageNum => {
        if (pageNum >= 0 && pageNum < pages.length) {
          loadPageImage(pages[pageNum]);
        }
      });
    }
  }, [currentPage, pages, loadPageImage]);

  const handleNextPage = () => setCurrentPage(p => Math.min(p + (isTwoPage ? 2 : 1), pages.length));
  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - (isTwoPage ? 2 : 1)));

  const handleRatingChange = (rating: number) => {
    updateComicRating(comic.id, rating);
    setComic(prev => ({ ...prev, rating }));
  };

  const handleReadNext = () => {
    if (nextComicInSeries) {
      setComic(nextComicInSeries);
      setCurrentPage(1);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNextPage();
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'Escape') onClose();
      if (e.key.toLowerCase() === 'f') setIsFullScreen(fs => !fs);
      if (e.key.toLowerCase() === 'r') toggleComicReadStatus(comic);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isTwoPage, toggleComicReadStatus, comic]);

  const renderPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > pages.length) return null;
    const pageName = pages[pageNumber - 1];
    const imageUrl = pageImages[pageName];
    return (
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Page ${pageNumber}`}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        ) : (
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col ${isFullScreen ? '' : 'p-8'}`}
      onMouseMove={handleMouseMove}
    >
      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div>
          <h3 className="text-white font-semibold">{comic.series} #{comic.issue}</h3>
          <p className="text-sm text-gray-300">{comic.publisher} ({comic.year})</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(fs => !fs)}>
            {isFullScreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6 text-white" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center gap-4 py-16">
        {isLoading && <RefreshCw className="h-12 w-12 animate-spin text-white" />}
        {error && <p className="text-red-400">{error}</p>}
        {!isLoading && !error && pages.length > 0 && (
          <>
            {renderPage(currentPage)}
            {isTwoPage && renderPage(currentPage + 1)}
          </>
        )}
        {!isLoading && !error && currentPage > pages.length && nextComicInSeries && (
          <NextIssuePreview nextComic={nextComicInSeries} onReadNext={handleReadNext} />
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-4 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-center gap-4">
          <RatingSelector currentRating={comic.rating} onRatingChange={handleRatingChange} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsTwoPage(t => !t)}>
              <Book className="h-5 w-5 text-white mr-2" />
              <span className="text-white">{isTwoPage ? 'Single Page' : 'Two Page'}</span>
            </Button>
            <Button variant="ghost" onClick={() => toggleComicReadStatus(comic)}>
              <span className={`text-white ${isMarkedAsRead ? 'line-through' : ''}`}>Mark as Read</span>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={currentPage <= 1}>
              <ChevronLeft className="h-6 w-6 text-white" />
            </Button>
            <span className="text-white">{currentPage} / {pages.length}</span>
            <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={currentPage >= pages.length}>
              <ChevronRight className="h-6 w-6 text-white" />
            </Button>
          </div>
          <div className="w-48 flex items-center gap-2">
            <Slider value={[zoom]} onValueChange={([val]) => setZoom(val)} min={50} max={200} step={10} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComicReader;