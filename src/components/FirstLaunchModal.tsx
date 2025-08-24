Library and sets a first-run flag in localStorage">
"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FIRST_LAUNCH_KEY = "sco_first_launch_shown";

const FirstLaunchModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const shown = localStorage.getItem(FIRST_LAUNCH_KEY);
      if (!shown) {
        // show after a short delay so UI is ready
        setTimeout(() => setOpen(true), 200);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleGoToSettings = () => {
    try {
      localStorage.setItem(FIRST_LAUNCH_KEY, "1");
    } catch {}
    setOpen(false);
    // Navigate to Settings and open the Library tab
    navigate("/app/settings", { state: { targetTab: "library" } });
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(FIRST_LAUNCH_KEY, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => setOpen(false)}>
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