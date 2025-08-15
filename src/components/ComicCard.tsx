import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardFooter } from "@/components/ui/card";
import { useSelection } from "@/context/SelectionContext";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useElectron } from "@/hooks/useElectron";

interface ComicCardProps {
  comic: Comic;
}

const ComicCard = ({ comic }: ComicCardProps) => {
  const { selectedItem, setSelectedItem } = useSelection();
  const { electronAPI } = useElectron();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actualImageUrl, setActualImageUrl] = useState<string>('/placeholder.svg');

  const isSelected = selectedItem?.type === 'comic' && selectedItem.id === comic.id;

  // Load the actual image if it's an electron cover
  useEffect(() => {
    const loadCoverImage = async () => {
      if (comic.coverUrl.startsWith('electron-cover:') && electronAPI) {
        try {
          const coverPath = comic.coverUrl.replace('electron-cover:', '');
          console.log('[COMIC-CARD] Loading cover from:', coverPath);
          
          const dataUrl = await electronAPI.getCoverImage(coverPath);
          if (dataUrl) {
            console.log('[COMIC-CARD] Successfully loaded cover as data URL');
            setActualImageUrl(dataUrl);
          } else {
            console.log('[COMIC-CARD] Failed to load cover, using placeholder');
            setActualImageUrl('/placeholder.svg');
          }
        } catch (error) {
          console.error('[COMIC-CARD] Error loading cover:', error);
          setActualImageUrl('/placeholder.svg');
        }
      } else {
        // Use the URL as-is (for placeholder or other URLs)
        setActualImageUrl(comic.coverUrl);
      }
    };

    loadCoverImage();
  }, [comic.coverUrl, electronAPI]);

  const handleClick = () => {
    if (isSelected) {
      setSelectedItem(null); // Allow deselecting
    } else {
      setSelectedItem({ ...comic, type: 'comic' });
    }
  };

  const handleImageError = () => {
    console.log('[COMIC-CARD] Image failed to load for comic:', comic.series, 'URL:', actualImageUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('[COMIC-CARD] Image loaded successfully for comic:', comic.series, 'URL:', actualImageUrl);
    setImageLoaded(true);
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-lg scale-105"
      )}
      onClick={handleClick}
    >
      <AspectRatio ratio={2 / 3}>
        {!imageError ? (
          <img
            src={actualImageUrl}
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
              Cover: {actualImageUrl.startsWith('data:') ? 'Data URL loaded' : actualImageUrl}
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ComicCard;