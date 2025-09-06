import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { QueuedFile, Comic, NewComic, UndoPayload, ComicKnowledge } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { useElectron } from '@/hooks/useElectron';
import { useSettings } from '@/context/SettingsContext';
import { formatPath } from '@/lib/formatter';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useActionLog } from './hooks/useActionLog';
import { useFileQueue } from './hooks/useFileQueue';
import { useComicLibrary } from './hooks/useComicLibrary';
import { useReadingList } from './hooks/useReadingList';
import { useRecentlyRead } from './hooks/useRecentlyRead';
import { processComicFile } from '@/lib/smartProcessor';
import { useKnowledgeBase } from './KnowledgeBaseContext';
import { parseFilename } from '@/lib/parser';

interface FileLoadStatus {
  isLoading: boolean;
  progress: number;
  total: number;
  currentFile: string;
}

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
  triggerQuickAddFiles: () => void;
  addFilesFromDrop: (droppedFiles: File[]) => void;
  addFilesFromPaths: (paths: string[]) => Promise<void>;
  quickAddFiles: (files: QueuedFile[]) => Promise<void>;
  fileLoadStatus: FileLoadStatus;
  readingList: any[];
  addToReadingList: (comic: Comic) => void;
  removeFromReadingList: (itemId: string) => void;
  toggleReadingItemCompleted: (itemId: string) => void;
  toggleComicReadStatus: (comic: Comic) => void;
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
  scanComicForMetadata: (comicId: string) => Promise<void>; // New: Scan single comic
  scanSelectedComicsForMetadata: (comicIds: string[]) => Promise<void>; // New: Scan multiple comics
  updateComicProgress: (comicId: string, lastReadPage: number, totalPages: number) => Promise<void>;
  updateReadingHistory: (comic: Comic, currentPage: number, totalPages: number) => void;
  readingComic: Comic | null;
  setReadingComic: (comic: Comic | null) => void;
  openComicForReading: (comic: Comic) => void;
  syncKnowledgeBaseToLibrary: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let comicIdCounter = 0;
let fileIdCounter = 0;

const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://');
};

const normalize = (s: string | undefined | null) => (s || "").trim().toLowerCase();

// Helper to determine if a comic has missing metadata that could be enriched
const hasMissingMetadata = (comic: Comic): boolean => {
  return !comic.summary || 
         !comic.creators || comic.creators.length === 0 ||
         !comic.genre ||
         !comic.characters ||
         !comic.publicationDate ||
         !comic.price ||
         !comic.barcode ||
         !comic.languageCode ||
         !comic.countryCode ||
         comic.publisher === "Unknown Publisher"; // Consider unknown publisher as missing
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { actions, logAction, setActions } = useActionLog();
  const { files, setFiles, addFile, addFiles, removeFile, updateFile } = useFileQueue();
  const { comics, setComics, refreshComics } = useComicLibrary(logAction);
  const { 
    readingList, 
    setReadingList, 
    addToReadingList, 
    removeFromReadingList, 
    toggleReadingItemCompleted, 
    setReadingItemPriority, 
    setReadingItemRating,
    toggleComicReadStatus
  } = useReadingList();
  const { 
    recentlyRead, 
    setRecentlyRead, 
    addToRecentlyRead, 
    updateRecentRating
  } = useRecentlyRead();
  
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [metadataScanProgress, setMetadataScanProgress] = useState({ processed: 0, total: 0, updated: 0 });
  const [fileLoadStatus, setFileLoadStatus] = useState<FileLoadStatus>({
    isLoading: false,
    progress: 0,
    total: 0,
    currentFile: "",
  });
  const [readingComic, setReadingComic] = useState<Comic | null>(null);
  const databaseService = useElectronDatabaseService();
  const { isElectron, electronAPI } = useElectron();
  const { settings } = useSettings();
  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();

  // Derive lastUndoableAction from the actions array
  const lastUndoableAction = useMemo(() => {
    // Find the most recent action that has an undo payload
    return actions.find(action => action.undo) || null;
  }, [actions]);

  const addFilesFromPaths = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    setFileLoadStatus({ isLoading: true, progress: 0, total: paths.length, currentFile: "" });
    
    const filesToAdd: QueuedFile[] = [];
    for (let i = 0; i < paths.length; i++) {
      const filePath = paths[i];
      const fileName = filePath ? filePath.split(/[\\/]/).pop() || 'Unknown File' : 'Unknown File';
      
      setFileLoadStatus(prev => ({ ...prev, progress: i + 1, currentFile: fileName }));

      const parsed = parseFilename(filePath);

      const newFile: QueuedFile = {
        id: `file-${fileIdCounter++}`,
        name: fileName,
        path: filePath || '',
        series: parsed.series,
        issue: parsed.issue,
        year: parsed.year,
        publisher: parsed.publisher,
        volume: parsed.volume,
        ofTotal: parsed.ofTotal, // Populate ofTotal from parser
        confidence: null,
        status: 'Pending',
      };

      if (isElectron && electronAPI && filePath) {
        try {
          const fileInfo = await electronAPI.readComicFile(filePath);
          newFile.pageCount = fileInfo?.pageCount || undefined;
        } catch (error) {
          console.warn(`Could not read info for ${newFile.name}:`, error);
        }
      }
      filesToAdd.push(newFile);
      await new Promise(res => setTimeout(res, 5));
    }

    addFiles(filesToAdd);
    showSuccess(`Added ${filesToAdd.length} comic file${filesToAdd.length !== 1 ? 's' : ''} to queue`);
    setFileLoadStatus({ isLoading: false, progress: 0, total: 0, currentFile: "" });
  }, [addFiles, isElectron, electronAPI]);

  const updateComic = useCallback(async (comic: Comic) => {
    if (databaseService) {
      try {
        await databaseService.updateComic({
          ...comic,
          filePath: comic.filePath || '',
          fileSize: 0, // Placeholder, actual size not always available here
          dateAdded: comic.dateAdded.toISOString(),
          lastModified: new Date().toISOString()
        });
        await refreshComics(); // Refresh the list after update
        logAction('success', `Updated '${comic.series} #${comic.issue}'`);
      } catch (error) {
        console.error('Error updating comic in database:', error);
        showError(`Failed to update comic: ${comic.series} #${comic.issue}`);
        logAction('error', `Failed to update comic: ${comic.series} #${comic.issue}`);
      }
    } else {
      // Web mode: update in local state
      setComics(prev => prev.map(c => c.id === comic.id ? comic : c));
      logAction('success', `(Web Mode) Updated '${comic.series} #${comic.issue}'`);
    }
  }, [databaseService, refreshComics, logAction, setComics]);

  const addComic = useCallback(async (comicData: NewComic, originalFile: QueuedFile) => {
    addToKnowledgeBase({
      series: comicData.series,
      publisher: comicData.publisher,
      startYear: comicData.year,
      volumes: [{ volume: comicData.volume, year: comicData.year }]
    });

    const baseSummary = comicData.summary || '';
    const finalSummary = originalFile.ofTotal ? `${baseSummary} (of ${originalFile.ofTotal})` : baseSummary;

    if (isMockFile(originalFile.path)) {
      const newComic: Comic = {
        ...comicData,
        id: `comic-${comicIdCounter++}`, // Use existing counter for mock files
        coverUrl: '/placeholder.svg',
        dateAdded: new Date(),
        summary: finalSummary, // Use the final summary
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
          console.log(`[ADD-COMIC] Attempting to extract cover from: ${originalFile.path}`);
          coverUrl = await electronAPI.extractCover(originalFile.path);
          console.log(`[ADD-COMIC] Cover extracted successfully: ${coverUrl}`);
        } catch (coverError) {
          console.warn(`[ADD-COMIC] Could not extract cover from ${originalFile.name}:`, coverError);
          logAction('warning', `Could not extract cover from ${originalFile.name} - using placeholder`);
        }

        try {
          const fileInfo = await electronAPI.readComicFile(originalFile.path);
          if (fileInfo && fileInfo.size) {
            fileSize = fileInfo.size;
            console.log(`[ADD-COMIC] File size: ${fileSize} bytes`);
          }
        } catch (infoError) {
          console.warn(`[ADD-COMIC] Could not read file info for ${originalFile.name}:`, infoError);
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

        const comicToSave: NewComic = { 
          ...comicData, 
          id: crypto.randomUUID(), // Generate a unique ID for the comic
          title: comicData.title || null, // Ensure title is null if undefined
          filePath: organizeResult.newPath || originalFile.path, 
          fileSize,
          coverUrl,
          summary: finalSummary // Use the final summary
        };
        
        console.log(`[ADD-COMIC] Saving comic to database:`, comicToSave);
        const savedComic = await databaseService.saveComic(comicToSave);
        
        await refreshComics();
        
        logAction('success', `Organized '${originalFile.name}' as '${savedComic.series} #${savedComic.issue}'`, {
          type: 'ADD_COMIC',
          payload: { comicId: savedComic.id, originalFile }
        });
        showSuccess(`Added '${savedComic.series} #${savedComic.issue}' to library`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ADD-COMIC] Error organizing ${originalFile.name}:`, error);
        showError(`An error occurred while organizing ${originalFile.name}: ${errorMessage}`);
        logAction('error', `Error organizing ${originalFile.name}: ${errorMessage}`);
      }
    } else {
      const newComic: Comic = { ...comicData, id: `comic-${comicIdCounter++}`, coverUrl: '/placeholder.svg', dateAdded: new Date(), summary: finalSummary }; // Use the final summary
      setComics(prev => [...prev, newComic]); // Fixed: use newComic directly
      logAction('success', `(Web Mode) Added '${newComic.series} #${newComic.issue}' to library`, {
        type: 'ADD_COMIC',
        payload: { comicId: newComic.id, originalFile }
      });
      showSuccess(`Added '${newComic.series} #${newComic.issue}' to library`);
    }
  }, [isElectron, electronAPI, databaseService, settings, logAction, refreshComics, setComics, addToKnowledgeBase]);

  const quickAddFiles = useCallback(async (filesToQuickAdd: QueuedFile[]) => {
    let addedCount = 0;
    let failedCount = 0;

    const loadingToast = showLoading(`Quick adding ${filesToQuickAdd.length} files...`);

    try {
      for (const file of filesToQuickAdd) {
        const name = file.name;
        
        const parsed = parseFilename(file.path);

        if (!parsed.series || !parsed.issue) {
          showError(`Could not quick add "${name}": Missing series or issue number.`);
          failedCount++;
          continue;
        }

        const tempFile: QueuedFile = {
          id: `quick-add-${Date.now()}-${Math.random()}`,
          name,
          path: file.path,
          series: parsed.series,
          issue: parsed.issue,
          year: parsed.year,
          publisher: parsed.publisher,
          volume: parsed.volume,
          ofTotal: parsed.ofTotal,
          confidence: null,
          status: 'Pending'
        };

        const processedResult = await processComicFile(
          tempFile,
          settings.comicVineApiKey,
          knowledgeBase
        );

        if (!processedResult.success || !processedResult.data) {
          showError(`Could not quick add "${name}": ${processedResult.error || "Failed to process metadata."}`);
          failedCount++;
          continue;
        }

        const comicData: NewComic = {
          id: crypto.randomUUID(),
          series: processedResult.data.series,
          issue: processedResult.data.issue,
          year: processedResult.data.year,
          publisher: processedResult.data.publisher,
          volume: processedResult.data.volume,
          summary: processedResult.data.summary,
          title: processedResult.data.title,
          publicationDate: processedResult.data.publicationDate,
          genre: processedResult.data.genre,
          characters: processedResult.data.characters,
          price: processedResult.data.price,
          barcode: processedResult.data.barcode,
          languageCode: processedResult.data.languageCode,
          countryCode: processedResult.data.countryCode,
          creators: processedResult.data.creators,
        };

        await addComic(comicData, tempFile);
        removeFile(file.id);
        addedCount++;
      }

      dismissToast(loadingToast);
      if (addedCount > 0) {
        showSuccess(`Quick added ${addedCount} comic(s) to the library.`);
      }
      if (failedCount > 0) {
        showError(`${failedCount} file(s) could not be added.`);
      }

    } catch (error) {
      dismissToast(loadingToast);
      showError("An error occurred during Quick Add.");
      console.error("Quick Add error:", error);
    }
  }, [isElectron, electronAPI, addComic, settings, knowledgeBase, removeFile]);

  const addFilesFromDrop = useCallback(async (droppedFiles: File[]) => {
    const comicExtensions = ['.cbr', '.cbz'];
    const comicFiles = droppedFiles.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return comicExtensions.includes(ext);
    });

    if (comicFiles.length === 0) {
      showError("No comic files found. Supported formats: CBR, CBZ");
      return;
    }

    const mockFiles = comicFiles.map((file, index) => {
      const parsed = parseFilename(file.name); // Parse dropped file name
      return {
        id: `web-drop-${Date.now()}-${index}`,
        name: file.name,
        path: `mock://web-drop/${file.name}`,
        series: parsed.series,
        issue: parsed.issue,
        year: parsed.year,
        publisher: parsed.publisher,
        volume: parsed.volume,
        ofTotal: parsed.ofTotal, // Add ofTotal
        confidence: null as any,
        status: 'Pending' as any
      };
    });
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

  const performMetadataScan = useCallback(async (comic: Comic, updateComicFunc: (comic: Comic) => Promise<void>) => {
    if (!comic.filePath) {
      logAction('warning', `Cannot scan '${comic.series} #${comic.issue}': No file path available.`);
      return null;
    }

    const tempFile: QueuedFile = {
      id: comic.id,
      name: comic.filePath || `${comic.series} #${comic.issue}`,
      path: comic.filePath,
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      status: 'Pending',
      confidence: null,
    };

    const result = await processComicFile(
      tempFile,
      settings.comicVineApiKey,
      knowledgeBase
    );

    const updatedComic = { ...comic, metadataLastChecked: new Date().toISOString() };
    let hasNewData = false;

    if (result && result.success && result.data) {
      // Only update if the new data is better or fills a gap
      if (result.data.summary && !comic.summary) { updatedComic.summary = result.data.summary; hasNewData = true; }
      if (result.data.creators && result.data.creators.length > 0 && (!comic.creators || comic.creators.length === 0)) { updatedComic.creators = result.data.creators; hasNewData = true; }
      if (result.data.publisher && result.data.publisher !== "Unknown Publisher" && comic.publisher === "Unknown Publisher") { updatedComic.publisher = result.data.publisher; hasNewData = true; }
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
      await updateComicFunc(updatedComic);
      logAction('success', `Enriched metadata for '${comic.series} #${comic.issue}'`);
      return true; // Indicate that an update occurred
    } else {
      // Even if no new data was found, we still update the comic to mark metadataLastChecked
      // This prevents repeatedly trying to fetch the same missing data if the API doesn't have it.
      await updateComicFunc(updatedComic);
      return false; // Indicate no new data, but still processed
    }
  }, [settings, knowledgeBase, logAction]);

  const skipFile = useCallback((file: QueuedFile) => {
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { skippedFile: file }
    });
    showSuccess(`Skipped file: ${file.name}`);
  }, [removeFile, logAction]);

  const undoLastAction = useCallback(() => {
    if (!lastUndoableAction) return;

    // Store the action to be undone before removing it from the log
    const actionToUndo = lastUndoableAction;

    // Remove the action from the log first
    setActions(prev => prev.filter(action => action.id !== actionToUndo.id));

    if (actionToUndo.undo.type === 'ADD_COMIC') {
      const { comicId, originalFile } = actionToUndo.undo.payload;
      removeComic(comicId, false); // Remove from library
      addFile(originalFile); // Add back to queue
      logAction('info', `Undo: Removed '${originalFile.series} #${originalFile.issue}' from library and re-added to queue.`);
    } else if (actionToUndo.undo.type === 'SKIP_FILE') {
      const payload = actionToUndo.undo.payload;
      if (!payload || !payload.skippedFile) {
        console.error('Invalid payload for SKIP_FILE undo action:', payload);
        showError('Failed to undo skip action: Missing file data in payload.');
        return;
      }
      const { skippedFile } = payload;
      addFile(skippedFile); // Add back to queue
      showSuccess(`Re-added skipped file: ${skippedFile.name}`);
      logAction('info', `Undo: Re-added skipped file '${skippedFile.name}' to queue.`);
    }
    // Removed setLastUndoableAction(null); as lastUndoableAction is now derived.
  }, [lastUndoableAction, removeComic, addFile, logAction, setActions]);

  const startMetadataScan = useCallback(async () => {
    setIsScanningMetadata(true);
    setMetadataScanProgress({ processed: 0, total: 0, updated: 0 });

    // Filter candidates: only comics that have missing metadata AND are not ignored
    const candidates = comics.filter(c => !c.ignoreInScans && hasMissingMetadata(c));

    setMetadataScanProgress(prev => ({ ...prev, total: candidates.length }));
    let updatedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const comic = candidates[i];
      const wasUpdated = await performMetadataScan(comic, updateComic);
      if (wasUpdated) {
        updatedCount++;
      }
      setMetadataScanProgress(prev => ({ ...prev, processed: i + 1, updated: updatedCount }));
      await new Promise(res => setTimeout(res, 200));
    }

    setIsScanningMetadata(false);
    showSuccess(`Metadata scan complete. Updated ${updatedCount} of ${candidates.length} comics.`);
  }, [comics, performMetadataScan, updateComic]);

  const scanComicForMetadata = useCallback(async (comicId: string) => {
    const comic = comics.find(c => c.id === comicId);
    if (!comic) {
      showError("Comic not found.");
      return;
    }
    const toastId = showLoading(`Scanning '${comic.series} #${comic.issue}' for details...`);
    try {
      const wasUpdated = await performMetadataScan(comic, updateComic);
      dismissToast(toastId);
      if (wasUpdated) {
        showSuccess(`Metadata updated for '${comic.series} #${comic.issue}'.`);
      } else {
        showSuccess(`No new metadata found for '${comic.series} #${comic.issue}'.`);
      }
    } catch (error) {
      dismissToast(toastId);
      showError(`Failed to scan '${comic.series} #${comic.issue}'.`);
      console.error(`Error scanning single comic ${comic.id}:`, error);
    }
  }, [comics, performMetadataScan, updateComic]);

  const scanSelectedComicsForMetadata = useCallback(async (comicIds: string[]) => {
    if (comicIds.length === 0) {
      showError("No comics selected for scan.");
      return;
    }
    const selectedComicsToScan = comics.filter(c => comicIds.includes(c.id));
    const toastId = showLoading(`Scanning ${selectedComicsToScan.length} selected comics...`);
    let updatedCount = 0;
    let processedCount = 0;

    try {
      for (const comic of selectedComicsToScan) {
        const wasUpdated = await performMetadataScan(comic, updateComic);
        if (wasUpdated) {
          updatedCount++;
        }
        processedCount++;
        // Update toast message for progress
        dismissToast(toastId);
        showLoading(`Scanning ${processedCount} of ${selectedComicsToScan.length} comics...`, toastId);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
      dismissToast(toastId);
      showSuccess(`Scan complete. Updated ${updatedCount} of ${processedCount} selected comics.`);
      logAction('success', `Scanned ${processedCount} selected comics, updated ${updatedCount}.`);
    } catch (error) {
      dismissToast(toastId);
      showError("An error occurred during the bulk scan.");
      console.error("Bulk scan error:", error);
    }
  }, [comics, performMetadataScan, logAction, updateComic]);

  const updateComicProgress = useCallback(async (comicId: string, lastReadPage: number, totalPages: number) => {
    const comicToUpdate = comics.find(c => c.id === comicId);
    if (comicToUpdate && (comicToUpdate.lastReadPage !== lastReadPage || comicToUpdate.totalPages !== totalPages)) {
      const updatedComic = { ...comicToUpdate, lastReadPage, totalPages };
      
      if (databaseService) {
        try {
          await databaseService.updateComic({
            ...updatedComic,
            filePath: updatedComic.filePath || '',
            fileSize: 0,
            dateAdded: updatedComic.dateAdded.toISOString(),
            lastModified: new Date().toISOString()
          });
          setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
        } catch (error) {
          console.error('Error updating comic progress in database:', error);
        }
      } else {
        setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
      }
    }
  }, [comics, databaseService, setComics]);

  const updateReadingHistory = useCallback((comic: Comic, currentPage: number, totalPages: number) => {
    if (totalPages > 0 && (currentPage / totalPages > 0.1 || currentPage === totalPages)) {
        addToRecentlyRead(comic);
    }
  }, [addToRecentlyRead]);

  const openComicForReading = useCallback((comic: Comic) => {
    const isPdf = comic.filePath?.toLowerCase().endsWith('.pdf');

    if (isElectron && electronAPI && isPdf && comic.filePath) {
      electronAPI.openPdf(comic.filePath)
        .then(result => {
          if (result.success) {
            addToRecentlyRead(comic);
            showSuccess(`Opening "${comic.series} #${comic.issue}" in a new window.`);
          } else {
            showError(`Failed to open PDF: ${result.error || 'Unknown error'}`);
          }
        })
        .catch(err => {
          showError(`Failed to open PDF: ${err.message}`);
        });
    } else {
      if (isPdf && !isElectron) {
        showError("Reading PDFs is only supported in the desktop app.");
        return;
      }
      setReadingComic(comic);
    }
  }, [isElectron, electronAPI, addToRecentlyRead]);

  const syncKnowledgeBaseToLibrary = useCallback(async () => {
    if (!databaseService) {
      showError("Database service is not available.");
      return;
    }

    const toastId = showLoading("Syncing Knowledge Base to library...");
    try {
      const { series: kbSeries } = knowledgeBase;
      const updates: (Partial<Comic> & { id: string })[] = [];
      const kbMap = new Map<string, ComicKnowledge>();
      kbSeries.forEach(kb => kbMap.set(normalize(kb.series), kb));

      for (const comic of comics) {
        const kbEntry = kbMap.get(normalize(comic.series));
        if (!kbEntry) continue;

        let hasChanged = false;
        const updatedComic: Partial<Comic> & { id: string } = { id: comic.id };

        if (comic.publisher !== kbEntry.publisher) {
          updatedComic.publisher = kbEntry.publisher;
          hasChanged = true;
        }

        const matchingVolume = (kbEntry.volumes || []).find(v => Number(v.year) === Number(comic.year));
        if (matchingVolume && comic.volume !== matchingVolume.volume) {
          updatedComic.volume = matchingVolume.volume;
          hasChanged = true;
        }

        if (hasChanged) {
          updates.push(updatedComic);
        }
      }

      if (updates.length > 0) {
        const updatedCount = await databaseService.batchUpdateComics(updates);
        await refreshComics();
        showSuccess(`Sync complete. Updated ${updatedCount} comic(s).`);
        logAction('success', `Synced Knowledge Base to library, updating ${updatedCount} comics.`);
      } else {
        showSuccess("Library is already in sync with the Knowledge Base.");
      }
    } catch (error) {
      console.error("Failed to sync Knowledge Base:", error);
      showError("An error occurred during the sync.");
    } finally {
      dismissToast(toastId);
    }
  }, [knowledgeBase, comics, databaseService, refreshComics, logAction]);

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, updateComic, removeComic, updateComicRating,
      actions, logAction, lastUndoableAction, undoLastAction,
      addMockFiles, triggerSelectFiles, triggerScanFolder, triggerQuickAddFiles, addFilesFromDrop,
      addFilesFromPaths, quickAddFiles, fileLoadStatus,
      readingList, addToReadingList, removeFromReadingList, toggleReadingItemCompleted,
      toggleComicReadStatus,
      setReadingItemPriority, setReadingItemRating,
      recentlyRead, addToRecentlyRead, updateRecentRating,
      refreshComics,
      importComics,
      isScanningMetadata,
      metadataScanProgress,
      startMetadataScan,
      scanComicForMetadata, // New
      scanSelectedComicsForMetadata, // New
      updateComicProgress,
      updateReadingHistory,
      readingComic, setReadingComic,
      openComicForReading,
      syncKnowledgeBaseToLibrary
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