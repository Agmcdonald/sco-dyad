import { useState, useCallback } from "react";
import { UploadCloud, FileText, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const FileDropzone = () => {
  const { addMockFiles, addFiles, triggerSelectFiles, triggerScanFolder } = useAppContext();
  const { isElectron } = useElectron();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isElectron) {
      // Don't allow drag-and-drop in Electron due to security restrictions
      return;
    }
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if (isElectron) {
      // Don't handle drops in Electron
      showError("Please use the 'Add Files' or 'Scan Folder' buttons above instead.");
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('[DROPZONE] Dropped files:', droppedFiles);

    if (droppedFiles.length === 0) {
      showError("No files were dropped");
      return;
    }

    const comicExtensions = ['.cbr', '.cbz'];
    const comicFiles = droppedFiles.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ");
      return;
    }

    // Web mode (demo)
    const queuedFiles = comicFiles.map((file, index) => ({
      id: `web-dropped-file-${Date.now()}-${index}`,
      name: file.name,
      path: `mock://web-drop/${file.name}`,
      series: null,
      issue: null,
      year: null,
      publisher: null,
      volume: null,
      confidence: null as any,
      status: 'Pending' as any
    }));
    addFiles(queuedFiles);
    showSuccess(`Added ${queuedFiles.length} comic file${queuedFiles.length !== 1 ? 's' : ''} to queue (web demo mode)`);
  }, [isElectron, addFiles]);

  const handleClick = () => {
    if (isElectron) {
      triggerSelectFiles();
    } else {
      addMockFiles();
    }
  };

  if (isElectron) {
    // Desktop version - show file selection buttons
    return (
      <div className="flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-12 text-center">
        <UploadCloud className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Add Your Comics</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Use the buttons below to select comic files from your computer.
        </p>
        <div className="flex gap-4">
          <Button onClick={triggerSelectFiles} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Files...
          </Button>
          <Button onClick={triggerScanFolder} variant="outline" className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            Scan Folder...
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: CBR, CBZ
        </p>
      </div>
    );
  }

  // Web version - allow drag and drop for demo
  return (
    <div 
      className={`flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-muted-foreground/50 hover:border-primary hover:bg-accent'
      }`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver ? (
        <FileText className="h-16 w-16 text-primary animate-bounce" />
      ) : (
        <UploadCloud className="h-16 w-16 text-muted-foreground/50" />
      )}
      <h3 className="mt-4 text-lg font-semibold">
        {isDragOver ? 'Drop files here!' : 'Add Your Comics'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag files here or click to add demo files (web mode)
      </p>
    </div>
  );
};

export default FileDropzone;