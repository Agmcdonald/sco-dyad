"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useElectron } from "@/hooks/useElectron";

// Key for storing the first launch preference in localStorage
const SCO_FIRST_LAUNCH_PREFERENCE = "sco_first_launch_preference";

const FirstLaunchModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const navigate = useNavigate();
  const { isElectron, electronAPI } = useElectron();

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const storedPreference = localStorage.getItem(SCO_FIRST_LAUNCH_PREFERENCE);
        let shouldShow = true;
        let currentAppVersion = "unknown";

        // Get current app version if running in Electron
        if (isElectron && electronAPI) {
          currentAppVersion = await electronAPI.getAppVersion();
        }

        if (storedPreference) {
          const { shown, version: storedVersion, doNotShowAgain: storedDoNotShowAgain } = JSON.parse(storedPreference);

          if (shown && storedDoNotShowAgain) {
            // If "don't show again" was checked, only show if the app version has changed
            if (currentAppVersion !== "unknown" && currentAppVersion === storedVersion) {
              shouldShow = false;
            }
          } else if (shown) {
            // If it was shown but "don't show again" wasn't checked, don't show again for this session
            shouldShow = false;
          }
        }

        if (shouldShow) {
          // Show after a short delay to allow UI to render
          setTimeout(() => setOpen(true), 200);
        }
      } catch (e) {
        console.error("Error checking first launch preference:", e);
        // If there's an error, default to showing the modal
        setTimeout(() => setOpen(true), 200);
      }
    };

    checkFirstLaunch();
  }, [isElectron, electronAPI]);

  // Function to save the user's preference and close the modal
  const savePreference = async (shouldNavigate: boolean) => {
    try {
      let currentAppVersion = "unknown";
      if (isElectron && electronAPI) {
        currentAppVersion = await electronAPI.getAppVersion();
      }

      const preference = {
        shown: true,
        version: currentAppVersion,
        doNotShowAgain: doNotShowAgain,
      };
      localStorage.setItem(SCO_FIRST_LAUNCH_PREFERENCE, JSON.stringify(preference));
    } catch (e) {
      console.error("Error saving first launch preference:", e);
    }
    setOpen(false); // Close the modal
    if (shouldNavigate) {
      navigate("/app/settings", { state: { targetTab: "library" } });
    }
  };

  const handleGoToSettings = () => savePreference(true);
  const handleSkip = () => savePreference(false);

  return (
    // Removed onOpenChange to make the dialog persistent until a button is clicked
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Welcome to Super Comic Organizer</DialogTitle>
          <DialogDescription>
            We'll help you get started. The Help menu has a full manual, but first let's configure where you'd like your organized comics stored and how you want files handled.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            You can change these later in Settings. If you'd like to skip the setup now, you can always open Settings from the File menu.
          </p>
          {/* Checkbox for "Don't show again" */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="doNotShowAgain"
              checked={doNotShowAgain}
              onCheckedChange={(checked) => setDoNotShowAgain(!!checked)}
            />
            <Label htmlFor="doNotShowAgain">Don't show this screen until the next update</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleGoToSettings}>Open Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstLaunchModal;