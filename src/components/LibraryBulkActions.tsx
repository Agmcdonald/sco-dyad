import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2, Edit, Check, BookOpen } from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";
import BulkEditComicsModal from "./BulkEditComicsModal";

interface LibraryBulkActionsProps {
  comics: Comic[];
  selectedComics: string[];
  onSelectionChange: (comicIds: string[]) => void;
}

const LibraryBulkActions = ({ comics, selectedComics, onSelectionChange }: LibraryBulkActionsProps) => {
  const { removeComic, addToReadingList, readingList } = useAppContext();
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(comics.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBulkDelete = () => {
    selectedComics.forEach(comicId => removeComic(comicId, false));
    onSelectionChange([]);
    showSuccess(`Removed ${selectedComics.length} comics from library.`);
  };

  const handleBulkAddToReadingList = () => {
    const comicsToAdd = comics.filter(c => selectedComics.includes(c.id));
    const alreadyInList = readingList.map(item => item.comicId);
    const newComics = comicsToAdd.filter(c => !alreadyInList.includes(c.id));
    
    newComics.forEach(comic => addToReadingList(comic));
    onSelectionChange([]);
    
    if (newComics.length > 0) {
      showSuccess(`Added ${newComics.length} comics to reading list.`);
    } else {
      showError("All selected comics are already in your reading list.");
    }
  };

  const handleBulkEdit = () => {
    setIsBulkEditOpen(true);
  };

  if (comics.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all-comics"
            checked={selectedComics.length === comics.length && comics.length > 0}
            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
          />
          <label htmlFor="select-all-comics" className="text-sm font-medium">
            Select All ({selectedComics.length}/{comics.length})
          </label>
        </div>

        {selectedComics.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleBulkEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Bulk Edit ({selectedComics.length})
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More Actions <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleBulkAddToReadingList}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add to Reading List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from Library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <BulkEditComicsModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedComics={selectedComics}
        comics={comics}
      />
    </>
  );
};

export default LibraryBulkActions;