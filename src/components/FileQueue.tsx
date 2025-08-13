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

const statusStyles: Record<FileStatus, string> = {
  Success: "bg-green-500/10 hover:bg-green-500/20",
  Warning: "bg-yellow-500/10 hover:bg-yellow-500/20",
  Error: "bg-red-500/10 hover:bg-red-500/20",
  Pending: "hover:bg-muted/50",
};

const confidenceVariant: Record<Confidence, "default" | "secondary" | "destructive"> = {
  High: "default",
  Medium: "secondary",
  Low: "destructive",
};

const FileQueue = ({ files }: { files: QueuedFile[] }) => {
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
          {files.map((file) => (
            <TableRow
              key={file.id}
              className={cn("cursor-pointer", statusStyles[file.status])}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FileQueue;