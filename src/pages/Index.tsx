import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookOpen, FolderPlus, GraduationCap, Library } from "lucide-react";
import { useElectron } from "@/hooks/useElectron"; // Import useElectron

// Key for storing the welcome screen preference in localStorage
const SCO_WELCOME_SCREEN_PREFERENCE = "sco_welcome_screen_preference";

const Index = () => {
  const navigate = useNavigate();
  const { isElectron, electronAPI } = useElectron();
  const [doNotShowWelcome, setDoNotShowWelcome] = useState(false);

  useEffect(() => {
    const checkWelcomePreference = async () => {
      try {
        const storedPreference = localStorage.getItem(SCO_WELCOME_SCREEN_PREFERENCE);
        let currentAppVersion = "unknown";

        if (isElectron && electronAPI) {
          currentAppVersion = await electronAPI.getAppVersion();
        }

        if (storedPreference) {
          const { shown, version: storedVersion, doNotShowWelcome: storedDoNotShowWelcome } = JSON.parse(storedPreference);

          // If it was shown and "don't show again" was checked, and the version hasn't changed, redirect immediately
          if (shown && storedDoNotShowWelcome && currentAppVersion !== "unknown" && currentAppVersion === storedVersion) {
            navigate('/app/dashboard');
            return; // Prevent rendering the welcome screen
          } else if (storedDoNotShowWelcome) {
            // If "don't show again" was checked but version changed, show the screen but pre-check the box
            setDoNotShowWelcome(true);
          }
        }
      } catch (e) {
        console.error("Error checking welcome screen preference:", e);
        // If there's an error, default to showing the screen
      }
    };

    checkWelcomePreference();
  }, [navigate, isElectron, electronAPI]); // Depend on navigate, isElectron, electronAPI

  const handleGetStarted = async () => {
    try {
      let currentAppVersion = "unknown";
      if (isElectron && electronAPI) {
        currentAppVersion = await electronAPI.getAppVersion();
      }

      const preference = {
        shown: true,
        version: currentAppVersion,
        doNotShowWelcome: doNotShowWelcome,
      };
      localStorage.setItem(SCO_WELCOME_SCREEN_PREFERENCE, JSON.stringify(preference));
    } catch (e) {
      console.error("Error saving welcome screen preference:", e);
    }
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Super Comic Organizer</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Automatically organize and catalog your digital comic collection with intelligent metadata detection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/app/organize')}>
            <CardHeader className="text-center">
              <FolderPlus className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Organize</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add and process comic files to organize them into your library.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/app/library')}>
            <CardHeader className="text-center">
              <Library className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Browse and manage your organized comic collection.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/app/learning')}>
            <CardHeader className="text-center">
              <GraduationCap className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manually map unrecognized files to improve organization accuracy.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/app/dashboard')}>
            <CardHeader className="text-center">
              <BookOpen className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your collection statistics and recent activity.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4 mt-8">
          <Button size="lg" onClick={handleGetStarted}>
            Get Started
          </Button>
          <div className="flex items-center justify-center space-x-2">
            <Checkbox
              id="doNotShowWelcome"
              checked={doNotShowWelcome}
              onCheckedChange={(checked) => setDoNotShowWelcome(!!checked)}
            />
            <Label htmlFor="doNotShowWelcome">Don't show this welcome screen again until the next update</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;