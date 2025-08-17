import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelection } from "@/context/SelectionContext";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ComicCardProps {
  comic: Comic;
  onDoubleClick?: (seriesName: string) => void;
}

const ComicCard = ({ comic, onDoubleClick }: ComicCardProps) => {
  const { selectedItem, setSelectedItem } = useSelection();
  const [imageError, setImageError] = useState(false);

  const isSelected = selectedItem?.type === 'comic' && selectedItem.id === comic.id;

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(comic.series);
    } else {
      setSelectedItem({ ...comic, type: 'comic' });
    }
  };

  const handleImageError = () => {
    console.log('[COMIC-CARD] Image failed to load for comic:', comic.series, 'URL:', comic.coverUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('[COMIC-CARD] Image loaded successfully for comic:', comic.series, 'URL:', comic.coverUrl);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={cn(
              "overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer",
              isSelected && "ring-2 ring-primary shadow-lg scale-105"
            )}
            onDoubleClick={handleDoubleClick}
          >
            <AspectRatio ratio={2 / 3}>
              {!imageError ? (
                <img
                  src={comic.coverUrl}
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
            </AspectRatio>
            <CardFooter className="p-3">
              <div>
                <p className="font-semibold truncate">{comic.series}</p>
                <p className="text-sm text-muted-foreground">
                  Issue #{comic.issue} ({comic.year})
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Cover: {comic.coverUrl}
                  </p>
                )}
              </div>
            </CardFooter>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>More Info</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComicCard;