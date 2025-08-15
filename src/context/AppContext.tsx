import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { QueuedFile, Comic, NewComic, UndoPayload } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { useElectron } from '@/hooks/useElectron';
import { useSettings } from '@/context/SettingsContext';
import { formatPath } from '@/lib/formatter';
import { showSuccess, showError } from '@/utils/toast';
import { useActionLog } from './hooks/useActionLog';
import { useFileQueue } from './hooks/useFileQueue';
import { useComicLibrary } from './hooks/useComicLibrary';
import { useReadingList } from './hooks/useReadingList';

interface AppContextType {
  files: QueuedFile[];
  addFile: (file: QueuedFile) => void;
  addFiles: (files: QueuedFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (file: QueuedFile) => void;
  skipFile: (file: QueuedFile) => void;
  comics: Comic[];
  addComic: (comicData: NewComic, originalFile: QueuedFile) => Promise<void>;
  updateComic: (comic: Comic) => Promise<void>;
  removeComic: (id: string) => Promise<void>;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  actions: any[];
  logAction: (type: any, message: string, undo?: any) => void;
  lastUndoableAction: any | null;
  undoLastAction: () => void;
  addMockFiles: () => void;
  triggerSelectFiles: () => void;
  triggerScanFolder: () => void;
  addFilesFromDrop: (droppedFiles: File[]) => void;
  readingList: any[];
  addToReadingList: (comic: Comic) => void;
  removeFromReadingList: (itemId: string) => void;
  toggleReadingItemCompleted: (itemId: string) => void;
  setReadingItemPriority: (itemId: string, priority: 'low' | 'medium' | 'high') => void;
  refreshComics: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let comicIdCounter = 0;

const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://') || 
         filePath.includes('(Digital)') || 
         filePath.includes('(Webrip)') || 
         filePath.includes('Kileko-Empire') ||
         filePath.includes('The Last Kryptonian-DCP');
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { actions, logAction, setActions } = useActionLog();
  const { files, setFiles, addFile, addFiles, removeFile, updateFile, addFilesFromPaths } = useFileQueue();
  const { comics, setComics, refreshComics } = useComicLibrary(logAction);
  const { readingList, addToReadingList, removeFromReadingList, toggleReadingItemCompleted, setReadingItemPriority } = useReadingList();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const databaseService = useElectronDatabaseService();
  const { isElectron, electronAPI } = useElectron();
  const { settings } = useSettings();

  const addComic = useCallback(async (comicData: NewComic, originalFile: QueuedFile) => {
    if (isMockFile(originalFile.path)) {
      const newComic: Comic = {
        ...comicData,
        id: `comic-${comicIdCounter++}`,
        coverUrl: '/placeholder.svg',
        dateAdded: new Date(),
      };
      setComics(prev => [newComic, ...prev]);
      logAction('success', `(Demo Mode) Added '${newComic.series} #${newComic.issue}' to library`, {
        type: 'ADD_COMIC',
        payload: { comicId: newComic.id, originalFile }
      });
      showSuccess(`Added '${newComic.series} #${newComic.issue}' to library`);
      return;
    }

    if (isElectron && electronAPI && databaseService) {
      try {
        let coverUrl = '/placeholder.svg';
        let fileSize = 25000000;
        
        try {
          coverUrl = await electronAPI.extractCover(originalFile.path);
        } catch (coverError) {
          console.warn('[ADD-COMIC] Could not extract cover:', coverError);
        }

        try {
          const fileInfo = await electronAPI.readComicFile(originalFile.path);
          if (fileInfo && fileInfo.size) fileSize = fileInfo.size;
        } catch (infoError) {
          console.warn('[ADD-COMIC] Could not read file info:', infoError);
        }

        const fileExtension = originalFile.name.substring(originalFile.name.lastIndexOf('.'));
        const folderPart = formatPath(settings.folderNameFormat, comicData);
        const filePart = formatPath(settings.fileNameFormat, comicData) + fileExtension;
        const relativeTargetPath = `${folderPart}/${filePart}`.replace(/\\/g, '/');

        const organizeResult = await electronAPI.organizeFile(originalFile.path, relativeTargetPath);

        if (!organizeResult || typeof organizeResult === 'boolean' || !organizeResult.success) {
          showError(`Failed to move file: ${originalFile.name}`);
          logAction('error', `Failed to organize file: ${originalFile.name}`);
          return;
        }

        const comicToSave = { 
          ...comicData, 
          filePath: organizeResult.newPath || originalFile.path, 
          fileSize 
        };
        const savedComic = await databaseService.saveComic(comicToSave);
        const finalComic = { ...savedComic, coverUrl };

        await databaseService.updateComic(finalComic);
        await refreshComics();
        
        logAction('success', `Organized '${originalFile.name}' as '${finalComic.series} #${finalComic.issue}'`, {
          type: 'ADD_COMIC',
          payload: { comicId: finalComic.id, originalFile }
        });
        showSuccess(`Added '${finalComic.series} #${finalComic.issue}' to library`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showError(`An error occurred while organizing ${originalFile.name}`);
        logAction('error', `Error organizing ${originalFile.name}: ${errorMessage}`);
      }
    } else {
      const newComic: Comic = { ...comicData, id: `comic-${comicIdCounter++}`, coverUrl: '/placeholder.svg', dateAdded: new Date() };
      setComics(prev => [newComic, ...prev]);
      logAction('success', `(Web Mode) Added '${newComic.series} #${newComic.issue}' to library`, {
        type: 'ADD_COMIC',
        payload: { comicId: newComic.id, originalFile }
      });
      showSuccess(`Added '${newComic.series} #${newComic.issue}' to library`);
    }
  }, [isElectron, electronAPI, databaseService, settings, logAction, refreshComics, setComics]);

  const updateComic = useCallback(async (updatedComic: Comic) => {
    if (databaseService) {
      try {
        await databaseService.updateComic({
          ...updatedComic,
          filePath: updatedComic.filePath || '',
          fileSize: 0,
          dateAdded: updatedComic.dateAdded.toISOString(),
          lastModified: new Date().toISOString()
        });
        await refreshComics();
      } catch (error) {
        console.error('Error updating comic in database:', error);
      }
    }
    setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
    logAction('info', `Updated metadata for '${updatedComic.series} #${updatedComic.issue}'`);
  }, [databaseService, logAction, refreshComics, setComics]);

  const removeComic = useCallback(async (id: string) => {
    const comicToRemove = comics.find(c => c.id === id);
    if (comicToRemove) {
      if (databaseService) {
        try {
          await databaseService.deleteComic(id);
          await refreshComics();
        } catch (error) {
          console.error('Error deleting comic from database:', error);
        }
      }
      logAction('info', `Removed comic: '${comicToRemove.series} #${comicToRemove.issue}'`);
      showSuccess("Comic removed from library");
    }
  }, [comics, databaseService, logAction, refreshComics]);

  const skipFile = useCallback((file: QueuedFile) => {
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { skippedFile: file }
    });
  }, [removeFile, logAction]);

  const lastUndoableAction = actions.find(a => !!a.undo) || null;

  const undoLastAction = useCallback(() => {
    if (!lastUndoableAction || !lastUndoableAction.undo) return;
    const { type, payload } = lastUndoableAction.undo;
    if (type === 'ADD_COMIC') {
      removeComic(payload.comicId);
      addFile(payload.originalFile);
    } else if (type === 'SKIP_FILE') {
      addFile(payload.skippedFile);
    }
    logAction('info', `Undo: ${lastUndoableAction.message}`);
    setActions(prev => prev.map(a => a.id === lastUndoableAction.id ? { ...a, undo: undefined } : a));
  }, [lastUndoableAction, removeComic, addFile, logAction, setActions]);

  const addMockFiles = useCallback(() => {
    const newMockFiles: QueuedFile[] = [
      { id: `file-${Date.now()}-1`, name: "Saga #2 (2012).cbr", path: "mock://saga-2-2012.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${Date.now()}-2`, name: "Batman The Knight #1 (2022).cbr", path: "mock://batman-knight-1-2022.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
    ];
    addFiles(newMockFiles);
    logAction('info', `Added ${newMockFiles.length} demo files for testing.`);
  }, [addFiles, logAction]);

  const triggerSelectFiles = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      return;
    }
    try {
      const filePaths = await electronAPI.selectFilesDialog();
      if (filePaths && filePaths.length > 0) {
        await addFilesFromPaths(filePaths);
      }
    } catch (error) {
      showError("Could not select files.");
    }
  }, [isElectron, electronAPI, addFilesFromPaths]);

  const triggerScanFolder = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      return;
    }
    try {
      const folderPaths = await electronAPI.selectFolderDialog();
      if (folderPaths && folderPaths.length > 0) {
        const filePaths = await electronAPI.scanFolder(folderPaths[0]);
        await addFilesFromPaths(filePaths.map((f: any) => f.path || f));
      }
    } catch (error) {
      showError("Could not scan folder.");
    }
  }, [isElectron, electronAPI, addFilesFromPaths]);

  const addFilesFromDrop = useCallback(async (droppedFiles: File[]) => {
    // This function is now only for web-mode (demo)
    const comicExtensions = ['.cbr', '.cbz', '.pdf'];
    const comicFiles = droppedFiles.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ, PDF");
      return;
    }

    const mockFiles = comicFiles.map((file, index) => ({
      id: `web-drop-${Date.now()}-${index}`,
      name: file.name,
      path: `mock://web-drop/${file.name}`,
      series: null,
      issue: null,
      year: null,
      publisher: null,
      confidence: null as any,
      status: 'Pending' as any
    }));
    addFiles(mockFiles);
    showSuccess(`Added ${mockFiles.length} files (web demo mode)`);
  }, [addFiles]);

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, updateComic, removeComic,
      isProcessing, startProcessing: () => setIsProcessing(true), pauseProcessing: () => setIsProcessing(false),
      actions, logAction, lastUndoableAction, undoLastAction,
      addMockFiles, triggerSelectFiles, triggerScanFolder, addFilesFromDrop,
      readingList, addToReadingList, removeFromReadingList, toggleReadingItemCompleted, setReadingItemPriority,
      refreshComics
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};