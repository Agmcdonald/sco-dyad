import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { useElectron } from '@/hooks/useElectron';

interface FirstLaunchModalProps {
  isOpen?: boolean; // Made optional
  onClose: () => void;
}

const FirstLaunchModal: React.FC<FirstLaunchModalProps> = ({ isOpen = false, onClose }) => {
  const navigate = useNavigate();
  const { settings, setSettings } = useSettings();
  const { isElectron, electronAPI } = useElectron();

  const handleDismiss = async () => {
    const updatedSettings = { ...settings, hasLaunchedBefore: true };
    setSettings(updatedSettings);
    if (isElectron && electronAPI) {
      await electronAPI.saveSettings(updatedSettings);
    }
    onClose();
  };

  const handleOpenSettings = async () => {
    await handleDismiss();
    navigate('/settings');
  };

  const handleSkip = async () => {
    await handleDismiss();
  };

  // Only show if it's the first launch
  if (settings.hasLaunchedBefore) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Super Comic Organizer</DialogTitle>
          <DialogDescription>
            We'll help you get started. The Help menu has a full manual, but first let's configure
            where you'd like your organized comics stored and how you want files handled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            You can change these later in Settings. If you'd like to skip the setup now, you can
            always open Settings from the File menu.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleOpenSettings}>Open Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstLaunchModal;