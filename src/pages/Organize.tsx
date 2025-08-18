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
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";
import { showError } from "@/utils/toast";
import { useSettings } from "@/context/SettingsContext";

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
    addFilesFromDrop
  } = useAppContext();
  const { selectedItem, setSelectedItem } = useSelection();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<QueuedFile[]>(files);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [processedFileIds, setProcessedFileIds] = useState<Set<string>>(new Set());
  const queueIndex = useRef(0);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isElectron } = useElectron();
  const { settings } = useSettings();
  const gcdDbService = useGcdDatabaseService();

  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  // Reset processing state when files change
  useEffect(() => {
    const pendingFiles = files.filter(f => f.status === 'Pending');
    if (pendingFiles.length === 0 && isProcessing) {
      pauseProcessing();
      setProcessingProgress(100);
      setCurrentProcessingFile("");
      queueIndex.current = 0;
    }
  }, [files, isProcessing, pauseProcessing]);

  useEffect(() => {
    const processNextFile = async () => {
      const pendingFiles = files.filter(f => f.status === 'Pending' && !processedFileIds.has(f.id));
      
      if (queueIndex.current >= pendingFiles.length || pendingFiles.length === 0) {
        pauseProcessing();
        setProcessingProgress(100);
        setCurrentProcessingFile("");
        queueIndex.current = 0;
        logAction('info', `Processing complete. Processed ${processedFileIds.size} files.`);
        return;
      }
      
      const currentFile = pendingFiles[queueIndex.current];
      if (!currentFile || processedFileIds.has(currentFile.id)) {
        queueIndex.current++;
        return;
      }

      // Mark file as being processed to prevent re-processing
      setProcessedFileIds(prev => new Set(prev).add(currentFile.id));

      setCurrentProcessingFile(currentFile.name);
      setProcessingProgress((queueIndex.current / pendingFiles.length) * 100);

      try {
        console.log(`[ORGANIZE] Processing file: ${currentFile.name}`);
        console.log(`[ORGANIZE] GCD service available:`, !!gcdDbService);
        
        const result = await processComicFile(
          currentFile, 
          settings.comicVineApiKey,
          settings.marvelPublicKey,
          settings.marvelPrivateKey,
          gcdDbService
        );

        console.log(`[ORGANIZE] Processing result:`, result);

        if (result.success && result.data) {
          updateFile({ ...currentFile, ...result.data, status: "Success", confidence: result.confidence });
          if (result.confidence === 'High') {
            setTimeout(() => {
              addComic(result.data!, currentFile);
              removeFile(currentFile.id);
              setSelectedItem(null);
            }, 500);
          }
        } else {
          updateFile({ ...currentFile, status: result.confidence === 'Low' ? "Error" : "Warning", confidence: result.confidence });
          if (result.error) logAction('warning', `'${currentFile.name}': ${result.error}`);
        }
      } catch (error) {
        console.error(`[ORGANIZE] Processing error:`, error);
        updateFile({ ...currentFile, status: "Error", confidence: "Low" });
        logAction('error', `'${currentFile.name}': Processing failed`);
      }

      queueIndex.current++;
    };

    if (isProcessing) {
      // Clear any existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      // Set a new timeout for processing
      processingTimeoutRef.current = setTimeout(processNextFile, 1500);
    }

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [isProcessing, files, addComic, removeFile, setSelectedItem, pauseProcessing, logAction, updateFile, settings, gcdDbService, processedFileIds, queueIndex.current]);

  // Reset processed files when starting new processing session
  const handleStartProcessing = () => {
    setProcessedFileIds(new Set());
    queueIndex.current = 0;
    startProcessing();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isElectron) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, [isElectron]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (isElectron) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, [isElectron]);

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

  const pendingCount = files.filter(f => f.status === 'Pending').length;

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
            {!isProcessing ? (
              <Button onClick={handleStartProcessing} disabled={pendingCount === 0}>
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