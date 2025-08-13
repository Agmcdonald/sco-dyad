import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

const FileQueue = ({ files }: { files: QueuedFile[] }) => {
  const { selectedItem, setSelectedItem } = useSelection();

  const handleSelect = (file: QueuedFile) => {
    if (selectedItem?.type === 'file' && selectedItem.id === file.id) {
      setSelectedItem(null); // Deselect if clicking the same item
    } else {
      setSelectedItem({ ...file, type: 'file' });
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Detected Series</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const isSelected = selectedItem?.type === 'file' && selectedItem.id === file.id;
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
                <TableCell className="font-medium">{file.name}</TableCell>
                <TableCell>{file.series || "—"}</TableCell>
                <TableCell>{file.issue || "—"}</TableCell>
                <TableCell>{file.year || "—"}</TableCell>
                <TableCell>{file.publisher || "—"}</TableCell>
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