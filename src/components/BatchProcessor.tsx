import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Play, Pause, RotateCcw } from "lucide-react";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { batchProcessFiles, getProcessingStats } from "@/lib/smartProcessor";
import { showSuccess, showError } from "@/utils/toast";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { useElectron } from "@/hooks/useElectron";

/**
 * @interface BatchProcessorProps
 * @summary Defines the props for the BatchProcessor component.
 * @property {QueuedFile[]} files - The complete list of files in the queue.
 * @property {string[]} selectedFiles - An array of IDs for the currently selected files.
 */
interface BatchProcessorProps {
  files: QueuedFile[];
  selectedFiles: string[];
}

/**
 * @component BatchProcessor
 * @summary A component that manages and displays the batch processing of comic files.
 * @description This component provides the UI for starting, monitoring, and viewing the results
 * of the batch metadata processing. It allows users to process all pending files, only
 * selected files, or all files in the queue. It displays progress and a summary of the results.
 * @param {BatchProcessorProps} props - The props for the component.
 */
const BatchProcessor = ({ files, selectedFiles }: BatchProcessorProps) => {
  const { updateFile, addComic, removeFile, logAction } = useAppContext();
  const { settings } = useSettings();
  const { knowledgeBase } = useKnowledgeBase();
  const { electronAPI } = useElectron();

  /** State to track if processing is currently active. */
  const [isProcessing, setIsProcessing] = useState(false);
  /** State to track the progress percentage of the batch operation. */
  const [progress, setProgress] = useState(0);
  /** State to store the name of the file currently being processed. */
  const [currentFile, setCurrentFile] = useState("");
  /** State to manage which group of files to process ('all', 'selected', 'pending'). */
  const [processingMode, setProcessingMode] = useState<"all" | "selected" | "pending">("pending");
  /** State to store the results of the last batch processing operation. */
  const [lastResults, setLastResults] = useState<Map<string, any> | null>(null);

  /**
   * @function getFilesToProcess
   * @summary Determines which files to process based on the current processing mode.
   * @returns {QueuedFile[]} An array of files to be processed.
   */
  const getFilesToProcess = () => {
    switch (processingMode) {
      case "all":
        return files;
      case "selected":
        return files.filter(f => selectedFiles.includes(f.id));
      case "pending":
      default:
        return files.filter(f => f.status === 'Pending');
    }
  };

  const filesToProcess = getFilesToProcess();

  /**
   * @function handleBatchProcess
   * @summary Initiates and manages the batch processing of the selected files.
   * @description This function calls the `batchProcessFiles` utility, updates the UI with progress,
   * and then applies the results to the files in the queue. High-confidence results are
   * automatically added to the library.
   */
  const handleBatchProcess = async () => {
    if (filesToProcess.length === 0) {
      showError("No files to process");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentFile("");

    try {
      console.log(`[FILE-PROCESSOR] Starting processing of ${filesToProcess.length} files`);
      
      const results = await batchProcessFiles(
        filesToProcess,
        settings.comicVineApiKey,
        knowledgeBase,
        electronAPI,
        (processed, total, current) => {
          setProgress((processed / total) * 100);
          setCurrentFile(current);
        }
      );

      setLastResults(results);

      for (const [fileId, result] of results.entries()) {
        const file = files.find(f => f.id === fileId);
        if (!file) continue;

        if (result.success && result.data) {
          updateFile({
            ...file,
            ...result.data,
            status: "Success",
            confidence: result.confidence
          });

          if (result.confidence === 'High') {
            setTimeout(() => {
              addComic(result.data, file);
              removeFile(file.id);
            }, 100);
          }
        } else {
          updateFile({
            ...file,
            status: result.confidence === 'Low' ? "Error" : "Warning",
            confidence: result.confidence
          });
        }
      }

      const stats = getProcessingStats(results);
      logAction('info', `File processing complete: ${stats.successful}/${stats.total} files processed successfully`);
      showSuccess(`Processed ${stats.successful} out of ${stats.total} files`);

    } catch (error) {
      console.error(`[FILE-PROCESSOR] Error:`, error);
      showError("File processing failed");
      logAction('error', 'File processing encountered an error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentFile("");
    }
  };

  const stats = lastResults ? getProcessingStats(lastResults) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">File Processor</CardTitle>
        <CardDescription>
          Process new files to be added to the library with intelligent detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Process:</label>
          <Select value={processingMode} onValueChange={(value: any) => setProcessingMode(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Files ({files.filter(f => f.status === 'Pending').length})</SelectItem>
              <SelectItem value="selected">Selected Files ({selectedFiles.length})</SelectItem>
              <SelectItem value="all">All Files ({files.length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing: {currentFile}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {stats && !isProcessing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold text-green-600">{stats.successful}</div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold text-blue-600">{stats.highConfidence}</div>
              <div className="text-xs text-muted-foreground">High Confidence</div>
            </div>
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold text-yellow-600">{stats.mediumConfidence}</div>
              <div className="text-xs text-muted-foreground">Medium Confidence</div>
            </div>
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleBatchProcess}
            disabled={isProcessing || filesToProcess.length === 0}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Process {filesToProcess.length} Files
              </>
            )}
          </Button>
          
          {stats && (
            <Button variant="outline" onClick={() => setLastResults(null)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filesToProcess.length === 0 ? (
            "No files available for processing"
          ) : (
            `Ready to process ${filesToProcess.length} file${filesToProcess.length !== 1 ? 's' : ''}`
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchProcessor;