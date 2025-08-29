import { useState, useEffect } from "react";
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
import { useSettings } from "@/context/SettingsContext";
import { useElectron } from "@/hooks/useElectron";
import { showError, showSuccess } from "@/utils/toast";
import { testApiConnection, testMarvelApiConnection } from "@/lib/scraper";
import { Loader2, FolderOpen, Sun, Moon, Keyboard } from "lucide-react";
import { useLocation } from "react-router-dom";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const { isElectron, electronAPI } = useElectron();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingMarvel, setIsTestingMarvel] = useState(false);
  const [libraryPath, setLibraryPath] = useState("");
  const location = useLocation();

  // Initialize paths from settings
  useEffect(() => {
    setLibraryPath(settings.libraryPath || "");
  }, [settings.libraryPath]);

  // Handle targetTab from navigation state (e.g., first-launch modal)
  const initialTab = (location.state && (location.state as any).targetTab) || "general";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    // If navigation state changes while on the page, update tab
    if (location.state && (location.state as any).targetTab) {
      setActiveTab((location.state as any).targetTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSave = async () => {
    const updatedSettings = { ...settings, libraryPath };
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
          <TabsTrigger value="scrapers">Scrapers</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>A list of available keyboard shortcuts to speed up your workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">Comic Reader</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Right Arrow / Spacebar:</strong> Go to the next page.</li>
                  <li><strong>Left Arrow:</strong> Go to the previous page.</li>
                  <li><strong>R key:</strong> Mark the current comic as Read/Unread.</li>
                  <li><strong>Escape key:</strong> Close the comic reader.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Knowledge Base Editor</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>N / J key:</strong> Jump to the next search result in the list.</li>
                  <li><strong>P / K key:</strong> Jump to the previous search result in the list.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
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
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>File Operations</CardTitle>
              <CardDescription>Configure how original files are handled after processing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Keep Original Files</Label>
                  <p className="text-sm text-muted-foreground">Enable to copy files, disable to move them.</p>
                </div>
                <Switch checked={settings.keepOriginalFiles} onCheckedChange={(c) => setSettings({ ...settings, keepOriginalFiles: c })} />
              </div>
            </CardContent>
          </Card>
          <div>
            <Button onClick={handleSave}>Save Library Settings</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>What do these settings do?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>
                <strong>Library Path:</strong> This is the main folder where Super Comic Organizer will place your comics after they are processed. They will be sorted into subfolders based on publisher and series.
              </p>
              <p>
                <strong>File Operations:</strong> This setting controls what happens to your original files. If "Keep Original Files" is ON, the app will copy your comics to the library path, leaving the originals untouched. If it's OFF, the app will move the files to the new location.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrapers">
          <div className="relative opacity-50 pointer-events-none">
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg">
                <p className="font-semibold text-foreground">Coming Soon</p>
              </div>
            </div>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;