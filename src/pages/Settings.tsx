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
import { Loader2, Database, FolderOpen, CheckCircle, XCircle } from "lucide-react";
import KnowledgeBaseManager from "@/components/KnowledgeBaseManager";
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const { knowledgeBase } = useKnowledgeBase();
  const { isElectron, electronAPI } = useElectron();
  const gcdDbService = useGcdDatabaseService();
  const location = useLocation();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingMarvel, setIsTestingMarvel] = useState(false);
  const [libraryPath, setLibraryPath] = useState("");
  const [gcdDbPath, setGcdDbPath] = useState("");
  const [gcdDbStatus, setGcdDbStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [activeTab, setActiveTab] = useState("general");

  // Initialize paths from settings
  useEffect(() => {
    setLibraryPath(settings.libraryPath || "");
    setGcdDbPath(settings.gcdDbPath || "");
  }, [settings.libraryPath, settings.gcdDbPath]);

  // Auto-connect to GCD DB on load if path is set
  useEffect(() => {
    if (settings.gcdDbPath && gcdDbService) {
      gcdDbService.connect(settings.gcdDbPath).then(success => {
        setGcdDbStatus(success ? 'connected' : 'error');
      });
    }
  }, [settings.gcdDbPath, gcdDbService]);

  // Handle navigation from other components
  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSave = async () => {
    const updatedSettings = { ...settings, libraryPath, gcdDbPath };
    setSettings(updatedSettings);
    
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveSettings(updatedSettings);
        showSuccess("Settings saved successfully!");
      } catch (error) {
        showError("Failed to save settings to disk");
      }
    } else {
      showSuccess("Settings saved successfully!");
    }
  };

  const handleChoosePath = async (pathSetter: (path: string) => void, title: string) => {
    if (!isElectron || !electronAPI) return;
    try {
      const result = await electronAPI.selectFolderDialog();
      if (result && result.length > 0) pathSetter(result[0]);
    } catch (error) {
      showError(`Failed to select folder for ${title}`);
    }
  };

  const handleChooseGcdDbFile = async () => {
    if (!isElectron || !electronAPI) return;
    try {
      const result = await electronAPI.selectFilesDialog();
      if (result && result.length > 0) {
        const selectedPath = result[0];
        setGcdDbPath(selectedPath);
        if (gcdDbService) {
          const success = await gcdDbService.connect(selectedPath);
          setGcdDbStatus(success ? 'connected' : 'error');
        }
      }
    } catch (error) {
      showError("Failed to select database file.");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const result = await testApiConnection(settings.comicVineApiKey);
    result.success ? showSuccess(result.message) : showError(result.message);
    setIsTesting(false);
  };

  const handleTestMarvelConnection = async () => {
    setIsTestingMarvel(true);
    const result = await testMarvelApiConnection(settings.marvelPublicKey, settings.marvelPrivateKey);
    result.success ? showSuccess(result.message) : showError(result.message);
    setIsTestingMarvel(false);
  };

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

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Select the color theme.</p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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

        <TabsContent value="library">
          <Card>
            <CardHeader>
              <CardTitle>Library Path</CardTitle>
              <CardDescription>The root folder where your organized comics will be stored.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input value={libraryPath} onChange={(e) => setLibraryPath(e.target.value)} />
                <Button variant="outline" onClick={() => handleChoosePath(setLibraryPath, 'Library Path')} disabled={!isElectron}>
                  <FolderOpen className="h-4 w-4 mr-2" /> Choose...
                </Button>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave}>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="file-handling">
          <Card>
            <CardHeader>
              <CardTitle>File Operations</CardTitle>
              <CardDescription>Configure how original files are handled after processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Keep Original Files</Label>
                  <p className="text-sm text-muted-foreground">Enable to copy files, disable to move them.</p>
                </div>
                <Switch checked={settings.keepOriginalFiles} onCheckedChange={(c) => setSettings({ ...settings, keepOriginalFiles: c })} />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave}>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="scrapers">
          <Card>
            <CardHeader>
              <CardTitle>Comic Vine API</CardTitle>
              <CardDescription>Enter your API key to fetch metadata from Comic Vine.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="password" value={settings.comicVineApiKey} onChange={(e) => setSettings({ ...settings, comicVineApiKey: e.target.value })} />
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="secondary" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Test
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Local Grand Comics Database</CardTitle>
              <CardDescription>
                For the fastest and most accurate offline metadata, connect to a local GCD SQLite file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input value={gcdDbPath} placeholder="Path to your gcd.sqlite file" onChange={(e) => setGcdDbPath(e.target.value)} />
                <Button variant="outline" onClick={handleChooseGcdDbFile} disabled={!isElectron}>
                  <Database className="h-4 w-4 mr-2" /> Choose File...
                </Button>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                {gcdDbStatus === 'connected' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {gcdDbStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                {gcdDbStatus === 'disconnected' && <Database className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-medium text-sm">
                    Status: {gcdDbStatus.charAt(0).toUpperCase() + gcdDbStatus.slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gcdDbStatus === 'connected' ? 'Ready to use for processing.' : 'Select a valid GCD file to connect.'}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave}>Save Path</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;