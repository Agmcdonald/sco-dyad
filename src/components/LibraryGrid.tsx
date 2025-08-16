import ComicCard from "./ComicCard";
import { Comic } from "@/types";

interface LibraryGridProps {
  comics: Comic[];
  coverSize: number;
  onSeriesDoubleClick?: (seriesName: string) => void;
}

const LibraryGrid = ({ comics, coverSize, onSeriesDoubleClick }: LibraryGridProps) => {
  if (comics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center rounded-lg border-2 border-dashed border-muted-foreground/50 p-12">
        <h3 className="text-lg font-semibold">Your Library is Empty</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize some comics to see them here.
        </p>
      </div>
    );
  }

  const sizeClasses: Record<number, string> = {
    1: "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12",
    2: "grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10",
    3: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  const gridClass = sizeClasses[coverSize] || sizeClasses[3];

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {comics.map((comic) => (
        <ComicCard 
          key={comic.id} 
          comic={comic} 
          onDoubleClick={onSeriesDoubleClick}
        />
      ))}
    </div>
  );
};

export default LibraryGrid;