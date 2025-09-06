import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tag, 
  BookOpen, 
  PlusCircle, 
  Users, 
  Trash2, 
  Calendar, 
  FileText, 
  DollarSign,
  Barcode,
  Globe,
  MapPin,
  Image,
  ImageIcon,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  ChevronDown
} from "lucide-react";
import EditComicModal from "./EditComicModal";
import RatingSelector from "./RatingSelector";
import FixCoverModal from "./FixCoverModal";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import { useElectron } from "@/hooks/useElectron";
import { RATING_EMOJIS, CONTENT_RATINGS } from "@/lib/ratings";
import { showError, showSuccess } from "@/utils/toast";
import { getCoverUrl } from "@/lib/cover";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface ComicInspectorProps {
  comic: Comic;
}

const ComicInspector = ({ comic: initialComic }: ComicInspectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFixCoverOpen, setIsFixCoverOpen] = useState(false);
  const { comics, readingList, addToReadingList, removeComic, updateComicRating, updateComic, toggleComicReadStatus, openComicForReading, scanComicForMetadata } = useAppContext();
  const { setSelectedItem } = useSelection();
  const { isElectron } = useElectron();
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

  const comic = useMemo(() => {
    return comics.find(c => c.id === initialComic.id) || initialComic;
  }, [comics, initialComic]);

  const readingListItem = readingList.find(item => item.comicId === comic.id);
  const isInReadingList = !!readingListItem;
  const isMarkedAsRead = readingListItem?.completed || false;
  const rating = comic.rating;
  const contentRatingInfo = comic.contentRating ? CONTENT_RATINGS[comic.contentRating] : null;

  // Check if this comic is currently the series cover
  const isCurrentSeriesCover = comic.isSeriesCover;
  
  // Check if there are other comics in this series
  const seriesComics = comics.filter(c => 
    c.series.toLowerCase() === comic.series.toLowerCase() && 
    c.publisher.toLowerCase() === comic.publisher.toLowerCase()
  );
  const hasMultipleIssues = seriesComics.length > 1;

  // Check if cover might be corrupted (placeholder or failed to load)
  const hasPotentialCoverIssue = comic.coverUrl === '/placeholder.svg' || 
    comic.coverUrl?.includes('placeholder') || 
    !comic.coverUrl;

  const handleRemoveFromLibrary = () => {
    removeComic(comic.id, false);
    setSelectedItem(null);
  };

  const handleDeletePermanently = () => {
    removeComic(comic.id, true);
    setSelectedItem(null);
  };

  const handleRatingChange = async (newRating: number) => {
    console.log(`[COMIC-INSPECTOR] Rating comic ${comic.series} #${comic.issue} with rating: ${newRating}`);
    try {
      await updateComicRating(comic.id, newRating);
      console.log(`[COMIC-INSPECTOR] Rating updated successfully`);
    } catch (error) {
      console.error(`[COMIC-INSPECTOR] Failed to update rating:`, error);
    }
  };

  const handleMarkAsRead = () => {
    toggleComicReadStatus(comic);
  };

  const handleSetAsSeriesCover = async () => {
    try {
      // First, unmark any existing series cover for this series
      const currentSeriesCover = seriesComics.find(c => c.isSeriesCover);
      if (currentSeriesCover && currentSeriesCover.id !== comic.id) {
        await updateComic({ ...currentSeriesCover, isSeriesCover: false });
      }

      // Then mark this comic as the series cover
      await updateComic({ ...comic, isSeriesCover: true });
      
      showSuccess(`"${comic.series} #${comic.issue}" is now the series cover`);
    } catch (error) {
      console.error('Error setting series cover:', error);
      showError('Failed to set series cover');
    }
  };

  const handleRemoveAsSeriesCover = async () => {
    try {
      await updateComic({ ...comic, isSeriesCover: false });
      showSuccess(`Removed "${comic.series} #${comic.issue}" as series cover`);
    } catch (error) {
      console.error('Error removing series cover:', error);
      showError('Failed to remove series cover');
    }
  };

  const handleToggleIgnoreInScans = async (checked: boolean) => {
    try {
      await updateComic({ ...comic, ignoreInScans: checked });
      showSuccess(`'${comic.series} #${comic.issue}' will ${checked ? 'now be ignored' : 'no longer be ignored'} in metadata scans.`);
    } catch (error) {
      console.error('Error toggling ignoreInScans:', error);
      showError('Failed to update setting.');
    }
  };

  const handleScanForDetails = async () => {
    await scanComicForMetadata(comic.id);
  };

  const handleReadComic = useCallback(() => {
    openComicForReading(comic);
  }, [openComicForReading, comic]);

  const handleEditComic = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleFixCover = useCallback(() => {
    setIsFixCoverOpen(true);
  }, []);

  const handleAddToList = useCallback(() => {
    addToReadingList(comic);
  }, [addToReadingList, comic]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior for 'r' if it's not an input field
      if (event.key === 'r' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        handleReadComic();
      }
      if (event.key === 'e' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        handleEditComic();
      }
      if (event.key === 'f' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        handleFixCover();
      }
      if (event.key === 'm' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        dropdownTriggerRef.current?.click(); // Programmatically open the dropdown
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleReadComic, handleEditComic, handleFixCover]);


  const coverSrc = getCoverUrl(comic.coverUrl);

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l">
        <div className="p-4 border-b">
          <h3 className="font-semibold truncate">
            {comic.series} #{comic.issue}
            {rating !== undefined && (
              <span className="ml-3 text-lg" title={RATING_EMOJIS[rating as keyof typeof RATING_EMOJIS]?.label}>
                {RATING_EMOJIS[rating as keyof typeof RATING_EMOJIS]?.emoji}
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{comic.title || `(${comic.year})`}</p>
          {isCurrentSeriesCover && (
            <Badge variant="default" className="mt-1 text-xs">
              <Image className="h-3 w-3 mr-1" />
              Series Cover
            </Badge>
          )}
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted overflow-hidden relative">
            <img src={coverSrc} alt="Cover" className="object-cover w-full h-full" />
            {hasPotentialCoverIssue && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="text-xs">
                  <Image className="h-3 w-3 mr-1.5" />
                  No Cover
                </Badge>
              </div>
            )}
          </div>
          
          {/* Basic Details */}
          <TooltipProvider>
            <div>
              <h4 className="font-semibold text-sm mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center"><FileText className="h-3 w-3 mr-1.5" /> Publisher</span>
                  <span>{comic.publisher}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center"><BookOpen className="h-3 w-3 mr-1.5" /> Volume</span>
                  <span>{comic.volume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center"><Calendar className="h-3 w-3 mr-1.5" /> Publication Date</span>
                  <span>{comic.publicationDate || comic.year}</span>
                </div>
                {comic.genre && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Tag className="h-3 w-3 mr-1.5" /> Genre</span>
                    <span>{comic.genre}</span>
                  </div>
                )}
                {comic.price && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><DollarSign className="h-3 w-3 mr-1.5" /> Price</span>
                    <span>{comic.price}</span>
                  </div>
                )}
                {comic.contentRating && contentRatingInfo && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center"><ShieldAlert className="h-3 w-3 mr-1.5" /> Content Rating</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">{comic.contentRating} - {contentRatingInfo.label}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{contentRatingInfo.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>

          {/* Additional Metadata */}
          {(comic.barcode || comic.languageCode || comic.countryCode) && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Additional Details</h4>
                <div className="space-y-2 text-sm">
                  {comic.barcode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center"><Barcode className="h-3 w-3 mr-1.5" /> Barcode</span>
                      <span className="font-mono text-xs">{comic.barcode}</span>
                    </div>
                  )}
                  {comic.languageCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center"><Globe className="h-3 w-3 mr-1.5" /> Language</span>
                      <Badge variant="outline" className="text-xs">{comic.languageCode}</Badge>
                    </div>
                  )}
                  {comic.countryCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1.5" /> Country</span>
                      <Badge variant="outline" className="text-xs">{comic.countryCode}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Characters */}
          {comic.characters && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Characters</h4>
                <p className="text-sm text-muted-foreground">
                  {comic.characters}
                </p>
              </div>
            </>
          )}

          {/* Summary */}
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">
              {comic.summary || "No summary available."}
            </p>
          </div>

          {/* Creators */}
          {comic.creators && comic.creators.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Creators
                </h4>
                <div className="space-y-2 text-sm">
                  {comic.creators.map((creator, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">{creator.role}</span>
                      <span>{creator.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Rating Section */}
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-3">Your Rating</h4>
            <div className="space-y-3">
              <RatingSelector 
                currentRating={rating} 
                onRatingChange={handleRateComic}
                size="md"
              />
              {rating !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {RATING_EMOJIS[rating as keyof typeof RATING_EMOJIS]?.label}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t mt-auto bg-background space-y-2">
          {/* Primary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button className="w-full" onClick={handleReadComic} aria-label="Read Comic (R)">
              <BookOpen className="mr-2 h-4 w-4" /> Read
            </Button>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={handleFixCover}
              aria-label="Fix Cover (F)"
            >
              <ImageIcon className="mr-2 h-4 w-4" /> Fix Cover
            </Button>
            <Button className="w-full" variant="outline" onClick={handleEditComic} aria-label="Edit (E)">
              <Tag className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>

          {/* Secondary Actions (More Menu) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full" ref={dropdownTriggerRef} aria-label="More Actions (M)">
                More <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleAddToList} disabled={isInReadingList} aria-label="Add to Reading List">
                <PlusCircle className="mr-2 h-4 w-4" /> 
                {isInReadingList ? 'In Reading List' : 'Add to Reading List'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkAsRead} aria-label={isMarkedAsRead ? "Mark Unread" : "Mark Read"}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {isMarkedAsRead ? 'Mark Unread' : 'Mark Read'}
              </DropdownMenuItem>
              {hasMultipleIssues && (
                isCurrentSeriesCover ? (
                  <DropdownMenuItem onClick={handleRemoveAsSeriesCover} aria-label="Remove as Series Cover">
                    <Image className="mr-2 h-4 w-4" /> Remove as Series Cover
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleSetAsSeriesCover} aria-label="Set as Series Cover">
                    <Image className="mr-2 h-4 w-4" /> Set as Series Cover
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuItem onClick={handleScanForDetails} aria-label="Scan for Details">
                <Sparkles className="mr-2 h-4 w-4" /> Scan for Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Persistent Bottom Actions */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="ignore-in-scans" className="text-sm font-medium">Ignore in Auto Scans</Label>
            <Switch 
              id="ignore-in-scans" 
              checked={comic.ignoreInScans || false} 
              onCheckedChange={handleToggleIgnoreInScans} 
              aria-label="Toggle ignore in auto scans"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" aria-label="Delete Comic">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{comic.series} #{comic.issue}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Choose whether to remove the comic from your library or permanently delete the file from your computer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveFromLibrary}>
                  Remove from Library
                </AlertDialogAction>
                {isElectron && comic.filePath && (
                  <AlertDialogAction
                    onClick={handleDeletePermanently}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete File Permanently
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {isModalOpen && (
        <EditComicModal
          comic={comic}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isFixCoverOpen && (
        <FixCoverModal
          comic={comic}
          isOpen={isFixCoverOpen}
          onClose={() => setIsFixCoverOpen(false)}
        />
      )}
    </>
  );
};

export default ComicInspector;