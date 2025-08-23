import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { QueuedFile, FileStatus, Confidence } from "@/types";
import { useSelection } from "@/context/SelectionContext";

const statusStyles: Record<FileStatus, string> = {
  Success: "bg-green-500/10",
  Warning: "bg-yellow-500/10",
  Error: "bg-red-500/10",
  Pending: "",
};

const confidenceVariant: Record<Confidence, "default" | "secondary" | "destructive"> = {
  High: "default",
  Medium: "secondary",
  Low: "destructive",
};

interface FileQueueProps {
  files: QueuedFile[];
  selectedFiles?: string[];
  onSelectionChange?: (fileIds: string[]) => void;
  onToggleInspector?: () => void;
}

const FileQueue = ({ files, selectedFiles = [], onSelectionChange, onToggleInspector }: FileQueueProps) => {
  const { selectedItem, setSelectedItem } = useSelection();

  const handleSelect = (file: QueuedFile) => {
    const wasAlreadySelected = selectedItem?.type === 'file' && selectedItem.id === file.id;
    
    if (wasAlreadySelected) {
      setSelectedItem(null); // Deselect if clicking the same item
    } else {
      setSelectedItem({ ...file, type: 'file' });
      
      // Always trigger inspector opening when selecting a new file
      if (onToggleInspector) {
        onToggleInspector();
      }
    }
  };

  const handleCheckboxChange = (fileId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedFiles, fileId]);
    } else {
      onSelectionChange(selectedFiles.filter(id => id !== fileId));
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && <TableHead className="w-12"></TableHead>}
            <TableHead>File</TableHead>
            <TableHead>Detected Series</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const isSelected = selectedItem?.type === 'file' && selectedItem.id === file.id;
            const isChecked = selectedFiles.includes(file.id);
            
            return (
              <TableRow
                key={file.id}
                onClick={() => handleSelect(file)}
                className={cn(
                  "cursor-pointer transition-colors",
                  statusStyles[file.status],
                  isSelected ? "bg-accent" : `hover:bg-muted/50`
                )}
              >
                {onSelectionChange && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => handleCheckboxChange(file.id, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{file.name}</TableCell>
                <TableCell>{file.series || "—"}</TableCell>
                <TableCell>{file.issue || "—"}</TableCell>
                <TableCell>{file.year || "—"}</TableCell>
                <TableCell>{file.pageCount || "—"}</TableCell>
                <TableCell>
                  {file.confidence && (
                    <Badge variant={confidenceVariant[file.confidence]}>
                      {file.confidence}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{file.status}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default FileQueue;