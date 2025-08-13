import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Undo } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import FileQueue, { QueuedFile } from "@/components/FileQueue";

const mockFiles: QueuedFile[] = [
  { id: 1, name: "Saga #61.cbz", series: "Saga", issue: "61", year: 2023, publisher: "Image Comics", confidence: "High", status: "Success" },
  { id: 2, name: "Batman - The Knight 03.cbr", series: "Batman: The Knight", issue: "3", year: 2022, publisher: "DC Comics", confidence: "High", status: "Success" },
  { id: 3, name: "Weird-Comic_v2_04.cbz", series: "Weird Comic", issue: "4", year: 2021, publisher: "Unknown", confidence: "Medium", status: "Warning" },
  { id: 4, name: "My-Hero-Academia-300.zip", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 5, name: "Corrupted_File.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Error" },
];

const Organize = () => {
  const [files, setFiles] = useState<QueuedFile[]>(mockFiles);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organize</h1>
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <Button>
              <Play className="h-4 w-4 mr-2" /> Start
            </Button>
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
            <Button variant="outline">
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <Button variant="ghost">
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