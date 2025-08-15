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

    if (isElectron) {
      // In Electron mode, try to get file paths
      const paths = comicFiles.map(file => (file as any).path).filter(Boolean);
      if (paths.length > 0) {
        // Convert to QueuedFile objects with real paths
        const queuedFiles = paths.map((path, index) => ({
          id: `dropped-file-${Date.now()}-${index}`,
          name: path.split(/[\\/]/).pop() || 'Unknown File',
          path: path,
          series: null,
          issue: null,
          year: null,
          publisher: null,
          confidence: null as any,
          status: 'Pending' as any
        }));
        addFiles(queuedFiles);
        showSuccess(`Added ${queuedFiles.length} comic file${queuedFiles.length !== 1 ? 's' : ''} to queue`);
      } else {
        // Fallback to mock files if paths aren't available
        showError("Could not access file paths. Adding demo files instead.");
        addMockFiles();
      }
    } else {
      // Web mode - convert to mock files for demonstration
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
      showSuccess(`Added ${queuedFiles.length} comic file${queuedFiles.length !== 1 ? 's' : ''} to queue (web mode)`);
    }
  }, [addFiles, addMockFiles, isElectron]);

  const handleClick = () => {
    // Always add mock files when clicking the dropzone
    addMockFiles();
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
            ? 'Drag CBR/CBZ files here or click to add demo files'
            : 'Drag files here or click to add demo files (web mode)'
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