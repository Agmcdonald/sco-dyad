import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";

interface AddToReadingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddToReadingListModal = ({ isOpen, onClose }: AddToReadingListModalProps) => {
  const { comics, readingList, addToReadingList } = useAppContext();
  const [selectedComics, setSelectedComics] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const comicsNotInReadingList = useMemo(() => {
    const readingListComicIds = new Set(readingList.map(item => item.comicId));
    return comics.filter(comic => !readingListComicIds.has(comic.id));
  }, [comics, readingList]);

  const filteredComics = useMemo(() => {
    return comicsNotInReadingList.filter(comic =>
      comic.series.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [comicsNotInReadingList, searchTerm]);

  const handleToggleComic = (comicId: string) => {
    setSelectedComics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(comicId)) {
        newSet.delete(comicId);
      } else {
        newSet.add(comicId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    const comicsToAdd = comics.filter(comic => selectedComics.has(comic.id));
    comicsToAdd.forEach(addToReadingList);
    showSuccess(`Added ${comicsToAdd.length} comics to your reading list.`);
    onClose();
    setSelectedComics(new Set());
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add from Library</DialogTitle>
          <DialogDescription>
            Select comics from your library to add to your reading list.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            placeholder="Search your library..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ScrollArea className="h-72">
            <div className="space-y-2 pr-4">
              {filteredComics.map(comic => (
                <div
                  key={comic.id}
                  className="flex items-center gap-4 p-2 rounded-lg border"
                >
                  <Checkbox
                    id={`comic-${comic.id}`}
                    checked={selectedComics.has(comic.id)}
                    onCheckedChange={() => handleToggleComic(comic.id)}
                  />
                  <label htmlFor={`comic-${comic.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{comic.series} #{comic.issue}</div>
                    <div className="text-sm text-muted-foreground">{comic.publisher} ({comic.year})</div>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAddSelected} disabled={selectedComics.size === 0}>
            Add {selectedComics.size > 0 ? `(${selectedComics.size})` : ''} Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToReadingListModal;