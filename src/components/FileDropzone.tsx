import { UploadCloud } from "lucide-react";

const FileDropzone = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-12 text-center">
      <UploadCloud className="h-16 w-16 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">Drop comics here</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        or click "Add Files..." to select them from your computer.
      </p>
    </div>
  );
};

export default FileDropzone;