import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Undo, Loader2 } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { parseFilename } from "@/lib/parser";

const Organize = () => {
  const { 
    files, 
    setFiles, 
    addComic, 
    removeFile, 
    isProcessing, 
    startProcessing, 
    pauseProcessing,
    logAction,
    updateFile
  } = useAppContext();
  const { setSelectedItem } = useSelection();
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

    if (isProcessing && queueIndex.current < files.length) {
      interval = setInterval(() => {
        if (queueIndex.current >= files.length) {
            pauseProcessing();
            return;
        }
        
        const currentFile = files[queueIndex.current];

        if (currentFile && currentFile.status === 'Pending') {
            // If file has no metadata, try to parse it
            if (!currentFile.series) {
              const parsed = parseFilename(currentFile.path);
              if (parsed.series && parsed.issue) {
                updateFile({
                  ...currentFile,
                  series: parsed.series,
                  issue: parsed.issue,
                  year: parsed.year,
                  publisher: null, // Publisher still needs to be found
                  confidence: "Medium",
                });
                // The file will be re-evaluated in the next interval
              } else {
                updateFile({ ...currentFile, status: "Warning" });
                logAction('info', `'${currentFile.name}' needs manual review.`);
              }
            } else if (currentFile.name.toLowerCase().includes("corrupted")) {
              updateFile({ ...currentFile, status: "Error" });
              logAction('error', `Failed to process '${currentFile.name}'.`);
            } else if (currentFile.confidence === "Low") {
              updateFile({ ...currentFile, status: "Warning" });
            } else if (currentFile.series && currentFile.issue && currentFile.year && currentFile.publisher) {
              updateFile({ ...currentFile, status: "Success" });
              
              setTimeout(() => {
                addComic({
                  series: currentFile.series!,
                  issue: currentFile.issue!,
                  year: currentFile.year!,
                  publisher: currentFile.publisher!,
                  volume: String(currentFile.year!),
                  summary: `Added from file: ${currentFile.name}`
                }, currentFile);
                removeFile(currentFile.id);
                setSelectedItem(null);
              }, 500);
            }
        }

        queueIndex.current++;

        if (queueIndex.current >= files.length) {
          pauseProcessing();
        }
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [isProcessing, files, setFiles, addComic, removeFile, setSelectedItem, pauseProcessing, logAction, updateFile]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organize</h1>
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            {!isProcessing ? (
              <Button onClick={startProcessing}>
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button variant="outline" onClick={pauseProcessing}>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pause
              </Button>
            )}
            <Button variant="outline" disabled>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost" disabled>
              <Undo className="h-4 w-4 mr-2" /> Undo Last
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 rounded-lg border bg-card text-card-foreground shadow-sm">
        {files.length === 0 ? (
          <FileDropzone />
        ) : (
          <FileQueue files={files} />
        )}
      </div>
    </div>
  );
};

export default Organize;