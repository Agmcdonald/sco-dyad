import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";

const ProgressStrip = () => {
  const { files } = useAppContext();

  const totalFiles = files.length;
  const processedFiles = files.filter(f => f.status !== 'Pending').length;
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="text-sm text-muted-foreground">
            {processedFiles} of {totalFiles} files processed.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressStrip;