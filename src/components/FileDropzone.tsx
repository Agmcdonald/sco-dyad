import { UploadCloud } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const FileDropzone = () => {
  const { addMockFiles } = useAppContext();

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/50 p-12 text-center cursor-pointer hover:border-primary hover:bg-accent transition-colors"
      onClick={addMockFiles}
    >
      <UploadCloud className="h-16 w-16 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">Drop comics here</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        or click to add mock files.
      </p>
    </div>
  );
};

export default FileDropzone;