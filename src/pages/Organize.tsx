import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward, Undo } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import BulkActions from "@/components/BulkActions";
import ProcessingStats from "@/components/ProcessingStats";
import SmartSuggestions from "@/components/SmartSuggestions";
import BatchProcessor from "@/components/BatchProcessor";
import AdvancedFilters from "@/components/AdvancedFilters";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { QueuedFile } from "@/types";
import { useElectron } from "@/hooks/useElectron";
import { showError } from "@/utils/toast";

const Organize = () => {
  const { 
    files, 
    lastUndoableAction,
    undoLastAction,
    skipFile,
    addFilesFromDrop
  } = useAppContext();
  const { selectedItem, setSelectedItem } = useSelection();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<QueuedFile[]>(files);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { isElectron } = useElectron();

  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isElectron) {
      e.preventDefault();
      e.stopPropagation();
      showError("Please use the 'Add Files' or 'Scan Folder' buttons for the desktop app.");
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    addFilesFromDrop(Array.from(e.dataTransfer.files));
  }, [addFilesFromDrop, isElectron]);

  const handleSkip = () => {
    if (selectedItem?.type === 'file') {
      skipFile(selectedItem as QueuedFile);
      setSelectedItem(null);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col space-y-4 ${isDragOver ? 'bg-primary/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && !isElectron && (
        <div className="fixed inset-0 bg-primary/10 border-4 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Drop Comic Files Here</h3>
            <p className="text-muted-foreground">Supported formats: CBR, CBZ, PDF</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organize</h1>
          <p className="text-muted-foreground mt-1">
            Process and organize your comic files using intelligent detection.
          </p>
        </div>
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!selectedItem} onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost" disabled={!lastUndoableAction} onClick={undoLastAction}>
              <Undo className="h-4 w-4 mr-2" /> Undo Last
            </Button>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><ProcessingStats /></div>
          <div><SmartSuggestions /></div>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BatchProcessor files={files} selectedFiles={selectedFiles} />
          <AdvancedFilters files={files} onFiltersChange={setFilteredFiles} />
        </div>
      )}

      {files.length > 0 && (
        <BulkActions 
          files={filteredFiles} 
          selectedFiles={selectedFiles} 
          onSelectionChange={setSelectedFiles} 
        />
      )}

      <div className="flex-1">
        <div className="h-full rounded-lg border bg-card text-card-foreground shadow-sm">
          {files.length === 0 ? (
            <FileDropzone />
          ) : (
            <FileQueue 
              files={filteredFiles} 
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Organize;