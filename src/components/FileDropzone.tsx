import { useState, useCallback } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const FileDropzone = () => {
  const { addMockFiles, addFiles, triggerSelectFiles } = useAppContext();
  const { isElectron } = useElectron();
  const [isDragOver, setIsDragOver] = useState(false);

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
    if (isElectron) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      showError("No files were dropped");
      return;
    }

    const comicExtensions = ['.cbr', '.cbz', '.pdf'];
    const comicFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ, PDF");
      return;
    }

    const queuedFiles = comicFiles.map((file, index) => ({
      id: `web-dropped-file-${Date.now()}-${index}`,
      name: file.name,
      path: `mock://web-drop/${file.name}`,
      series: null,
      issue: null,
      year: null,
      publisher: null,
      confidence: null as any,
      status: 'Pending' as any
    }));
    addFiles(queuedFiles);
    showSuccess(`Added ${queuedFiles.length} comic file${queuedFiles.length !== 1 ? 's' : ''} to queue (web demo mode)`);
  }, [addFiles, isElectron]);

  const handleClick = () => {
    if (isElectron) {
      triggerSelectFiles();
    } else {
      addMockFiles();
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${
        isDragOver && !isElectron
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-muted-foreground/50 hover:border-primary hover:bg-accent'
      }`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && !isElectron ? (
        <FileText className="h-16 w-16 text-primary animate-bounce" />
      ) : (
        <UploadCloud className="h-16 w-16 text-muted-foreground/50" />
      )}
      <h3 className="mt-4 text-lg font-semibold">
        {isDragOver && !isElectron ? 'Drop files here!' : 'Add Your Comics'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {isElectron 
          ? "Click here to select files, or use the buttons in the header."
          : 'Drag files here or click to add demo files (web mode)'
        }
      </p>
    </div>
  );
};

export default FileDropzone;