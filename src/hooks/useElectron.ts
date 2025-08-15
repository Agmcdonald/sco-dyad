import { useEffect, useState } from 'react';
import { ComicKnowledge } from '@/types';

// Type definitions for our Electron API
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  onNavigateTo: (callback: (path: string) => void) => void;
  onFilesSelected: (callback: (string[]) => void) => void;
  onFolderSelected: (callback: (folderPath: string) => void) => void;
  readComicFile: (filePath: string) => Promise<any>;
  extractCover: (filePath: string) => Promise<string>;
  scanFolder: (folderPath: string) => Promise<string[]>;
  organizeFile: (filePath: string, targetPath: string) => Promise<{ success: boolean; newPath?: string; error?: string; }>;
  getComicPages: (filePath: string) => Promise<string[]>;
  getComicPageDataUrl: (filePath: string, pageName: string) => Promise<string>;
  initDatabase: () => Promise<void>;
  saveComic: (comic: any) => Promise<any>;
  getComics: () => Promise<any[]>;
  updateComic: (comic: any) => Promise<any>;
  deleteComic: (comicId: string) => Promise<boolean>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  showMessageBox: (options: any) => Promise<any>;
  platform: string;
  removeAllListeners: (channel: string) => void;
  selectFilesDialog: () => Promise<string[]>;
  selectFolderDialog: () => Promise<string[]>;
  getKnowledgeBase: () => Promise<ComicKnowledge[]>;
  saveKnowledgeBase: (data: ComicKnowledge[]) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [electronAPI, setElectronAPI] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    // Check if we're running in Electron
    if (window.electronAPI) {
      setIsElectron(true);
      setElectronAPI(window.electronAPI);
    }
  }, []);

  return {
    isElectron,
    electronAPI
  };
};

// Hook for handling file selection from menu
export const useElectronFileHandlers = () => {
  const { electronAPI } = useElectron();

  useEffect(() => {
    if (!electronAPI) return;

    const handleFilesSelected = (filePaths: string[]) => {
      console.log('Files selected:', filePaths);
      // TODO: Process selected files
    };

    const handleFolderSelected = (folderPath: string) => {
      console.log('Folder selected:', folderPath);
      // TODO: Scan folder for comic files
    };

    electronAPI.onFilesSelected(handleFilesSelected);
    electronAPI.onFolderSelected(handleFolderSelected);

    return () => {
      electronAPI.removeAllListeners('files-selected');
      electronAPI.removeAllListeners('folder-selected');
    };
  }, [electronAPI]);
};

// Hook for handling navigation from menu
export const useElectronNavigation = () => {
  const { electronAPI } = useElectron();

  useEffect(() => {
    if (!electronAPI) return;

    const handleNavigateTo = (path: string) => {
      // This will be handled by React Router
      window.location.hash = path;
    };

    electronAPI.onNavigateTo(handleNavigateTo);

    return () => {
      electronAPI.removeAllListeners('navigate-to');
    };
  }, [electronAPI]);
};