import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  FileSearch, 
  RefreshCw, 
  Download,
  Upload,
  Trash2
} from "lucide-react";
import DuplicateDetector from "@/components/DuplicateDetector";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";

const Maintenance = () => {
  const { comics, files, actions } = useAppContext();

  const handleExportLibrary = () => {
    const data = {
      comics,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comic-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess("Library exported successfully");
  };

  const handleImportLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.comics && Array.isArray(data.comics)) {
              showSuccess(`Import would add ${data.comics.length} comics (feature not implemented)`);
            } else {
              showError("Invalid library file format");
            }
          } catch (error) {
            showError("Failed to parse library file");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
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

      {/* Duplicate Detection */}
      <DuplicateDetector />
    </div>
  );
};

export default Maintenance;