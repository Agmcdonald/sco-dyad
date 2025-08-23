import { useState, useEffect, useMemo } from "react";
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
import { RATING_EMOJIS } from "@/lib/ratings";

interface LibraryProps {
  onToggleInspector?: () => void;
}

const Library = ({ onToggleInspector }: LibraryProps) => {
  const { comics } = useAppContext();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("series-asc");
  const [secondarySort, setSecondarySort] = useState("series-asc");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");
  const [coverSize, setCoverSize] = useLocalStorage("library-cover-size", 3);
  const [isDrilledDown, setIsDrilledDown] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // Handle search from sidebar
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      setIsDrilledDown(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredComics = useMemo(() => {
    let filtered = comics.filter((comic) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const inSeries = comic.series.toLowerCase().includes(lowerSearchTerm);
      const inPublisher = comic.publisher.toLowerCase().includes(lowerSearchTerm);
      const inCreators = comic.creators?.some(creator => 
        creator.name.toLowerCase().includes(lowerSearchTerm)
      ) || false;
      return inSeries || inPublisher || inCreators;
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

  const sortedAndGroupedComics = useMemo(() => {
    const comicsToSort = [...filteredComics];

    if (sortOption.startsWith('series-')) {
      const seriesGroups = new Map<string, Comic>();
      comicsToSort.forEach(comic => {
        const seriesKey = `${comic.series.toLowerCase()}-${comic.publisher.toLowerCase()}`;
        const existing = seriesGroups.get(seriesKey);
        
        // Prioritize series cover, then most recent, then first issue
        if (!existing) {
          seriesGroups.set(seriesKey, comic);
        } else {
          // If this comic is marked as series cover, use it
          if (comic.isSeriesCover) {
            seriesGroups.set(seriesKey, comic);
          }
          // If existing isn't series cover and this one is newer, use this one
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
      // Primary sort
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
        default:
          return 0;
      }

      // If primary sort is equal and we're sorting by publisher, apply secondary sort
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
            // Count issues per series for each comic
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
                placeholder="Search series, publisher, creator..."
                className="pl-8 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDrilledDown(false);
                }}
              />
            </div>
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
            <Select value={sortOption} onValueChange={(value) => {
              setSortOption(value);
              setIsDrilledDown(false);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="series-asc">Series (A-Z)</SelectItem>
                <SelectItem value="series-desc">Series (Z-A)</SelectItem>
                <SelectItem value="issue-asc">Issue (A-Z)</SelectItem>
                <SelectItem value="issue-desc">Issue (Z-A)</SelectItem>
                <SelectItem value="publisher-asc">Publisher (A-Z)</SelectItem>
                <SelectItem value="publisher-desc">Publisher (Z-A)</SelectItem>
                <SelectItem value="year-desc">Year (Newest)</SelectItem>
                <SelectItem value="year-asc">Year (Oldest)</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Secondary Sort - only show when sorting by publisher */}
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
          </div>
        </div>
        <div className="flex-1 overflow-auto pb-4 pr-4">
          {viewMode === "grid" ? (
            <LibraryGrid 
              comics={sortedAndGroupedComics} 
              coverSize={coverSize}
              sortOption={sortOption}
              onSeriesDoubleClick={sortOption.startsWith('series-') ? handleSeriesDoubleClick : undefined}
              onToggleInspector={onToggleInspector}
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