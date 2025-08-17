import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { useElectron } from "@/hooks/useElectron";
import { showError, showSuccess } from "@/utils/toast";
import { testApiConnection, testMarvelApiConnection } from "@/lib/scraper";
import { Loader2, Database, FolderOpen } from "lucide-react";
import KnowledgeBaseManager from "@/components/KnowledgeBaseManager";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const { knowledgeBase } = useKnowledgeBase();
  const { isElectron, electronAPI } = useElectron();
  const location = useLocation();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingMarvel, setIsTestingMarvel] = useState(false);
  const [libraryPath, setLibraryPath] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  // Initialize libraryPath from settings
  useEffect(() => {
    setLibraryPath(settings.libraryPath || "");
  }, [settings.libraryPath]);

  // Handle navigation from other components
  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
      // Clear the state to prevent issues with back navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSave = async () => {
    const updatedSettings = { ...settings, libraryPath };
    setSettings(updatedSettings);
    
    // Save to Electron if available
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveSettings(updatedSettings);
        showSuccess("Settings saved successfully!");
      } catch (error) {
        showError("Failed to save settings to disk");
        console.error("Error saving settings:", error);
      }
    } else {
      showSuccess("Settings saved successfully!");
    }
  };

  const handleChooseLibraryPath = async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      return;
    }

    try {
      const result = await electronAPI.selectFolderDialog();
      if (result && result.length > 0) {
        const selectedPath = result[0];
        setLibraryPath(selectedPath);
        console.log("Selected library path:", selectedPath);
      }
    } catch (error) {
      showError("Failed to select folder");
      console.error("Error selecting folder:", error);
    }
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

  const handleTestMarvelConnection = async () => {
    setIsTestingMarvel(true);
    const result = await testMarvelApiConnection(settings.marvelPublicKey, settings.marvelPrivateKey);
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
    setIsTestingMarvel(false);
  };

  // Calculate knowledge base stats
  const totalSeries = knowledgeBase.length;
  const totalVolumes = knowledgeBase.reduce((sum, series) => sum + series.volumes.length, 0);
  const publishers = new Set(knowledgeBase.map(s => s.publisher));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application and library preferences.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                  value={libraryPath}
                  onChange={(e) => setLibraryPath(e.target.value)}
                  placeholder={isElectron ? "Choose a folder..." : "C:\\Users\\You\\Documents\\Comics"}
                />
                <Button 
                  variant="outline" 
                  onClick={handleChooseLibraryPath}
                  disabled={!isElectron}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Choose...
                </Button>
              </div>
              {!isElectron && (
                <p className="text-sm text-muted-foreground mt-2">
                  Library path selection is only available in the desktop app.
                </p>
              )}
              {libraryPath && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {libraryPath}
                </p>
              )}
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
          <Card>
            <CardHeader>
              <CardTitle>Marvel API</CardTitle>
              <CardDescription>
                Enter your public and private keys from the{" "}
                <a href="https://developer.marvel.com/" target="_blank" rel="noopener noreferrer" className="underline">
                  Marvel Developer Portal
                </a>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="marvel-public-key">Public Key</Label>
                <Input 
                  id="marvel-public-key" 
                  value={settings.marvelPublicKey}
                  onChange={(e) => setSettings({ ...settings, marvelPublicKey: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="marvel-private-key">Private Key</Label>
                <Input 
                  id="marvel-private-key" 
                  type="password" 
                  value={settings.marvelPrivateKey}
                  onChange={(e) => setSettings({ ...settings, marvelPrivateKey: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="secondary" onClick={handleTestMarvelConnection} disabled={isTestingMarvel}>
                {isTestingMarvel ? (
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
            <CardFooter className="border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Manage the knowledge base in the Advanced tab.
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