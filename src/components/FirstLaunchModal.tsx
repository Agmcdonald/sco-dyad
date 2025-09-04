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

interface FirstLaunchModalProps {
  isOpen: boolean;
  onClose: (shouldNavigateToSettings: boolean) => void;
}

const FirstLaunchModal: React.FC<FirstLaunchModalProps> = ({ isOpen, onClose }) => {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const navigate = useNavigate();
  const { isElectron, electronAPI } = useElectron();

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
    onClose(shouldNavigate); // Close the modal and pass navigation intent
  };

  const handleGoToSettings = () => savePreference(true);
  const handleSkip = () => savePreference(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If dialog is being closed by user clicking outside or pressing escape, treat as skip
      if (!open) {
        savePreference(false);
      }
    }}>
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