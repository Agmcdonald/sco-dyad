import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import LibraryGrid from "@/components/LibraryGrid";
import { Comic } from "@/types";

interface LibraryProps {
  comics: Comic[];
}

const Library = ({ comics }: LibraryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("series-asc");

  const filteredComics = comics.filter((comic) =>
    comic.series.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedComics = [...filteredComics].sort((a, b) => {
    switch (sortOption) {
      case "series-desc":
        return b.series.localeCompare(a.series);
      case "year-desc":
        return b.year - a.year;
      case "year-asc":
        return a.year - b.year;
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
            Browse your collection of {comics.length} comics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by series..."
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
              <SelectItem value="year-desc">Year (Newest)</SelectItem>
              <SelectItem value="year-asc">Year (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-auto pb-4">
        <LibraryGrid comics={sortedComics} />
      </div>
    </div>
  );
};

export default Library;