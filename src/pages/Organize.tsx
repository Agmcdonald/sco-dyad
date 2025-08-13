import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Undo, Loader2 } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { parseFilename } from "@/lib/parser";
import { fetchComicMetadata } from "@/lib/scraper";

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
  const { settings } = useSettings();
  const { selectedItem, setSelectedItem } = useSelection();
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
      if (queueIndex.current >= files.length) {
        pauseProcessing();
        return;
      }
      
      const currentFile = files[queueIndex.current];

      if (currentFile && currentFile.status === 'Pending') {
        const parsed = parseFilename(currentFile.path);
        const scraperResult = await fetchComicMetadata(parsed, settings.comicVineApiKey);

        if (scraperResult.success && scraperResult.data) {
          const finalData = {
            series: parsed.series!,
            issue: parsed.issue!,
            year: parsed.year!,
            publisher: scraperResult.data.publisher,
            volume: scraperResult.data.volume,
            summary: scraperResult.data.summary,
          };

          updateFile({ ...currentFile, ...finalData, status: "Success", confidence: "High" });
          
          setTimeout(() => {
            addComic(finalData, currentFile);
            removeFile(currentFile.id);
            setSelectedItem(null);
          }, 500);

        } else {
          updateFile({ ...currentFile, status: "Warning", series: parsed.series, issue: parsed.issue, year: parsed.year });
          logAction('info', `'${currentFile.name}': ${scraperResult.error}`);
        }
      }

      queueIndex.current++;
      if (queueIndex.current >= files.length) {
        pauseProcessing();
      }
    };

    if (isProcessing) {
      interval = setInterval(processNextFile, 1500);
    }

    return () => clearInterval(interval);
  }, [isProcessing, files, addComic, removeFile, setSelectedItem, pauseProcessing, logAction, updateFile, settings.comicVineApiKey]);

  const handleSkip = () => {
    if (selectedItem) {
      skipFile(selectedItem);
      setSelectedItem(null);
    }
  };

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
            <Button variant="outline" disabled={!selectedItem} onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost" disabled={!lastUndoableAction} onClick={undoLastAction}>
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