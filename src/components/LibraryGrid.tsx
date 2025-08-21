import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import ComicCard from "./ComicCard";
import LibraryBulkActions from "./LibraryBulkActions";
import { Comic } from "@/types";

interface LibraryGridProps {
  comics: Comic[];
  coverSize: number;
  sortOption: string;
  onSeriesDoubleClick?: (seriesName: string) => void;
  onToggleInspector?: () => void;
}

const LibraryGrid = ({ comics, coverSize, sortOption, onSeriesDoubleClick, onToggleInspector }: LibraryGridProps) => {
  const [selectedComics, setSelectedComics] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Group comics by publisher when sorting by publisher
  const groupedComics = useMemo(() => {
    if (sortOption.startsWith('publisher-')) {
      const groups = comics.reduce((acc, comic) => {
        const publisher = comic.publisher;
        if (!acc[publisher]) {
          acc[publisher] = [];
        }
        acc[publisher].push(comic);
        return acc;
      }, {} as Record<string, Comic[]>);

      // Sort publishers and comics within each group
      return Object.entries(groups)
        .sort(([a], [b]) => sortOption === 'publisher-asc' ? a.localeCompare(b) : b.localeCompare(a))
        .map(([publisher, groupComics]) => ({
          publisher,
          // Sort comics within each publisher group alphabetically by series, then by issue
          comics: groupComics.sort((a, b) => {
            const seriesCompare = a.series.localeCompare(b.series);
            if (seriesCompare !== 0) return seriesCompare;
            return parseInt(a.issue) - parseInt(b.issue);
          })
        }));
    }
    
    // For non-publisher sorting, return all comics in one group
    return [{ publisher: null, comics }];
  }, [comics, sortOption]);

  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedComics([]);
    }
  };

  const handleComicSelection = (comicId: string, selected: boolean) => {
    if (selected) {
      setSelectedComics(prev => [...prev, comicId]);
    } else {
      setSelectedComics(prev => prev.filter(id => id !== comicId));
    }
  };

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
    <div className="space-y-4">
      {/* Selection Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="selection-mode"
            checked={selectionMode}
            onCheckedChange={handleToggleSelectionMode}
          />
          <label htmlFor="selection-mode" className="text-sm font-medium">
            Selection Mode
          </label>
        </div>
        {selectionMode && selectedComics.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedComics.length} comic{selectedComics.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectionMode && (
        <LibraryBulkActions
          comics={comics}
          selectedComics={selectedComics}
          onSelectionChange={setSelectedComics}
        />
      )}

      {/* Comics Grid with Publisher Headers */}
      <div className="space-y-6">
        {groupedComics.map(({ publisher, comics: groupComics }, groupIndex) => (
          <div key={publisher || 'all'} className="space-y-4">
            {/* Publisher Header - only show when sorting by publisher */}
            {publisher && sortOption.startsWith('publisher-') && (
              <div className="border-b pb-2">
                <h2 className="text-xl font-semibold text-foreground">{publisher}</h2>
                <p className="text-sm text-muted-foreground">
                  {groupComics.length} comic{groupComics.length !== 1 ? 's' : ''} • {[...new Set(groupComics.map(c => c.series))].length} series
                </p>
              </div>
            )}
            
            {/* Comics Grid */}
            <div className={`grid ${gridClass} gap-4`}>
              {groupComics.map((comic) => (
                <div key={comic.id} className="relative">
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedComics.includes(comic.id)}
                        onCheckedChange={(checked) => handleComicSelection(comic.id, Boolean(checked))}
                        className="bg-background border-2 shadow-sm"
                      />
                    </div>
                  )}
                  <ComicCard 
                    comic={comic} 
                    onDoubleClick={onSeriesDoubleClick}
                    onToggleInspector={onToggleInspector}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryGrid;