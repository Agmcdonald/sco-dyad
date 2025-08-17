import { useState, useMemo } from "react";
import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Tag, BookOpen, PlusCircle, Users, Trash2, Calendar, FileText } from "lucide-react";
import EditComicModal from "./EditComicModal";
import ComicReader from "./ComicReader";
import RatingSelector from "./RatingSelector";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import { useElectron } from "@/hooks/useElectron";
import { RATING_EMOJIS } from "@/lib/ratings";

interface ComicInspectorProps {
  comic: Comic;
}

const ComicInspector = ({ comic: initialComic }: ComicInspectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const { comics, readingList, addToReadingList, removeComic, updateComicRating } = useAppContext();
  const { setSelectedItem } = useSelection();
  const { isElectron } = useElectron();

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
          <div>
            <h4 className="font-semibold text-sm mb-2">Details</h4>
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
                <span className="text-muted-foreground flex items-center"><Calendar className="h-3 w-3 mr-1.5" /> Cover Date</span>
                <span>{comic.coverDate || comic.year}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">
              {comic.summary || "No summary available."}
            </p>
          </div>
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
          <div className="flex gap-2">
            <Button className="w-full" variant="outline" onClick={() => setIsModalOpen(true)}>
              <Tag className="mr-2 h-4 w-4" /> Edit Metadata
            </Button>
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