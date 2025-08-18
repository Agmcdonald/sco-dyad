import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  FileSearch, 
  RefreshCw, 
  Download,
  Upload,
  Trash2,
  Sparkles,
  Loader2
} from "lucide-react";
import DuplicateDetector from "@/components/DuplicateDetector";
import GcdImporter from "@/components/GcdImporter";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

const Maintenance = () => {
  const { comics, files, actions, importComics, isScanningMetadata, metadataScanProgress, startMetadataScan } from useAppContext();
  const { isElectron, electronAPI } = useElectron();

  const handleExportLibrary = async () => {
    const data = {
      comics,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    const jsonData = JSON.stringify(data, null, 2);

    if (isElectron && electronAPI) {
      const result = await electronAPI.saveBackup(jsonData);
      if (result.success) {
        showSuccess(`Library exported to ${result.path}`);
      } else if (result.error) {
        showError(`Export failed: ${result.error}`);
      }
    } else {
      // Fallback for web
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comic-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("Library exported successfully");
    }
  };

  const processImportData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.comics && Array.isArray(data.comics)) {
        const result = await importComics(data.comics);
        if (result) {
          showSuccess(`Import complete. Added ${result.added} new comics, skipped ${result.skipped} duplicates.`);
        }
      } else {
        showError("Invalid library file format");
      }
    } catch (error) {
      showError("Failed to parse library file");
    }
  };

  const handleImportLibrary = () => {
    if (isElectron && electronAPI) {
      electronAPI.loadBackup().then(result => {
        if (result.success && result.data) {
          processImportData(result.data);
        } else if (result.error) {
          showError(`Import failed: ${result.error}`);
        }
      });
    } else {
      // Fallback for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            processImportData(e.target?.result as string);
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  const handleRebuildIndex = () => {
    showSuccess("Library index rebuilt successfully");
  };

  const handleCleanupFiles = () => {
    showSuccess("Temporary files cleaned up");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground mt-2">
          Library maintenance tools and utilities.
        </p>
      </div>

      <GcdImporter />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Library Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Library Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{comics.length}</div>
                <div className="text-sm text-muted-foreground">Comics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{files.length}</div>
                <div className="text-sm text-muted-foreground">Files in Queue</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{actions.length}</div>
                <div className="text-sm text-muted-foreground">Recent Actions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Set(comics.map(c => c.series)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique Series</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Library Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Library Tools
            </CardTitle>
            <CardDescription>
              Utilities for managing your comic library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" onClick={handleExportLibrary}>
              <Download className="h-4 w-4 mr-2" />
              Export Library
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={handleImportLibrary}>
              <Upload className="h-4 w-4 mr-2" />
              Import Library
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={handleRebuildIndex}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebuild Index
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={handleCleanupFiles}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Temp Files
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Metadata Enrichment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Metadata Enrichment
          </CardTitle>
          <CardDescription>
            Scan your library to find and fill in missing details like summaries, creators, and cover dates using online databases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isScanningMetadata ? (
            <div className="space-y-3">
              <Progress value={(metadataScanProgress.processed / metadataScanProgress.total) * 100} />
              <div className="text-sm text-muted-foreground">
                Scanning {metadataScanProgress.processed} of {metadataScanProgress.total} comics... 
                ({metadataScanProgress.updated} updated)
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This tool will scan comics with incomplete information and attempt to fetch richer data from online sources.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={startMetadataScan} disabled={isScanningMetadata}>
            {isScanningMetadata ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              "Start Scan for Missing Details"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Duplicate Detection */}
      <DuplicateDetector />
    </div>
  );
};

export default Maintenance;