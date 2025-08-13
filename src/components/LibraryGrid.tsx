import ComicCard from "./ComicCard";

interface Comic {
  id: number;
  coverUrl: string;
  series: string;
  issue: string;
  year: number;
}

interface LibraryGridProps {
  comics: Comic[];
}

const LibraryGrid = ({ comics }: LibraryGridProps) => {
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
      {comics.map((comic) => (
        <ComicCard key={comic.id} comic={comic} />
      ))}
    </div>
  );
};

export default LibraryGrid;