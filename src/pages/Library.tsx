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
import { Search, Grid3X3, List, ZoomIn } from "lucide-react";
import LibraryGrid from "@/components/LibraryGrid";
import SeriesView from "@/components/SeriesView";
import { useAppContext } from "@/context/AppContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Comic } from "@/types";

type ViewMode = "grid" | "series";

const Library = () => {
  const { comics } = useAppContext();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("series-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [coverSize, setCoverSize] = useLocalStorage("library-cover-size", 3);

  // Handle search from sidebar
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredComics = useMemo(() => comics.filter((comic) =>
    comic.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comic.publisher.toLowerCase().includes(searchTerm.toLowerCase())
  ), [comics, searchTerm]);

  const sortedAndGroupedComics = useMemo(() => {
    const comicsToSort = [...filteredComics];

    if (sortOption.startsWith('series-')) {
      const seriesGroups = new Map<string, Comic>();
      comicsToSort.forEach(comic => {
        const existing = seriesGroups.get(comic.series);
        if (!existing || comic.dateAdded > existing.dateAdded) {
          seriesGroups.set(comic.series, comic);
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
      switch (sortOption) {
        case "issue-asc":
          return a.series.localeCompare(b.series) || parseInt(a.issue) - parseInt(b.issue);
        case "issue-desc":
          return a.series.localeCompare(b.series) || parseInt(b.issue) - parseInt(a.issue);
        case "publisher-asc":
          return a.publisher.localeCompare(b.publisher);
        case "publisher-desc":
          return b.publisher.localeCompare(a.publisher);
        case "year-desc":
          return b.year - a.year;
        case "year-asc":
          return a.year - b.year;
        default:
          return 0;
      }
    });
  }, [filteredComics, sortOption]);

  const handleSeriesDoubleClick = (seriesName: string) => {
    if (sortOption.startsWith('series-')) {
      setSearchTerm(seriesName);
      setSortOption('issue-asc');
    }
  };

  return (
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
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by series or publisher..."
              className="pl-8 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortOption} onValueChange={setSortOption}>
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
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "series" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("series")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto pb-4">
        {viewMode === "grid" ? (
          <LibraryGrid 
            comics={sortedAndGroupedComics} 
            coverSize={coverSize}
            onSeriesDoubleClick={handleSeriesDoubleClick}
          />
        ) : (
          <SeriesView comics={sortedAndGroupedComics} />
        )}
      </div>
    </div>
  );
};

export default Library;