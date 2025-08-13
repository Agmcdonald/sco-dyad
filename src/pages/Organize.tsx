import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Undo, Loader2 } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue from "@/components/FileQueue";
import { useSelection } from "@/context/SelectionContext";
import { useAppContext } from "@/context/AppContext";

const Organize = () => {
  const { files, setFiles, addComic, removeFile } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const { setSelectedItem } = useSelection();
  const queueIndex = useRef(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isProcessing && queueIndex.current < files.length) {
      interval = setInterval(() => {
        if (queueIndex.current >= files.length) {
            setIsProcessing(false);
            return;
        }
        
        const currentFile = files[queueIndex.current];

        // Simulate processing logic
        if (currentFile.name.toLowerCase().includes("corrupted")) {
          setFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: "Error" } : f));
        } else if (currentFile.confidence === "Low") {
          setFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: "Warning" } : f));
        } else if (currentFile.series && currentFile.issue && currentFile.year && currentFile.publisher) {
          setFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: "Success" } : f));
          
          setTimeout(() => {
            addComic({
              series: currentFile.series!,
              issue: currentFile.issue!,
              year: currentFile.year!,
              publisher: currentFile.publisher!,
              volume: String(currentFile.year!),
              summary: `Added from file: ${currentFile.name}`
            });
            removeFile(currentFile.id);
            setSelectedItem(null);
          }, 500);
        }

        queueIndex.current++;

        if (queueIndex.current >= files.length) {
          setIsProcessing(false);
        }
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [isProcessing, files, setFiles, addComic, removeFile, setSelectedItem]);

  const handleStart = () => {
    queueIndex.current = 0;
    setIsProcessing(true);
  };

  const handlePause = () => {
    setIsProcessing(false);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organize</h1>
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <Button onClick={handleStart} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start
            </Button>
            <Button variant="outline" onClick={handlePause} disabled={!isProcessing}>
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
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