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

// Mock data for the library
const mockComics = [
  { id: 1, coverUrl: "/placeholder.svg", series: "Saga", issue: "61", year: 2023 },
  { id: 2, coverUrl: "/placeholder.svg", series: "Batman: The Knight", issue: "3", year: 2022 },
  { id: 3, coverUrl: "/placeholder.svg", series: "Weird Comic", issue: "4", year: 2021 },
  { id: 4, coverUrl: "/placeholder.svg", series: "The Amazing Spider-Man", issue: "1", year: 1963 },
  { id: 5, coverUrl: "/placeholder.svg", series: "Action Comics", issue: "1", year: 1938 },
  { id: 6, coverUrl: "/placeholder.svg", series: "Detective Comics", issue: "27", year: 1939 },
  { id: 7, coverUrl: "/placeholder.svg", series: "Radiant Black", issue: "1", year: 2021 },
  { id: 8, coverUrl: "/placeholder.svg", series: "Invincible", issue: "1", year: 2003 },
  { id: 9, coverUrl: "/placeholder.svg", series: "Monstress", issue: "1", year: 2015 },
  { id: 10, coverUrl: "/placeholder.svg", series: "Paper Girls", issue: "1", year: 2015 },
  { id: 11, coverUrl: "/placeholder.svg", series: "The Wicked + The Divine", issue: "1", year: 2014 },
  { id: 12, coverUrl: "/placeholder.svg", series: "East of West", issue: "1", year: 2013 },
];

const Library = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("series-asc");

  const filteredComics = mockComics.filter((comic) =>
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
            Browse your collection of {mockComics.length} comics.
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