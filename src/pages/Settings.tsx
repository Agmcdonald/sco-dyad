import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/context/SettingsContext";
import { showError, showSuccess } from "@/utils/toast";
import { testApiConnection } from "@/lib/scraper";
import { comicsKnowledgeData } from "@/data/comicsKnowledge";
import { Loader2, Database, Upload, Download } from "lucide-react";
import KnowledgeBaseManager from "@/components/KnowledgeBaseManager";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    // The settings are already updated on change thanks to the context.
    // This button just provides user feedback.
    showSuccess("Settings saved successfully!");
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const result = await testApiConnection(settings.comicVineApiKey);
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
    setIsTesting(false);
  };

  const handleExportKnowledge = () => {
    const blob = new Blob([JSON.stringify(comicsKnowledgeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comics-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess("Knowledge base exported successfully");
  };

  const handleImportKnowledge = () => {
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
            if (Array.isArray(data) && data.length > 0) {
              showSuccess(`Import would add ${data.length} series to knowledge base (feature not fully implemented)`);
            } else {
              showError("Invalid knowledge base file format");
            }
          } catch (error) {
            showError("Failed to parse knowledge base file");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Calculate knowledge base stats
  const totalSeries = comicsKnowledgeData.length;
  const totalVolumes = comicsKnowledgeData.reduce((sum, series) => sum + series.volumes.length, 0);
  const publishers = new Set(comicsKnowledgeData.map(s => s.publisher));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application and library preferences.
        </p>
      </div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="file-handling">File Handling</TabsTrigger>
          <TabsTrigger value="scrapers">Scrapers</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select the color theme for the application.
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Library Path</CardTitle>
              <CardDescription>
                The root folder where your organized comics will be stored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  id="library-path"
                  defaultValue="/Users/You/Documents/Comics"
                  disabled
                />
                <Button variant="outline" disabled>Choose...</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Naming Conventions</CardTitle>
              <CardDescription>
                Define the folder and file structure for your library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="folder-format">Folder Name Format</Label>
                <Input
                  id="folder-format"
                  value={settings.folderNameFormat}
                  onChange={(e) => setSettings({ ...settings, folderNameFormat: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="file-format">File Name Format</Label>
                <Input
                  id="file-format"
                  value={settings.fileNameFormat}
                  onChange={(e) => setSettings({ ...settings, fileNameFormat: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave}>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="file-handling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Operations</CardTitle>
              <CardDescription>
                Configure how original files are handled after processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="keep-original" className="font-medium">Keep Original Files</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to copy files to the library, leaving the originals in place. Disable to move them.
                  </p>
                </div>
                <Switch 
                  id="keep-original" 
                  checked={settings.keepOriginalFiles}
                  onCheckedChange={(checked) => setSettings({ ...settings, keepOriginalFiles: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-scan" className="font-medium">Auto-Scan on Startup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically scan the "Organize" queue folder when the app starts.
                  </p>
                </div>
                <Switch 
                  id="auto-scan" 
                  checked={settings.autoScanOnStartup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoScanOnStartup: checked })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave}>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="scrapers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comic Vine API</CardTitle>
              <CardDescription>
                Enter your API key to fetch metadata from Comic Vine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key" 
                  type="password" 
                  value={settings.comicVineApiKey}
                  onChange={(e) => setSettings({ ...settings, comicVineApiKey: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="secondary" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Knowledge Base Overview
              </CardTitle>
              <CardDescription>
                Quick overview of the preseeded comic knowledge database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{totalSeries}</div>
                  <div className="text-sm text-muted-foreground">Series</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalVolumes}</div>
                  <div className="text-sm text-muted-foreground">Volumes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{publishers.size}</div>
                  <div className="text-sm text-muted-foreground">Publishers</div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Top Publishers:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(publishers).slice(0, 8).map(publisher => (
                    <Badge key={publisher} variant="secondary">{publisher}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportKnowledge}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" onClick={handleImportKnowledge}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Knowledge base provides intelligent suggestions during file processing
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;