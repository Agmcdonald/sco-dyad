import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, SkipForward, Undo, Loader2 } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import BulkActions from "@/components/BulkActions";
import ProcessingStats from "@/components/ProcessingStats";
import SmartSuggestions from "@/components/SmartSuggestions";
import FilePreview from "@/components/FilePreview";
import BatchProcessor from "@/components/BatchProcessor";
import AdvancedFilters from "@/components/AdvancedFilters";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { QueuedFile } from "@/types";
import { processComicFile } from "@/lib/smartProcessor";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const Organize = () => {
  const { 
    files, 
    addComic, 
    removeFile, 
    isProcessing, 
    startProcessing, 
    pauseProcessing,
    logAction,
    updateFile,
    lastUndoableAction,
    undoLastAction,
    skipFile,
    addFiles
  } = useAppContext();
  const { selectedItem, setSelectedItem } = useSelection();
  const { isElectron } = useElectron();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<QueuedFile[]>(files);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const queueIndex = useRef(0);

  // Update filtered files when files change
  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  useEffect(() => {
    if (isProcessing) {
      if (queueIndex.current >= files.length) {
        queueIndex.current = 0;
      }
    }
  }, [isProcessing, files.length]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const processNextFile = async () => {
      const pendingFiles = files.filter(f => f.status === 'Pending');
      
      if (queueIndex.current >= pendingFiles.length) {
        pauseProcessing();
        setProcessingProgress(100);
        setCurrentProcessingFile("");
        logAction('info', `Processing complete. Processed ${pendingFiles.length} files.`);
        return;
      }
      
      const currentFile = pendingFiles[queueIndex.current];
      if (!currentFile) {
        queueIndex.current++;
        return;
      }

      setCurrentProcessingFile(currentFile.name);
      setProcessingProgress((queueIndex.current / pendingFiles.length) * 100);

      try {
        const result = await processComicFile(currentFile);

        if (result.success && result.data) {
          // Update file with processed data
          updateFile({ 
            ...currentFile, 
            ...result.data, 
            status: "Success", 
            confidence: result.confidence 
          });
          
          // Auto-add high confidence matches to library
          if (result.confidence === 'High') {
            setTimeout(() => {
              addComic(result.data!, currentFile);
              removeFile(currentFile.id);
              setSelectedItem(null);
            }, 500);
          }
        } else {
          // Mark as needing review
          updateFile({ 
            ...currentFile, 
            status: result.confidence === 'Low' ? "Error" : "Warning",
            confidence: result.confidence
          });
          
          if (result.error) {
            logAction('warning', `'${currentFile.name}': ${result.error}`);
          }
        }
      } catch (error) {
        updateFile({ 
          ...currentFile, 
          status: "Error", 
          confidence: "Low" 
        });
        logAction('error', `'${currentFile.name}': Processing failed`);
      }

      queueIndex.current++;
    };

    if (isProcessing) {
      interval = setInterval(processNextFile, 1000);
    }

    return () => clearInterval(interval);
  }, [isProcessing, files, addComic, removeFile, setSelectedItem, pauseProcessing, logAction, updateFile]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) {
      showError("No files were dropped");
      return;
    }

    // Filter for comic files
    const comicExtensions = ['.cbr', '.cbz', '.pdf'];
    const comicFiles = droppedFiles.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ, PDF");
      return;
    }

    if (comicFiles.length !== droppedFiles.length) {
      showError(`${droppedFiles.length - comicFiles.length} non-comic files were ignored`);
    }

    // Convert dropped files to QueuedFile objects
    const queuedFiles = comicFiles.map((file, index) => ({
      id: `dropped-file-${Date.now()}-${index}`,
      name: file.name,
      path: isElectron ? (file as any).path || file.name : file.name,
      series: null,
      issue: null,
      year: null,
      publisher: null,
      confidence: null as any,
      status: 'Pending' as any
    }));

    addFiles(queuedFiles);
    showSuccess(`Added ${comicFiles.length} comic file${comicFiles.length !== 1 ? 's' : ''} to queue`);
  }, [addFiles, isElectron]);

  const handleSkip = () => {
    if (selectedItem?.type === 'file') {
      skipFile(selectedItem as QueuedFile);
      setSelectedItem(null);
    }
  };

  const pendingCount = files.filter(f => f.status === 'Pending').length;

  return (
    <div 
      className={`h-full flex flex-col space-y-4 ${isDragOver ? 'bg-primary/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
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
            {!isProcessing ? (
              <Button onClick={startProcessing} disabled={pendingCount === 0}>
                <Play className="h-4 w-4 mr-2" />
                Start Processing ({pendingCount})
              </Button>
            ) : (
              <Button variant="outline" onClick={pauseProcessing}>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pause
              </Button>
            )}
            <Button variant="outline" disabled={!selectedItem} onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost" disabled={!lastUndoableAction} onClick={undoLastAction}>
              <Undo className="h-4 w-4 mr-2" /> Undo Last
            </Button>
          </div>
        )}
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Processing Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={processingProgress} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing: {currentProcessingFile}</span>
              <span>{Math.round(processingProgress)}% complete</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics and Suggestions */}
      {files.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProcessingStats />
          </div>
          <div>
            <SmartSuggestions />
          </div>
        </div>
      )}

      {/* Advanced Tools */}
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

      <div className="flex-1 grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-lg border bg-card text-card-foreground shadow-sm">
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
        
        {selectedItem?.type === 'file' && (
          <div className="lg:col-span-1">
            <FilePreview file={selectedItem as QueuedFile} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Organize;