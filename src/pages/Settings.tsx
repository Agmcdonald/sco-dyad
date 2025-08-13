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
import { showSuccess } from "@/utils/toast";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();

  const handleSave = () => {
    // The settings are already updated on change thanks to the context.
    // This button just provides user feedback.
    showSuccess("Settings saved successfully!");
  };

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
              <Button variant="secondary" disabled>Test Connection</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;