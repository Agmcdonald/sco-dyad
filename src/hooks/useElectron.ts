import { useEffect, useState } from 'react';
import { Comic, ComicKnowledge, CreatorKnowledge } from '@/types';

// Type definitions for our Electron API
interface ElectronAPI {
  getAppVersion(): Promise<string>;
  onNavigateTo(callback: (path: string) => void): void;
  onFilesSelected(callback: (filePaths: string[]) => void): void;
  onFolderSelected(callback: (folderPath: string) => void): void;
  readComicFile(filePath: string, signal?: AbortSignal): Promise<any>; // Added signal
  extractCover(filePath: string): Promise<string>;
  scanFolder(folderPath: string, signal?: AbortSignal): Promise<string[]>; // Added signal
  organizeFile(filePath: string, targetPath: string): Promise<{ success: boolean; newPath?: string; error?: string; }>;
  moveFile(sourcePath: string, relativeTargetPath: string): Promise<boolean>;
  
  // Comic Reader Operations
  getComicPages(filePath: string): Promise<string[]>;
  getComicPageDataUrl(filePath: string, pageName: string): Promise<string>;
  prepareCbrForReading(filePath: string): Promise<{ tempDir: string; pages: string[] }>;
  getPageDataUrlFromTemp(tempDir: string, pageName: string): Promise<string>;
  cleanupTempDir(tempDir: string): Promise<void>;
  openPdf(filePath: string): Promise<{ success: boolean; error?: string }>;

  // Database Operations
  initDatabase(): Promise<void>;
  saveComic(comic: any): Promise<any>;
  getComics(): Promise<any[]>;
  updateComic(comic: any): Promise<any>;
  batchUpdateComics(updates: (Partial<Comic> & { id: string })[]): Promise<number>;
  deleteComic(comicId: string, filePath?: string): Promise<boolean>;
  
  // Settings
  getSettings(): Promise<any>;
  saveSettings(settings: any): Promise<void>;

  // Knowledge Base
  getKnowledgeBase(): Promise<{ series: ComicKnowledge[], creators: CreatorKnowledge[] }>;
  saveKnowledgeBase(data: { series: ComicKnowledge[], creators: CreatorKnowledge[] }): Promise<void>;

  // Comic Vine API Proxy
  fetchComicVine(url: string, options?: RequestInit): Promise<{ success: boolean; data?: any; error?: string; status?: number }>;

  // Backup and Restore
  saveBackup(data: string): Promise<{ success: boolean; path?: string; error?: string; }>;
  loadBackup(): Promise<{ success: boolean; data?: string; error?: string; }>;

  // General Dialogs
  showMessageBox(options: any): Promise<any>;
  
  // Help Manual
  onOpenManual(callback: () => void): void;

  // Platform Information
  platform: string;
  
  // Event Listener Management
  removeAllListeners(channel: string): void;

  // New cancellation method
  cancelFileLoading(): Promise<void>;

  // Cover Management
  getCoversDir(): Promise<string>;
  migrateCovers(): Promise<any>;
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