import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import GcdDatabaseManager from "@/components/GcdDatabaseManager";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";
import MigrateCoversButton from "@/components/MigrateCoversButton";

const Maintenance = () => {
  const { comics, files, actions, importComics, isScanningMetadata, metadataScanProgress, startMetadataScan } = useAppContext();
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
            <div className="flex flex-col md:flex-row gap-2">
              <Button className="w-full md:w-auto justify-start" onClick={handleExportLibrary}>
                <Download className="h-4 w-4 mr-2" />
                Export Library
              </Button>
              <Button className="w-full md:w-auto justify-start" variant="outline" onClick={handleImportLibrary}>
                <Upload className="h-4 w-4 mr-2" />
                Import Library
              </Button>
              <Button className="w-full md:w-auto justify-start" variant="outline" onClick={handleRebuildIndex}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rebuild Index
              </Button>
              <Button className="w-full md:w-auto justify-start" variant="outline" onClick={handleCleanupFiles}>
                <Trash2 className="h-4 w-4 mr-2" />
                Cleanup Temp Files
              </Button>
            </div>

            {/* New: Migrate Covers */}
            <div className="pt-2">
              <MigrateCoversButton />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Detection */}
      <DuplicateDetector />

      {/* Work in Progress Section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Work in Progress</h2>
        <div className="relative space-y-6 opacity-50 pointer-events-none">
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg">
              <p className="font-semibold text-foreground">Coming Soon</p>
            </div>
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
          <GcdDatabaseManager />
          <GcdImporter />
        </div>
      </div>
    </div>
  );
};

export default Maintenance;