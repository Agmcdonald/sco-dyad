import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, SkipForward, Undo, Loader2 } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import BulkActions from "@/components/BulkActions";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { QueuedFile } from "@/types";
import { processComicFile } from "@/lib/smartProcessor";

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
    skipFile
  } = useAppContext();
  const { selectedItem, setSelectedItem } = useSelection();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string>("");
  const queueIndex = useRef(0);

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
      interval = setInterval(processNextFile, 1000); // Slightly faster processing
    }

    return () => clearInterval(interval);
  }, [isProcessing, files, addComic, removeFile, setSelectedItem, pauseProcessing, logAction, updateFile]);

  const handleSkip = () => {
    if (selectedItem?.type === 'file') {
      skipFile(selectedItem as QueuedFile);
      setSelectedItem(null);
    }
  };

  const pendingCount = files.filter(f => f.status === 'Pending').length;
  const processingCount = files.filter(f => f.status === 'Success').length;
  const needsReviewCount = files.filter(f => f.status === 'Warning' || f.status === 'Error').length;

  return (
    <div className="h-full flex flex-col space-y-4">
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

      {/* Statistics */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{processingCount}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{needsReviewCount}</div>
              <div className="text-sm text-muted-foreground">Needs Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{files.length}</div>
              <div className="text-sm text-muted-foreground">Total Files</div>
            </CardContent>
          </Card>
        </div>
      )}

      {files.length > 0 && (
        <BulkActions 
          files={files} 
          selectedFiles={selectedFiles} 
          onSelectionChange={setSelectedFiles} 
        />
      )}

      <div className="flex-1 rounded-lg border bg-card text-card-foreground shadow-sm">
        {files.length === 0 ? (
          <FileDropzone />
        ) : (
          <FileQueue 
            files={files} 
            selectedFiles={selectedFiles}
            onSelectionChange={setSelectedFiles}
          />
        )}
      </div>
    </div>
  );
};

export default Organize;