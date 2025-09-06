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

  const removeComic = useCallback(async (id: string, deleteFile: boolean = false) => {
    if (databaseService) {
      try {
        const comicToRemove = comics.find(c => c.id === id);
        if (!comicToRemove) {
          showError("Comic not found in library.");
          return;
        }

        let filePathToDelete: string | undefined = undefined;
        if (deleteFile && comicToRemove.filePath && !isMockFile(comicToRemove.filePath)) {
          filePathToDelete = comicToRemove.filePath;
        }

        await databaseService.deleteComic(id, filePathToDelete);
        await refreshComics();
        logAction('success', `Removed '${comicToRemove.series} #${comicToRemove.issue}' from library.`);
        if (deleteFile) {
          logAction('info', `Permanently deleted file: ${comicToRemove.filePath}`);
        }
      } catch (error) {
        console.error('Error removing comic from database:', error);
        showError(`Failed to remove comic: ${id}`);
        logAction('error', `Failed to remove comic: ${id}`);
      }
    } else {
      // Web mode: update in local state
      setComics(prev => prev.filter(c => c.id !== id));
      logAction('success', `(Web Mode) Removed comic '${id}' from library.`);
    }
  }, [databaseService, comics, refreshComics, logAction, setComics]);

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
      }<ctrl63>