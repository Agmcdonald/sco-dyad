import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Database, FileText, FolderOpen, Loader2, CheckCircle } from "lucide-react";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

const GcdImporter = () => {
  const { isElectron, electronAPI } = useElectron();
  const [issuesPath, setIssuesPath] = useState("");
  const [sequencesPath, setSequencesPath] = useState("");
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  useEffect(() => {
    if (!electronAPI) return;

    const handleProgress = (data: { percent: number; message: string }) => {
      setProgress(data.percent);
      setProgressMessage(data.message);
    };

    electronAPI.onImporterProgress(handleProgress);

    return () => {
      electronAPI.removeAllListeners('importer:progress');
    };
  }, [electronAPI]);

  const handleSelectFile = async (setter: (path: string) => void, title: string) => {
    if (!electronAPI) return;
    try {
      const result = await electronAPI.selectFilesDialog();
      if (result && result.length > 0) {
        setter(result[0]);
      }
    } catch (error) {
      showError(`Failed to select ${title} file.`);
    }
  };

  const handleStartImport = async () => {
    if (!issuesPath || !sequencesPath || !electronAPI) {
      showError("Please select both TSV files before starting.");
      return;
    }
    setStatus('importing');
    setProgress(0);
    setProgressMessage("Starting import...");

    try {
      const result = await electronAPI.importerStart({ issuesPath, sequencesPath });
      if (result.success) {
        setStatus('success');
        setProgress(100);
        setProgressMessage(result.message);
        showSuccess(result.message);
      } else {
        setStatus('error');
        setProgressMessage(result.message || "An unknown error occurred.");
        showError(result.message || "Import failed.");
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setProgressMessage(errorMessage);
      showError(errorMessage);
    }
  };

  if (!isElectron) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Local Database Importer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This feature is only available in the desktop application.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Local Database Importer
        </CardTitle>
        <CardDescription>
          Build a high-speed local database from the Grand Comics Database (GCD) data dumps for offline metadata enrichment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="issues-path">Issues Data File (issues.tsv)</Label>
          <div className="flex items-center gap-2">
            <Input id="issues-path" value={issuesPath} readOnly />
            <Button variant="outline" onClick={() => handleSelectFile(setIssuesPath, 'Issues')}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="sequences-path">Story Data File (sequences.tsv)</Label>
          <div className="flex items-center gap-2">
            <Input id="sequences-path" value={sequencesPath} readOnly />
            <Button variant="outline" onClick={() => handleSelectFile(setSequencesPath, 'Sequences')}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {status === 'importing' && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">{progressMessage}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-700 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{progressMessage}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartImport} disabled={status === 'importing' || !issuesPath || !sequencesPath}>
          {status === 'importing' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            "Build Database"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GcdImporter;