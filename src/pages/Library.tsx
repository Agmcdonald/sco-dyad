import { useState, useEffect } from "react";
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
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredComics = comics.filter((comic) =>
    comic.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comic.publisher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedComics = [...filteredComics].sort((a, b) => {
    switch (sortOption) {
      case "series-desc":
        return b.series.localeCompare(a.series);
      case "year-desc":
        return b.year - a.year;
      case "year-asc":
        return a.year - b.year;
      case "publisher-asc":
        return a.publisher.localeCompare(b.publisher);
      case "publisher-desc":
        return b.publisher.localeCompare(a.publisher);
      case "series-asc":
      default:
        return a.series.localeCompare(b.series);
    }
  });

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse your collection of {comics.length} comics
            {searchTerm && ` (${sortedComics.length} matching "${searchTerm}")`}.
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
          <LibraryGrid comics={sortedComics} coverSize={coverSize} />
        ) : (
          <SeriesView comics={sortedComics} />
        )}
      </div>
    </div>
  );
};

export default Library;