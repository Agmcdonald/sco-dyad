import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SkipForward, Undo, ThumbsUp, Edit } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import BulkActions from "@/components/BulkActions";
import ProcessingStats from "@/components/ProcessingStats";
import SmartSuggestions from "@/components/SmartSuggestions";
import BatchProcessor from "@/components/BatchProcessor";
import AdvancedFilters from "@/components/AdvancedFilters";
import FileLoadProgress from "@/components/FileLoadProgress";
import EditFileModal from "@/components/EditFileModal";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { QueuedFile } from "@/types";
import { useElectron } from "@/hooks/useElectron";
import { showError, showSuccess } from "@/utils/toast";

const Organize = () => {
  const { 
    files, 
    lastUndoableAction,
    undoLastAction,
    skipFile,
    addFilesFromDrop,
    addFiles,
    fileLoadStatus,
    addComic,
    removeFile
  } = useAppContext();
  const { selectedItem, setSelectedItem } = useSelection();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<QueuedFile[]>(files);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { isElectron } = useElectron();
  
  // Get functions from the Layout context
  const { autoOpenInspector, isInspectorOpen } = useOutletContext<{ 
    autoOpenInspector: () => void;
    isInspectorOpen: boolean;
  }>();

  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  // Listen for Electron file events
  useEffect(() => {
    const handleElectronFiles = (event: CustomEvent) => {
      const { files: electronFiles } = event.detail;
      if (electronFiles && Array.isArray(electronFiles)) {
        addFiles(electronFiles);
      }
    };

    window.addEventListener('electron-files-added', handleElectronFiles as EventListener);

    return () => {
      window.removeEventListener('electron-files-added', handleElectronFiles as EventListener);
    };
  }, [addFiles]);

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

  const handleConfirmMatch = async () => {
    if (selectedItem?.type !== 'file') return;
    
    const file = selectedItem as QueuedFile;
    
    if (!file.series || !file.issue || !file.year || !file.publisher) {
      showError("Cannot confirm match: Missing required information.");
      return;
    }
    
    await addComic({
      series: file.series,
      issue: file.issue,
      year: file.year,
      publisher: file.publisher,
      volume: file.volume || String(file.year),
      summary: `Confirmed from file: ${file.name}`
    }, file);

    removeFile(file.id);
    showSuccess(`'${file.series} #${file.issue}' added to library.`);
    setSelectedItem(null);
  };

  const handleCorrectMatch = () => {
    if (selectedItem?.type === 'file') {
      setIsEditModalOpen(true);
    }
  };

  const handleToggleInspector = useCallback(() => {
    // Auto-open inspector when a file is selected
    if (autoOpenInspector) {
      autoOpenInspector();
    }
  }, [autoOpenInspector]);

  const selectedFile = selectedItem?.type === 'file' ? selectedItem as QueuedFile : null;
  const canConfirm = selectedFile && selectedFile.series && selectedFile.issue && selectedFile.year && selectedFile.publisher;

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
            <p className="text-muted-foreground">Supported formats: CBR, CBZ</p>
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
            <Button 
              variant={canConfirm ? "default" : "outline"} 
              disabled={!selectedFile}
              onClick={handleConfirmMatch}
              className={canConfirm ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-2" /> 
              Confirm Match
            </Button>
            <Button 
              variant={selectedFile ? "default" : "outline"} 
              disabled={!selectedFile}
              onClick={handleCorrectMatch}
            >
              <Edit className="h-4 w-4 mr-2" /> 
              Correct Match
            </Button>
            <Button variant="outline" disabled={!selectedItem} onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost" disabled={!lastUndoableAction} onClick={undoLastAction}>
              <Undo className="h-4 w-4 mr-2" /> Undo Last
            </Button>
          </div>
        )}
      </div>

      {fileLoadStatus.isLoading ? (
        <FileLoadProgress />
      ) : (
        files.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><ProcessingStats /></div>
            <div><SmartSuggestions /></div>
          </div>
        )
      )}

      {files.length > 0 && !fileLoadStatus.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BatchProcessor files={files} selectedFiles={selectedFiles} />
          <AdvancedFilters files={files} onFiltersChange={setFilteredFiles} />
        </div>
      )}

      {files.length > 0 && !fileLoadStatus.isLoading && (
        <BulkActions 
          files={filteredFiles} 
          selectedFiles={selectedFiles} 
          onSelectionChange={setSelectedFiles} 
        />
      )}

      <div className="flex-1">
        <div className="h-full rounded-lg border bg-card text-card-foreground shadow-sm">
          {files.length === 0 && !fileLoadStatus.isLoading ? (
            <FileDropzone />
          ) : (
            <FileQueue 
              files={filteredFiles} 
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
              onToggleInspector={handleToggleInspector}
            />
          )}
        </div>
      </div>

      {selectedFile && (
        <EditFileModal
          file={selectedFile}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Organize;