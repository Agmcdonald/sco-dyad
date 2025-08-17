import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useElectron } from '@/hooks/useElectron';
import { AppSettings } from '@/types';

const defaultSettings: AppSettings = {
  comicVineApiKey: '',
  marvelPublicKey: '',
  marvelPrivateKey: '',
  keepOriginalFiles: true,
  autoScanOnStartup: true,
  folderNameFormat: '{publisher}/{series} ({volume})',
  fileNameFormat: '{series} #{issue} ({year})',
  libraryPath: '',
};

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const { isElectron, electronAPI } = useElectron();

  // Load settings from Electron or localStorage
  useEffect(() => {
    const loadSettings = async () => {
      if (isElectron && electronAPI) {
        try {
          const electronSettings = await electronAPI.getSettings();
          setSettingsState({ ...defaultSettings, ...electronSettings });
        } catch (error) {
          console.error('Failed to load settings from Electron:', error);
          // Fall back to localStorage
          const stored = localStorage.getItem('app-settings');
          if (stored) {
            try {
              const parsedSettings = JSON.parse(stored);
              setSettingsState({ ...defaultSettings, ...parsedSettings });
            } catch (e) {
              console.error('Failed to parse stored settings:', e);
            }
          }
        }
      } else {
        // Web mode - use localStorage
        const stored = localStorage.getItem('app-settings');
        if (stored) {
          try {
            const parsedSettings = JSON.parse(stored);
            setSettingsState({ ...defaultSettings, ...parsedSettings });
          } catch (e) {
            console.error('Failed to parse stored settings:', e);
          }
        }
      }
    };

    loadSettings();
  }, [isElectron, electronAPI]);

  const setSettings = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
    
    // Save to localStorage for web mode
    if (!isElectron) {
      localStorage.setItem('app-settings', JSON.stringify(newSettings));
    }
    // Electron saving is handled in the Settings component
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};