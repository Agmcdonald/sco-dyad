import { useState, useCallback } from "react";
import { UploadCloud } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const FileDropzone = () => {
  const { addMockFiles, addFiles } = useAppContext();
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
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      showError("No files were dropped");
      return;
    }

    // Filter for comic files
    const comicExtensions = ['.cbr', '.cbz', '.pdf'];
    const comicFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ, PDF");
      return;
    }

    if (comicFiles.length !== files.length) {
      showError(`${files.length - comicFiles.length} non-comic files were ignored`);
    }

    // Convert dropped files to QueuedFile objects
    const queuedFiles = comicFiles.map((file, index) => ({
      id: `dropped-file-${Date.now()}-${index}`,
      name: file.name,
      path: isElectron ? (file as any).path || file.name : file.name, // In Electron, files have a path property
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

  const handleClick = () => {
    if (isElectron) {
      // In Electron mode, we could trigger the file dialog here
      // For now, just show mock files
      addMockFiles();
    } else {
      // In web mode, show mock files
      addMockFiles();
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
        isDragOver 
          ? 'border-primary bg-primary/10' 
          : 'border-muted-foreground/50 hover:border-primary hover:bg-accent'
      }`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadCloud className={`h-16 w-16 transition-colors ${
        isDragOver ? 'text-primary' : 'text-muted-foreground/50'
      }`} />
      <h3 className="mt-4 text-lg font-semibold">
        {isDragOver ? 'Drop comics here' : 'Drop comics here'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {isDragOver 
          ? 'Release to add files to queue' 
          : isElectron 
            ? 'Drag CBR/CBZ files here or click to add mock files'
            : 'or click to add mock files (web mode)'
        }
      </p>
      {isDragOver && (
        <div className="mt-2 text-xs text-primary font-medium">
          Supported: CBR, CBZ, PDF
        </div>
      )}
    </div>
  );
};

export default FileDropzone;