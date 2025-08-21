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
import { useRecentlyRead } from './hooks/useRecentlyRead';
import { processComicFile } from '@/lib/smartProcessor';
import { useGcdDatabaseService } from '@/services/gcdDatabaseService';
import { useKnowledgeBase } from './KnowledgeBaseContext';

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
  removeComic: (id: string, deleteFile?: boolean) => Promise<void>;
  actions: any[];
  logAction: (type: any, message: string, undo?: any) => void;
  lastUndoableAction: any | null;
  undoLastAction: () => void;
  addMockFiles: () => void;
  triggerSelectFiles: () => void;
  triggerScanFolder: () => void;
  addFilesFromDrop: (droppedFiles: File[]) => void;
  addFilesFromPaths: (paths: string[]) => Promise<void>;
  readingList: any[];
  addToReadingList: (comic: Comic) => void;
  removeFromReadingList: (itemId: string) => void;
  toggleReadingItemCompleted: (itemId: string) => void;
  setReadingItemPriority: (itemId: string, priority: 'low' | 'medium' | 'high') => void;
  setReadingItemRating: (itemId: string, rating: number) => void;
  recentlyRead: any[];
  addToRecentlyRead: (comic: Comic, rating?: number) => void;
  updateRecentRating: (comicId: string, rating: number) => void;
  updateComicRating: (comicId: string, rating: number) => Promise<void>;
  refreshComics: () => Promise<void>;
  importComics: (comicsToImport: Comic[]) => Promise<{ added: number; skipped: number } | null>;
  isScanningMetadata: boolean;
  metadataScanProgress: { processed: number; total: number; updated: number };
  startMetadataScan: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let comicIdCounter = 0;

const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://');
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { actions, logAction, setActions } = useActionLog();
  const { files, setFiles, addFile, addFiles, removeFile, updateFile, addFilesFromPaths } = useFileQueue();
  const { comics, setComics, refreshComics } = useComicLibrary(logAction);
  const { 
    readingList, 
    setReadingList, 
    addToReadingList, 
    removeFromReadingList, 
    toggleReadingItemCompleted, 
    setReadingItemPriority, 
    setReadingItemRating
  } = useReadingList();
  const { 
    recentlyRead, 
    setRecentlyRead, 
    addToRecentlyRead, 
    updateRecentRating
  } = useRecentlyRead();
  
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [metadataScanProgress, setMetadataScanProgress] = useState({ processed: 0, total: 0, updated: 0 });
  const databaseService = useElectronDatabaseService();
  const { isElectron, electronAPI } = useElectron();
  const { settings } = useSettings();
  const gcdDbService = useGcdDatabaseService();
  const { addToKnowledgeBase } = useKnowledgeBase();

  const addComic = useCallback(async (comicData: NewComic, originalFile: QueuedFile) => {
    // Learn from this new comic
    addToKnowledgeBase({
      series: comicData.series,
      publisher: comicData.publisher,
      startYear: comicData.year,
      volumes: [{ volume: comicData.volume, year: comicData.year }]
    });

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
        
        // Try to extract cover with better error handling
        try {
          console.log(`[ADD-COMIC] Attempting to extract cover from: ${originalFile.path}`);
          coverUrl = await electronAPI.extractCover(originalFile.path);
          console.log(`[ADD-COMIC] Cover extracted successfully: ${coverUrl}`);
        } catch (coverError) {
          console.warn(`[ADD-COMIC] Could not extract cover from ${originalFile.name}:`, coverError);
          logAction('warning', `Could not extract cover from ${originalFile.name} - using placeholder`);
          // Continue with placeholder cover instead of failing
        }

        // Try to get file info
        try {
          const fileInfo = await electronAPI.readComicFile(originalFile.path);
          if (fileInfo && fileInfo.size) {
            fileSize = fileInfo.size;
            console.log(`[ADD-COMIC] File size: ${fileSize} bytes`);
          }
        } catch (infoError) {
          console.warn(`[ADD-COMIC] Could not read file info for ${originalFile.name}:`, infoError);
          // Continue with default file size
        }

        const fileExtension = originalFile.name.substring(originalFile.name.lastIndexOf('.'));
        const folderPart = formatPath(settings.folderNameFormat, comicData);
        const filePart = formatPath(settings.fileNameFormat, comicData) + fileExtension;
        const relativeTargetPath = `${folderPart}/${filePart}`.replace(/\\/g, '/');

        console.log(`[ADD-COMIC] Organizing file to: ${relativeTargetPath}`);
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
        
        console.log(`[ADD-COMIC] Saving comic to database:`, comicToSave);
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
        console.error(`[ADD-COMIC] Error organizing ${originalFile.name}:`, error);
        showError(`An error occurred while organizing ${originalFile.name}: ${errorMessage}`);
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
  }, [isElectron, electronAPI, databaseService, settings, logAction, refreshComics, setComics, addToKnowledgeBase]);

  const updateComic = useCallback(async (updatedComic: Comic) => {
    console.log('[APP-CONTEXT] Updating comic:', updatedComic.series, 'with rating:', updatedComic.rating);
    
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
    
    // Learn from manual edits
    addToKnowledgeBase({
      series: updatedComic.series,
      publisher: updatedComic.publisher,
      startYear: updatedComic.year,
      volumes: [{ volume: updatedComic.volume, year: updatedComic.year }]
    });
  }, [databaseService, logAction, refreshComics, setComics, addToKnowledgeBase]);

  const updateComicRating = useCallback(async (comicId: string, rating: number) => {
    console.log('[APP-CONTEXT] updateComicRating called for comic:', comicId, 'rating:', rating);
    
    const comicToUpdate = comics.find(c => c.id === comicId);
    if (!comicToUpdate) {
      console.error('[APP-CONTEXT] Comic not found:', comicId);
      return;
    }

    const updatedComic = { ...comicToUpdate, rating };
    console.log('[APP-CONTEXT] Updating comic with new rating:', updatedComic);
    
    // Update the comic first
    await updateComic(updatedComic);

    // Then manually update reading list and recently read items to avoid circular dependencies
    setReadingList(prev => prev.map(item => 
      item.comicId === comicId ? { ...item, rating } : item
    ));
    
    setRecentlyRead(prev => prev.map(item => 
      item.comicId === comicId ? { ...item, rating } : item
    ));
    
    showSuccess(`Rated "${updatedComic.series} #${updatedComic.issue}"`);
    console.log('[APP-CONTEXT] Rating update complete');
  }, [comics, updateComic, setReadingList, setRecentlyRead]);

  const removeComic = useCallback(async (id: string, deleteFile: boolean = false) => {
    const comicToRemove = comics.find(c => c.id === id);
    if (!comicToRemove) return;

    if (isElectron && electronAPI) {
      try {
        const filePath = deleteFile ? comicToRemove.filePath : undefined;
        await electronAPI.deleteComic(id, filePath);
        await refreshComics();
        const message = deleteFile ? `Permanently deleted '${comicToRemove.series} #${comicToRemove.issue}'` : `Removed '${comicToRemove.series} #${comicToRemove.issue}' from library`;
        logAction('info', message);
        showSuccess(message);
      } catch (error) {
        console.error('Error deleting comic:', error);
        showError("Failed to delete comic.");
      }
    } else {
      // Web mode logic
      setComics(prev => prev.filter(c => c.id !== id));
      logAction('info', `(Web Mode) Removed comic: '${comicToRemove.series} #${comicToRemove.issue}'`);
      showSuccess("Comic removed from library");
    }
  }, [comics, isElectron, electronAPI, logAction, refreshComics, setComics]);

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

  const importComics = useCallback(async (comicsToImport: Comic[]) => {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.importComics(comicsToImport);
        await refreshComics();
        return result;
      } catch (error) {
        console.error("Error importing comics via Electron:", error);
        showError("Failed to import comics.");
        return null;
      }
    } else {
      // Web mode logic
      const currentComicIds = new Set(comics.map(c => c.id));
      const newComicsToAdd = comicsToImport.filter(
        newComic => !currentComicIds.has(newComic.id)
      );
      setComics(prev => [...prev, ...newComicsToAdd]);
      return {
        added: newComicsToAdd.length,
        skipped: comicsToImport.length - newComicsToAdd.length,
      };
    }
  }, [isElectron, electronAPI, comics, setComics, refreshComics]);

  const startMetadataScan = useCallback(async () => {
    setIsScanningMetadata(true);
    setMetadataScanProgress({ processed: 0, total: 0, updated: 0 });

    const candidates = comics.filter(c => !c.ignoreInScans && !c.metadataLastChecked);

    setMetadataScanProgress(prev => ({ ...prev, total: candidates.length }));
    let updatedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const comic = candidates[i];
      
      const tempFile: QueuedFile = {
        id: comic.id,
        name: comic.filePath || `${comic.series} #${comic.issue}`,
        path: comic.filePath || `${comic.series} #${comic.issue}`,
        series: comic.series,
        issue: comic.issue,
        year: comic.year,
        publisher: comic.publisher,
        status: 'Pending',
        confidence: null
      };

      const result = await processComicFile(
        tempFile,
        settings.comicVineApiKey,
        settings.marvelPublicKey,
        settings.marvelPrivateKey,
        gcdDbService
      );

      const updatedComic = { ...comic, metadataLastChecked: new Date().toISOString() };
      let hasNewData = false;

      if (result && result.success && result.data) {
        // Only update fields if they are empty
        if (result.data.summary && !comic.summary) {
          updatedComic.summary = result.data.summary;
          hasNewData = true;
        }
        if (result.data.creators && result.data.creators.length > 0 && (!comic.creators || comic.creators.length === 0)) {
          updatedComic.creators = result.data.creators;
          hasNewData = true;
        }
        if (result.data.publisher && result.data.publisher !== "Unknown Publisher" && comic.publisher === "Unknown Publisher") {
          updatedComic.publisher = result.data.publisher;
          hasNewData = true;
        }
        if (result.data.title && !comic.title) {
            updatedComic.title = result.data.title;
            hasNewData = true;
        }
        if (result.data.publicationDate && !comic.publicationDate) {
            updatedComic.publicationDate = result.data.publicationDate;
            hasNewData = true;
        }
        if (result.data.genre && !comic.genre) {
            updatedComic.genre = result.data.genre;
            hasNewData = true;
        }
        if (result.data.characters && !comic.characters) {
            updatedComic.characters = result.data.characters;
            hasNewData = true;
        }
        if (result.data.price && !comic.price) {
            updatedComic.price = result.data.price;
            hasNewData = true;
        }
        if (result.data.barcode && !comic.barcode) {
            updatedComic.barcode = result.data.barcode;
            hasNewData = true;
        }
        if (result.data.languageCode && !comic.languageCode) {
            updatedComic.languageCode = result.data.languageCode;
            hasNewData = true;
        }
        if (result.data.countryCode && !comic.countryCode) {
            updatedComic.countryCode = result.data.countryCode;
            hasNewData = true;
        }
      }
      
      if (hasNewData) {
        await updateComic(updatedComic);
        updatedCount++;
        logAction('success', `Enriched metadata for '${comic.series} #${comic.issue}'`);
      } else {
        // Still update the last checked date even if no new data was found
        await updateComic(updatedComic);
      }
      
      setMetadataScanProgress(prev => ({ ...prev, processed: i + 1, updated: updatedCount }));
      await new Promise(res => setTimeout(res, 200));
    }

    setIsScanningMetadata(false);
    showSuccess(`Metadata scan complete. Updated ${updatedCount} of ${candidates.length} comics.`);
  }, [comics, settings, updateComic, logAction, gcdDbService]);

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, updateComic, removeComic, updateComicRating,
      actions, logAction, lastUndoableAction, undoLastAction,
      addMockFiles, triggerSelectFiles, triggerScanFolder, addFilesFromDrop,
      addFilesFromPaths,
      readingList, addToReadingList, removeFromReadingList, toggleReadingItemCompleted, setReadingItemPriority, setReadingItemRating,
      recentlyRead, addToRecentlyRead, updateRecentRating,
      refreshComics,
      importComics,
      isScanningMetadata,
      metadataScanProgress,
      startMetadataScan
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