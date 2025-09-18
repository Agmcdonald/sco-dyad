import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { useAppContext } from "@/context/AppContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Comic, LibraryViewMode } from "@/types";
import { RATING_EMOJIS, CONTENT_RATINGS } from "@/lib/ratings";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LibraryBulkActions from "@/components/LibraryBulkActions";

interface LibraryProps {
  /** Optional callback to toggle the inspector panel. */
  onToggleInspector?: () => void;
}

/**
 * @component Library
 * @summary The main page for browsing and managing the comic book collection.
 * @description This component serves as the central hub for the user's library. It provides
 * extensive functionality for searching, sorting, and filtering comics. It also manages
 * different view modes (grid, series, publisher) and handles user interactions like
 * cover size adjustments and bulk actions through a selection mode.
 * @param {LibraryProps} props - The props for the Library component.
 */
const Library = ({ onToggleInspector }: LibraryProps) => {
  const { comics, readingList } = useAppContext();
  const location = useLocation();

  // --- State Management ---
  /** Manages the current search term entered by the user. */
  const [searchTerm, setSearchTerm] = useState("");
  /** Manages the primary sorting option for the library view, persisted in local storage. */
  const [sortOption, setSortOption] = useLocalStorage("library-sort-option", "issue-asc");
  /** Manages the secondary sorting option, used when the primary sort is by publisher. */
  const [secondarySort, setSecondarySort] = useLocalStorage("library-secondary-sort", "series-asc");
  /** Manages the current view mode (grid, series, or publisher), persisted in local storage. */
  const [viewMode, setViewMode] = useLocalStorage<LibraryViewMode>("library-view-mode", "grid");
  /** Manages the size of the comic covers in the grid view, persisted in local storage. */
  const [coverSize, setCoverSize] = useLocalStorage("library-cover-size", 3);
  /** Tracks if the user has "drilled down" into a specific series from the series view. */
  const [isDrilledDown, setIsDrilledDown] = useState(false);
  /** Manages the filter for comic ratings. */
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  /** Manages the filter for read/unread status. */
  const [readStatusFilter, setReadStatusFilter] = useState<string>("all");
  /** Manages the filter for content ratings (e.g., "Teen", "Mature"). */
  const [contentRatingFilter, setContentRatingFilter] = useState<string>("all");
  /** Stores the IDs of comics selected for bulk actions. */
  const [selectedComics, setSelectedComics] = useState<string[]>([]);
  /** Toggles the visibility of bulk action controls. */
  const [selectionMode, setSelectionMode] = useLocalStorage("library-selection-mode", false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Effect to handle incoming search terms from other parts of the app (e.g., sidebar). */
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      setIsDrilledDown(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /** Effect to restore the scroll position of the library view when the component mounts. */
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("library-scroll-position");
    if (savedScrollPosition && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition, 10);
        }
      }, 100);
    }
  }, []);

  /** Callback to save the current scroll position to session storage, debounced for performance. */
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        sessionStorage.setItem("library-scroll-position", String(scrollContainerRef.current.scrollTop));
      }
    }, 200);
  }, []);

  /** Memoized calculation to filter comics based on search term and active filters. */
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
      if (!isNaN(searchAsNum)) {
        const issueAsNum = Number(comic.issue);
        if (!isNaN(issueAsNum) && issueAsNum === searchAsNum) {
          inIssue = true;
        }
      } else {
        inIssue = comic.issue.toLowerCase().includes(lowerSearchTerm);
      }

      return inSeries || inPublisher || inCreators || inIssue;
    });

    if (readStatusFilter !== "all") {
      const readComicIds = new Set(
        readingList.filter(item => item.completed).map(item => item.comicId)
      );
      if (readStatusFilter === "read") {
        filtered = filtered.filter(comic => readComicIds.has(comic.id));
      } else {
        filtered = filtered.filter(comic => !readComicIds.has(comic.id));
      }
    }

    if (ratingFilter !== "all") {
      if (ratingFilter === "unrated") {
        filtered = filtered.filter(comic => comic.rating === undefined);
      } else {
        const targetRating = parseInt(ratingFilter);
        filtered = filtered.filter(comic => comic.rating === targetRating);
      }
    }

    if (contentRatingFilter !== "all") {
      if (contentRatingFilter === "none") {
        filtered = filtered.filter(comic => !comic.contentRating);
      } else {
        filtered = filtered.filter(comic => comic.contentRating === contentRatingFilter);
      }
    }

    return filtered;
  }, [comics, searchTerm, ratingFilter, readStatusFilter, contentRatingFilter, readingList]);

  /** Memoized calculation to sort and group the filtered comics based on the selected view and sort options. */
  const sortedAndGroupedComics = useMemo(() => {
    const comicsToSort = [...filteredComics];

    if (sortOption.startsWith('series-')) {
      const seriesGroups = new Map<string, Comic>();
      comicsToSort.forEach(comic => {
        const seriesKey = `${comic.series.toLowerCase()}-${comic.publisher.toLowerCase()}`;
        const existing = seriesGroups.get(seriesKey);
        
        if (!existing) {
          seriesGroups.set(seriesKey, comic);
        } else {
          if (comic.isSeriesCover) {
            seriesGroups.set(seriesKey, comic);
          }
          else if (!existing.isSeriesCover && comic.dateAdded > existing.dateAdded) {
            seriesGroups.set(seriesKey, comic);
          }
        }
      });
      const latestComics = Array.from(seriesGroups.values());
      
      if (sortOption === 'series-asc') {
        return latestComics.sort((a, b) => a.series.localeCompare(b.series));
      }
      if (sortOption === 'series-desc') {
        return latestComics.sort((a, b) => b.series.localeCompare(a.series));
      }
    }

    return comicsToSort.sort((a, b) => {
      let primaryCompare = 0;
      switch (sortOption) {
        case "issue-asc":
          primaryCompare = a.series.localeCompare(b.series) || parseInt(a.issue) - parseInt(b.issue);
          break;
        case "issue-desc":
          primaryCompare = a.series.localeCompare(b.series) || parseInt(b.issue) - parseInt(a.issue);
          break;
        case "publisher-asc":
          primaryCompare = a.publisher.localeCompare(b.publisher);
          break;
        case "publisher-desc":
          primaryCompare = b.publisher.localeCompare(a.publisher);
          break;
        case "year-desc":
          primaryCompare = b.year - a.year;
          break;
        case "year-asc":
          primaryCompare = a.year - b.year;
          break;
        case "date-added-desc":
          primaryCompare = b.dateAdded.getTime() - a.dateAdded.getTime();
          break;
        case "date-added-asc":
          primaryCompare = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        default:
          return 0;
      }

      if (primaryCompare === 0 && sortOption.startsWith('publisher-')) {
        switch (secondarySort) {
          case "series-asc":
            return a.series.localeCompare(b.series);
          case "series-desc":
            return b.series.localeCompare(a.series);
          case "year-asc":
            return a.year - b.year;
          case "year-desc":
            return b.year - a.year;
          case "issue-count-desc":
            const aIssueCount = comicsToSort.filter(c => c.series === a.series && c.publisher === a.publisher).length;
            const bIssueCount = comicsToSort.filter(c => c.series === b.series && c.publisher === b.publisher).length;
            return bIssueCount - aIssueCount;
          case "issue-count-asc":
            const aIssueCountAsc = comicsToSort.filter(c => c.series === a.series && c.publisher === a.publisher).length;
            const bIssueCountAsc = comicsToSort.filter(c => c.series === b.series && c.publisher === b.publisher).length;
            return aIssueCountAsc - bIssueCountAsc;
          default:
            return a.series.localeCompare(b.series);
        }
      }

      return primaryCompare;
    });
  }, [filteredComics, sortOption, secondarySort]);

  /** Handles the double-click event on a series card to "drill down" into that series. */
  const handleSeriesDoubleClick = (seriesName: string) => {
    if (sortOption.startsWith('series-')) {
      setSearchTerm(seriesName);
      setSortOption('issue-asc');
      setIsDrilledDown(true);
    }
  };

  /** Handles returning to the main series or publisher view after drilling down. */
  const handleBackToSeriesView = () => {
    setSearchTerm('');
    setSortOption('series-asc');
    setIsDrilledDown(false);
  };

  /** Clears all currently selected comics in selection mode. */
  const handleClearSelection = useCallback(() => {
    setSelectedComics([]);
  }, []);

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDrilledDown(false);
                }}
              />
            </div>
            <Select value={readStatusFilter} onValueChange={setReadStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Read Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
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
            <Select value={contentRatingFilter} onValueChange={setContentRatingFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Content Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="none">Not Rated</SelectItem>
                {Object.entries(CONTENT_RATINGS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {key} - {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={(value) => {
              setSortOption(value);
              setIsDrilledDown(false);
            }}>
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
                <SelectItem value="date-added-desc">Recently Added</SelectItem>
                <SelectItem value="date-added-asc">Earliest Added</SelectItem>
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
                  <SelectItem value="issue-count-desc">Most Issues</SelectItem>
                  <SelectItem value="issue-count-asc">Fewest Issues</SelectItem>
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
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Grid View</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "series" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("series")}
                    className="rounded-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Series View</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "publisher" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("publisher")}
                    className="rounded-l-none"
                  >
                    <Building className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Publisher View</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selection-mode"
                checked={selectionMode}
                onCheckedChange={(checked) => setSelectionMode(Boolean(checked))}
              />
              <Label htmlFor="selection-mode" className="text-sm font-medium">
                Selection Mode
              </Label>
            </div>
          </div>
        </div>
        {selectionMode && (
          <div className="sticky top-0 z-10 bg-background py-4 -mt-4">
            <LibraryBulkActions
              comics={filteredComics}
              selectedComics={selectedComics}
              onSelectionChange={setSelectedComics}
              totalComics={filteredComics.length}
              onClearSelection={handleClearSelection}
            />
          </div>
        )}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto pb-4 pr-4">
          {viewMode === "grid" ? (
            <LibraryGrid 
              comics={sortedAndGroupedComics} 
              coverSize={coverSize}
              sortOption={sortOption}
              onSeriesDoubleClick={sortOption.startsWith('series-') ? handleSeriesDoubleClick : undefined}
              onToggleInspector={onToggleInspector}
              selectionMode={selectionMode}
              selectedComics={selectedComics}
              onSelectionChange={setSelectedComics}
            />
          ) : viewMode === "series" ? (
            <SeriesView comics={sortedAndGroupedComics} sortOption={sortOption} />
          ) : (
            <PublisherView comics={filteredComics} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Library;