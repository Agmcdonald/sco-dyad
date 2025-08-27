import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2, Play, SkipForward, Edit, Check, PlusSquare } from "lucide-react";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";
import BulkEditModal from "./BulkEditModal";

interface BulkActionsProps {
  files: QueuedFile[];
  selectedFiles: string[];
  onSelectionChange: (fileIds: string[]) => void;
}

const BulkActions = ({ files, selectedFiles, onSelectionChange }: BulkActionsProps) => {
  const { removeFile, skipFile, startProcessing, addComic, quickAddFiles } = useAppContext();
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(files.map(f => f.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBulkDelete = () => {
    selectedFiles.forEach(fileId => removeFile(fileId));
    onSelectionChange([]);
    showSuccess(`Removed ${selectedFiles.length} files from queue.`);
  };

  const handleBulkSkip = () => {
    const filesToSkip = files.filter(f => selectedFiles.includes(f.id));
    filesToSkip.forEach(file => skipFile(file));
    onSelectionChange([]);
    showSuccess(`Skipped ${selectedFiles.length} files.`);
  };

  const handleProcessSelected = () => {
    // This is a placeholder for a more complex feature.
    // For now, it will just start processing the whole queue.
    startProcessing();
    showSuccess(`Started processing queue. Selected files will be processed.`);
  };

  const handleBulkEdit = () => {
    setIsBulkEditOpen(true);
  };

  const handleBulkQuickAdd = async () => {
    const filesToQuickAdd = files.filter(f => selectedFiles.includes(f.id));
    if (filesToQuickAdd.length > 0) {
      await quickAddFiles(filesToQuickAdd);
      onSelectionChange([]); // Clear selection after action
    }
  };

  const handleBulkConfirm = () => {
    const filesToConfirm = files.filter(f => selectedFiles.includes(f.id));
    let confirmedCount = 0;
    let failedCount = 0;

    filesToConfirm.forEach(file => {
      if (file.series && file.issue && file.year && file.publisher) {
        addComic({
          series: file.series,
          issue: file.issue,
          year: file.year,
          publisher: file.publisher,
          volume: file.volume || String(file.year),
          summary: `Bulk confirmed from file: ${file.name}`
        }, file);
        removeFile(file.id);
        confirmedCount++;
      } else {
        failedCount++;
      }
    });

    onSelectionChange([]); // Clear selection
    if (confirmedCount > 0) {
      showSuccess(`Confirmed and added ${confirmedCount} comics to the library.`);
    }
    if (failedCount > 0) {
      showError(`${failedCount} selected files were missing required information and could not be confirmed.`);
    }
  };

  if (files.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedFiles.length === files.length && files.length > 0}
            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Select All ({selectedFiles.length}/{files.length})
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkQuickAdd}>
              <PlusSquare className="h-4 w-4 mr-2" />
              Quick Add Selected ({selectedFiles.length})
            </Button>
            <Button variant="default" size="sm" onClick={handleBulkConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Confirm Selected ({selectedFiles.length})
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleBulkEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More Actions <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleProcessSelected}>
                  <Play className="h-4 w-4 mr-2" />
                  Reprocess Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkSkip}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedFiles={selectedFiles}
        files={files}
      />
    </>
  );
};

export default BulkActions;