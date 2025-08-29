import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Grid3X3, List, ZoomIn, ArrowLeft, Building } from "lucide-react";
import LibraryGrid from "@/components/LibraryGrid";
import SeriesView from "@/components/SeriesView";
import PublisherView from "@/components/PublisherView";
import ComicReader from "@/components/ComicReader";
import { useAppContext } from "@/context/AppContext";
import { useLibraryContext } from "@/context/LibraryContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import useSessionStorage from "@/hooks/useSessionStorage";
import { Comic, LibraryViewMode } from "@/types";
import { RATING_EMOJIS } from "@/lib/ratings";

interface LibraryProps {
  onToggleInspector?: () => void;
}

const Library = ({ onToggleInspector }: LibraryProps) => {
  const { comics } = useAppContext();
  const { setSortedComics } = useLibraryContext();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useLocalStorage("library-sort-option", "issue-asc");
  const [secondarySort, setSecondarySort] = useLocalStorage("library-secondary-sort", "series-asc");
  const [viewMode, setViewMode] = useLocalStorage<LibraryViewMode>("library-view-mode", "grid");
  const [coverSize, setCoverSize] = useLocalStorage("library-cover-size", 3);
  const [isDrilledDown, setIsDrilledDown] = useState(false);
  const [ratingFilter, setRatingFilter] = useLocalStorage("library-rating-filter", "all");
  const [readingComic, setReadingComic] = useState<Comic | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useSessionStorage('library-scroll-position', 0);

  // Handle search from sidebar
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      setIsDrilledDown(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const resetScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setScrollPosition(0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDrilledDown(false);
    resetScrollPosition();
  };

  const handleSortChange = (value: string) => {
    setSortOption(value);
    setIsDrilledDown(false);
    resetScrollPosition();
  };

  const handleViewModeChange = (mode: LibraryViewMode) => {
    setViewMode(mode);
    resetScrollPosition();
  };

  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value);
    resetScrollPosition();
  };

  const handleReadComic = (comic: Comic) => {
    setReadingComic(comic);
  };

  const filteredComics = useMemo(() => {
    let filtered = comics.filter((comic) => {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      if (!lowerSearchTerm) return true;

      const inSeries = comic.series.toLowerCase().includes(lowerSearchTerm);
      const inPublisher = comic.publisher.toLowerCase().includes(lowerSearchTerm);
      const inCreators = comic.creators?.some(creator => 
        creator.name.toLowerCase().includes(lowerSearchTerm)
      ) || false;
      
      let inIssue = false;
      const searchAsNum = Number(lowerSearchTerm);
      if (!isNaN(searchAsNum)) { // If search term is a number
        const issueAsNum = Number(comic.issue);
        if (!isNaN(issueAsNum) && issueAsNum === searchAsNum) {
          inIssue = true;
        }
      } else { // If search term is not a number (e.g., "Annual")
        inIssue = comic.issue.toLowerCase().includes(lowerSearchTerm);
      }

      return inSeries || inPublisher || inCreators || inIssue;
    });

    // Apply rating filter
    if (ratingFilter !== "all") {
      if (ratingFilter === "unrated") {
        filtered = filtered.filter(comic => comic.rating === undefined);
      } else {
        const targetRating = parseInt(ratingFilter);
        filtered = filtered.filter(comic => comic.rating === targetRating);
      }
    }

    return filtered;
  }, [comics, searchTerm, ratingFilter]);

  const sortedComicsForContext = useMemo(() => {
    const comicsToSort = [...filteredComics];
    return comicsToSort.sort((a, b) => {
      let primaryCompare = 0;
      switch (sortOption) {
        case "issue-asc": primaryCompare = a.series.localeCompare(b.series) || parseInt(a.issue) - parseInt(b.issue); break;
        case "issue-desc": primaryCompare = a.series.localeCompare(b.series) || parseInt(b.issue) - parseInt(a.issue); break;
        case "publisher-asc": primaryCompare = a.publisher.localeCompare(b.publisher); break;
        case "publisher-desc": primaryCompare = b.publisher.localeCompare(a.publisher); break;
        case "year-desc": primaryCompare = b.year - a.year; break;
        case "year-asc": primaryCompare = a.year - b.year; break;
        case "series-asc": primaryCompare = a.series.localeCompare(b.series); break;
        case "series-desc": primaryCompare = b.series.localeCompare(a.series); break;
        default: return 0;
      }

      if (primaryCompare === 0) {
        if (sortOption.startsWith('publisher-')) {
          switch (secondarySort) {
            case "series-asc": return a.series.localeCompare(b.series) || parseInt(a.issue) - parseInt(b.issue);
            case "series-desc": return b.series.localeCompare(a.series) || parseInt(a.issue) - parseInt(b.issue);
            case "year-asc": return a.year - b.year || parseInt(a.issue) - parseInt(b.issue);
            case "year-desc": return b.year - a.year || parseInt(a.issue) - parseInt(b.issue);
            default: return a.series.localeCompare(b.series) || parseInt(a.issue) - parseInt(b.issue);
          }
        }
        return parseInt(a.issue) - parseInt(b.issue);
      }
      return primaryCompare;
    });
  }, [filteredComics, sortOption, secondarySort]);

  useEffect(() => {
    setSortedComics(sortedComicsForContext);
  }, [sortedComicsForContext, setSortedComics]);

  const sortedAndGroupedComics = useMemo(() => {
    if (sortOption.startsWith('series-')) {
      const seriesGroups = new Map<string, Comic>();
      sortedComicsForContext.forEach(comic => {
        const seriesKey = `${comic.series.toLowerCase()}-${comic.publisher.toLowerCase()}`;
        const existing = seriesGroups.get(seriesKey);
        
        if (!existing || comic.isSeriesCover || (!existing.isSeriesCover && comic.dateAdded > existing.dateAdded)) {
          seriesGroups.set(seriesKey, comic);
        }
      });
      const latestComics = Array.from(seriesGroups.values());
      
      return sortOption === 'series-asc'
        ? latestComics.sort((a, b) => a.series.localeCompare(b.series))
        : latestComics.sort((a, b) => b.series.localeCompare(a.series));
    }
    return sortedComicsForContext;
  }, [sortedComicsForContext, sortOption]);

  const handleSeriesDoubleClick = (seriesName: string) => {
    if (sortOption.startsWith('series-')) {
      setSearchTerm(seriesName);
      setSortOption('issue-asc');
      setIsDrilledDown(true);
    }
  };

  const handleBackToSeriesView = () => {
    setSearchTerm('');
    setSortOption('series-asc');
    setIsDrilledDown(false);
  };

  const isPublisherSort = sortOption.startsWith('publisher-');

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse your collection of {comics.length} comics
              {searchTerm && ` (${sortedAndGroupedComics.length} matching "${searchTerm}")`}.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isDrilledDown && (
              <Button variant="outline" onClick={handleBackToSeriesView}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Series
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search series, issue, publisher, creator..."
                className="pl-8 w-full md:w-64"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <Select value={ratingFilter} onValueChange={handleRatingFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="unrated">Unrated</SelectItem>
                {Object.entries(RATING_EMOJIS).map(([rating, { emoji }]) => (
                  <SelectItem key={rating} value={rating}>
                    {emoji} {rating}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issue-asc">Issue (A-Z)</SelectItem>
                <SelectItem value="issue-desc">Issue (Z-A)</SelectItem>
                <SelectItem value="series-asc">Series (A-Z)</SelectItem>
                <SelectItem value="series-desc">Series (Z-A)</SelectItem>
                <SelectItem value="publisher-asc">Publisher (A-Z)</SelectItem>
                <SelectItem value="publisher-desc">Publisher (Z-A)</SelectItem>
                <SelectItem value="year-desc">Year (Newest)</SelectItem>
                <SelectItem value="year-asc">Year (Oldest)</SelectItem>
              </SelectContent>
            </Select>
            
            {isPublisherSort && (
              <Select value={secondarySort} onValueChange={setSecondarySort}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Then by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="series-asc">Series (A-Z)</SelectItem>
                  <SelectItem value="series-desc">Series (Z-A)</SelectItem>
                  <SelectItem value="year-asc">Year (Oldest)</SelectItem>
                  <SelectItem value="year-desc">Year (Newest)</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[coverSize]}
                onValueChange={([value]) => setCoverSize(value)}
                min={1}
                max={5}
                step={1}
                className="w-32"
              />
            </div>
            <div className="flex border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => handleViewModeChange("grid")} className="rounded-r-none">
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Grid View</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === "series" ? "default" : "ghost"} size="sm" onClick={() => handleViewModeChange("series")} className="rounded-none">
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Series View</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === "publisher" ? "default" : "ghost"} size="sm" onClick={() => handleViewModeChange("publisher")} className="rounded-l-none">
                    <Building className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Publisher View</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div ref={scrollContainerRef} onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)} className="flex-1 overflow-auto pb-4 pr-4">
          {viewMode === "grid" ? (
            <LibraryGrid 
              comics={sortedAndGroupedComics} 
              coverSize={coverSize}
              sortOption={sortOption}
              onSeriesDoubleClick={sortOption.startsWith('series-') ? handleSeriesDoubleClick : undefined}
              onToggleInspector={onToggleInspector}
              onRead={handleReadComic}
            />
          ) : viewMode === "series" ? (
            <SeriesView comics={sortedComicsForContext} sortOption={sortOption} onRead={handleReadComic} />
          ) : (
            <PublisherView comics={filteredComics} onRead={handleReadComic} />
          )}
        </div>
      </div>
      {readingComic && (
        <ComicReader
          comic={readingComic}
          onClose={() => setReadingComic(null)}
          comicList={sortedComicsForContext}
          currentIndex={sortedComicsForContext.findIndex(c => c.id === readingComic.id)}
        />
      )}
    </TooltipProvider>
  );
};

export default Library;