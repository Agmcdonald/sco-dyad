import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2, Play, SkipForward } from "lucide-react";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";

interface BulkActionsProps {
  files: QueuedFile[];
  selectedFiles: string[];
  onSelectionChange: (fileIds: string[]) => void;
}

const BulkActions = ({ files, selectedFiles, onSelectionChange }: BulkActionsProps) => {
  const { removeFile, skipFile, startProcessing } = useAppContext();

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
    // Filter files to only process selected ones
    const unselectedFiles = files.filter(f => !selectedFiles.includes(f.id));
    unselectedFiles.forEach(file => removeFile(file.id));
    startProcessing();
    onSelectionChange([]);
    showSuccess(`Started processing ${selectedFiles.length} selected files.`);
  };

  if (files.length === 0) return null;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all"
          checked={selectedFiles.length === files.length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all" className="text-sm font-medium">
          Select All ({selectedFiles.length}/{files.length})
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleProcessSelected}>
            <Play className="h-4 w-4 mr-2" />
            Process Selected ({selectedFiles.length})
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
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
  );
};

export default BulkActions;