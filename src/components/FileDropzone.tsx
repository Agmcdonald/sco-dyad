import { useState, useCallback } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const FileDropzone = () => {
  const { addMockFiles, addFiles, triggerSelectFiles, addFilesFromPaths } = useAppContext();
  const { isElectron } = useElectron();
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('[DROPZONE] Dropped files:', droppedFiles);

    if (droppedFiles.length === 0) {
      showError("No files were dropped");
      return;
    }

    const comicExtensions = ['.cbr', '.cbz', '.pdf'];
    const comicFiles = droppedFiles.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ, PDF");
      return;
    }

    if (isElectron) {
      try {
        // In Electron, the File object has a 'path' property with the real file system path.
        const filePaths = comicFiles.map(file => {
          const filePath = (file as any).path;
          console.log('[DROPZONE] File path for', file.name, ':', filePath);
          return filePath;
        }).filter(path => path); // Filter out any undefined paths

        if (filePaths.length === 0) {
          showError("Could not access file paths. Please use the 'Add Files' button instead.");
          return;
        }

        await addFilesFromPaths(filePaths);
      } catch (error) {
        console.error('[DROPZONE] Error processing dropped files:', error);
        showError("Error processing dropped files. Please try using the 'Add Files' button.");
      }
    } else {
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
    }
  }, [isElectron, addFilesFromPaths, addFiles]);

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
        {isElectron 
          ? "Drag & drop files here, or click to select."
          : 'Drag files here or click to add demo files (web mode)'
        }
      </p>
    </div>
  );
};

export default FileDropzone;