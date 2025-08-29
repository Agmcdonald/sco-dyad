import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { getCoverUrl } from "@/lib/cover";
import { BookOpen } from "lucide-react";

interface ComicCardProps {
  comic: Comic;
  onDoubleClick?: (seriesName: string) => void;
  onToggleInspector?: () => void;
  selectionMode?: boolean;
  isSelectedForBulk?: boolean;
  onBulkSelect?: () => void;
}

const ComicCard = ({ 
  comic, 
  onDoubleClick, 
  onToggleInspector,
  selectionMode = false,
  isSelectedForBulk = false,
  onBulkSelect
}: ComicCardProps) => {
  const { selectedItem, setSelectedItem } = useSelection();
  const { setReadingComic } = useAppContext();
  const [imageError, setImageError] = useState(false);

  const isSelectedForInspector = selectedItem?.type === 'comic' && selectedItem.id === comic.id;

  const handleClick = () => {
    if (selectionMode) {
      onBulkSelect?.();
    } else {
      setSelectedItem({ ...comic, type: 'comic' });
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(comic.series);
    } else if (onToggleInspector) {
      setSelectedItem({ ...comic, type: 'comic' });
      onToggleInspector();
    }
  };

  const handleImageError = () => {
    console.log('[COMIC-CARD] Image failed to load for comic:', comic.series, 'URL:', comic.coverUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('[COMIC-CARD] Image loaded successfully for comic:', comic.series, 'URL:', comic.coverUrl);
  };

  const coverSrc = getCoverUrl(comic.coverUrl);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer relative group",
        isSelectedForInspector && !selectionMode && "ring-2 ring-primary shadow-lg scale-105",
        isSelectedForBulk && "ring-2 ring-primary shadow-lg scale-105"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <Checkbox
            checked={isSelectedForBulk}
            className="bg-background border-2 shadow-sm"
          />
        </div>
      )}
      <AspectRatio ratio={2 / 3} className="relative">
        {!imageError ? (
          <img
            src={coverSrc}
            alt={`${comic.series} #${comic.issue}`}
            className="object-cover w-full h-full"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📚</div>
              <div className="text-xs text-muted-foreground">No Cover</div>
            </div>
          </div>
        )}
        {!selectionMode && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setReadingComic(comic);
              }}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Read
            </Button>
          </div>
        )}
      </AspectRatio>
      <CardFooter className="p-3">
        <div>
          <p className="font-semibold truncate">{comic.series}</p>
          <p className="text-sm text-muted-foreground">
            Issue #{comic.issue} ({comic.year})
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ComicCard;