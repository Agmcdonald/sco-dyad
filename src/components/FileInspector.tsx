import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QueuedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Search, ThumbsUp } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import { showError, showSuccess } from "@/utils/toast";
import EditFileModal from "./EditFileModal";

interface FileInspectorProps {
  file: QueuedFile;
}

const confidenceVariant: Record<NonNullable<QueuedFile['confidence']>, "default" | "secondary" | "destructive"> = {
  High: "default",
  Medium: "secondary",
  Low: "destructive",
};

const FileInspector = ({ file }: FileInspectorProps) => {
  const { addComic, removeFile } = useAppContext();
  const { setSelectedItem } = useSelection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleConfirmMatch = () => {
    if (!file.series || !file.issue || !file.year || !file.publisher) {
      showError("Cannot confirm match: Missing required information.");
      return;
    }
    
    addComic({
      series: file.series,
      issue: file.issue,
      year: file.year,
      publisher: file.publisher,
      volume: String(file.year), // Mock volume
      summary: `Manually added from file: ${file.name}`
    }, file);

    removeFile(file.id);
    showSuccess(`'${file.series} #${file.issue}' added to library.`);
    setSelectedItem(null);
  };

  const handleFindManually = () => {
    navigate('/app/learning', { state: { fileId: file.id } });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l">
        <div className="p-4 border-b">
          <h3 className="font-semibold">File Details</h3>
          <p className="text-sm text-muted-foreground break-all">{file.name}</p>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div>
            <h4 className="font-semibold text-sm mb-2">Detected Information</h4>
            {file.series ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Series</span>
                  <span>{file.series}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue</span>
                  <span>{file.issue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year</span>
                  <span>{file.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Publisher</span>
                  <span>{file.publisher}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No match found yet.</p>
            )}
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-2">Processing Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span>{file.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Confidence</span>
                {file.confidence ? (
                  <Badge variant={confidenceVariant[file.confidence]}>{file.confidence}</Badge>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t mt-auto bg-background space-y-2">
          <Button className="w-full" variant="outline" onClick={handleConfirmMatch} disabled={!file.series}>
            <ThumbsUp className="mr-2 h-4 w-4" /> Confirm Match
          </Button>
          <Button className="w-full" onClick={() => setIsModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Correct Match
          </Button>
          <Button className="w-full" variant="secondary" onClick={handleFindManually}>
            <Search className="mr-2 h-4 w-4" /> Find Match Manually
          </Button>
        </div>
      </div>
      {isModalOpen && (
        <EditFileModal
          file={file}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default FileInspector;