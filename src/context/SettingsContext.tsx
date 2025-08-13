import { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { AppSettings } from '@/types';

const defaultSettings: AppSettings = {
  comicVineApiKey: '',
  keepOriginalFiles: true,
  autoScanOnStartup: true,
  folderNameFormat: '{publisher}/{series} ({volume})',
  fileNameFormat: '{series} #{issue} ({year})',
};

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('app-settings', defaultSettings);

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