import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";
import { FolderSearch } from "lucide-react";

const FileLoadProgress = () => {
  const { fileLoadStatus } = useAppContext();
  const { isLoading, progress, total, currentFile } = fileLoadStatus;

  if (!isLoading) {
    return null;
  }

  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderSearch className="h-4 w-4 animate-pulse" />
          Loading Files...
        </CardTitle>
        <CardDescription>
          Reading file information from your disk. Please wait.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="truncate max-w-[70%]">{currentFile}</span>
            <span>{progress} of {total}</span>
          </div>
          <Progress value={percentage} />
        </div>
      </CardContent>
    </Card>
  );
};

export default FileLoadProgress;