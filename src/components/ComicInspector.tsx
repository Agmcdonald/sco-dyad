import { useState, useMemo } from "react";
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
  RefreshCw,
  Loader2
} from "lucide-react";
import EditComicModal from "./EditComicModal";
import ComicReader from "./ComicReader";
import RatingSelector from "./RatingSelector";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import { useElectron } from "@/hooks/useElectron";
import { RATING_EMOJIS } from "@/lib/ratings";
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";
import { showError, showSuccess } from "@/utils/toast";

interface ComicInspectorProps {
  comic: Comic;
}

const ComicInspector = ({ comic: initialComic }: ComicInspectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { comics, readingList, addToReadingList, removeComic, updateComicRating, updateComic } = useAppContext();
  const { setSelectedItem } = useSelection();
  const { isElectron } = useElectron();
  const gcdDbService = useGcdDatabaseService();

  const comic = useMemo(() => {
    return comics.find(c => c.id === initialComic.id) || initialComic;
  }, [comics, initialComic]);

  const isInReadingList = readingList.some(item => item.comicId === comic.id);
  const rating = comic.rating;

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

  const handleRefreshFromDb = async () => {
    if (!gcdDbService) {
      showError("Local database is not connected.");
      return;
    }
    setIsRefreshing(true);
    try {
      console.log(`[COMIC-INSPECTOR] Starting refresh for series: "${comic.series}"`);
      
      const seriesResults = await gcdDbService.searchSeries(comic.series);
      console.log(`[COMIC-INSPECTOR] Search results:`, seriesResults);
      
      if (seriesResults.length === 0) {
        showError(`Could not find series "${comic.series}" in the local database.`);
        return;
      }
      
      const seriesMatch = seriesResults[0];
      console.log(`[COMIC-INSPECTOR] Using series match:`, seriesMatch);
      
      const issueDetails = await gcdDbService.getIssueDetails(seriesMatch.id, comic.issue);
      console.log(`[COMIC-INSPECTOR] Issue details:`, issueDetails);
      
      if (!issueDetails) {
        showError(`Could not find issue #${comic.issue} for "${comic.series}" in the database.`);
        return;
      }

      const creators = await gcdDbService.getIssueCreators(issueDetails.id);
      console.log(`[COMIC-INSPECTOR] Creators:`, creators);

      const updatedData = {
        ...comic,
        publisher: seriesMatch.publisher,
        year: parseInt(issueDetails.publication_date?.substring(0, 4), 10) || comic.year,
        volume: String(seriesMatch.year_began),
        summary: issueDetails.synopsis || comic.summary,
        title: issueDetails.title || comic.title,
        publicationDate: issueDetails.publication_date,
        creators: creators.length > 0 ? creators : comic.creators,
        genre: issueDetails.genre || comic.genre,
        characters: issueDetails.characters || comic.characters,
        price: issueDetails.price || comic.price,
        barcode: issueDetails.barcode || comic.barcode,
        languageCode: issueDetails.languageCode || comic.languageCode,
        countryCode: issueDetails.countryCode || comic.countryCode,
      };

      console.log(`[COMIC-INSPECTOR] Updating comic with data:`, updatedData);
      await updateComic(updatedData);
      showSuccess("Comic metadata updated from local database.");

    } catch (error) {
      console.error("[COMIC-INSPECTOR] Error refreshing from DB:", error);
      showError(`An error occurred while refreshing data: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

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
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted overflow-hidden">
            <img src={comic.coverUrl} alt="Cover" className="object-cover w-full h-full" />
          </div>
          
          {/* Basic Details */}
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
            </div>
          </div>

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
                onRatingChange={handleRatingChange}
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
          <Button className="w-full" onClick={() => setIsReaderOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Read Comic
          </Button>
          <Button 
            className="w-full" 
            variant="secondary" 
            onClick={() => addToReadingList(comic)}
            disabled={isInReadingList}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 
            {isInReadingList ? 'In Reading List' : 'Add to Reading List'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>
              <Tag className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefreshFromDb} 
              disabled={!isElectron || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
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
      
      {isReaderOpen && (
        <ComicReader comic={comic} onClose={() => setIsReaderOpen(false)} />
      )}

      {isModalOpen && (
        <EditComicModal
          comic={comic}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default ComicInspector;