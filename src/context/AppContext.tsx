import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  QueuedFile,
  Comic,
  NewComic,
  RecentAction,
  UndoPayload,
  ApiUsageStats,
} from "@/types";
import { useElectronDatabaseService } from "@/services/electronDatabaseService";
import { useElectron } from "@/hooks/useElectron";
import { useSettings } from "@/context/SettingsContext";
import { formatPath } from "@/lib/formatter";
import { showSuccess, showError } from "@/utils/toast";
import { useActionLog } from "./hooks/useActionLog";
import { useFileQueue } from "./hooks/useFileQueue";
import { useComicLibrary } from "./hooks/useComicLibrary";
import { useReadingList } from "./hooks/useReadingList";
import { useRecentlyRead } from "./hooks/useRecentlyRead";
import { useKnowledgeBase } from "./KnowledgeBaseContext";
import { processComicFile } from "@/lib/smartProcessor";

interface AppContextType {
  // Comic Library
  comics: Comic[];
  addComic: (comicData: NewComic, originalFile: QueuedFile) => Promise<void>;
  removeComic: (comicId: string, deleteFile: boolean) => Promise<void>;
  updateComic: (comic: Comic) => Promise<void>;
  updateComicRating: (comicId: string, rating: number) => Promise<void>;
  batchUpdateComics: (updates: (Partial<Comic> & { id: string })[]) => Promise<void>;
  importComics: (comics: Comic[]) => Promise<{ added: number; skipped: number } | undefined>;

  // File Queue
  files: QueuedFile[];
  addFiles: (files: QueuedFile[]) => void;
  removeFile: (fileId: string) => void;
  updateFile: (file: QueuedFile) => void;
  skipFile: (file: QueuedFile) => void;
  quickAddFiles: (files: QueuedFile[]) => Promise<void>;
  addMockFiles: () => void;
  addFilesFromDrop: (droppedFiles: File[]) => void;
  fileLoadStatus: { isLoading: boolean; progress: number; total: number; currentFile: string; isCancellable: boolean; };
  cancelFileLoading: () => void;

  // Processing
  startProcessing: () => void;
  isScanningMetadata: boolean;
  metadataScanProgress: { processed: number; total: number; updated: number } | null;
  startMetadataScan: () => void;
  scanComicForMetadata: (comicId: string) => Promise<void>;
  scanSelectedComicsForMetadata: (comicIds: string[]) => Promise<void>;

  // Actions & Undo
  actions: RecentAction[];
  lastUndoableAction: UndoPayload | undefined;
  undoLastAction: () => void;

  // Reading
  readingComic: Comic | null;
  setReadingComic: (comic: Comic | null) => void;
  openComicForReading: (comic: Comic) => void;
  readingList: ReturnType<typeof useReadingList>['readingList'];
  addToReadingList: ReturnType<typeof useReadingList>['addToReadingList'];
  removeFromReadingList: ReturnType<typeof useReadingList>['removeFromReadingList'];
  toggleReadingItemCompleted: ReturnType<typeof useReadingList>['toggleReadingItemCompleted'];
  toggleComicReadStatus: ReturnType<typeof useReadingList>['toggleComicReadStatus'];
  recentlyRead: ReturnType<typeof useRecentlyRead>['recentlyRead'];

  // Triggers for Electron dialogs
  triggerSelectFiles: () => void;
  triggerScanFolder: () => void;
  triggerQuickAddFiles: () => void;

  // API Usage
  apiUsageStats: ApiUsageStats | null;
  fetchApiUsageStats: () => void;

  // Knowledge Base Sync
  syncKnowledgeBaseToLibrary: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { electronAPI, isElectron } = useElectron();
  const databaseService = useElectronDatabaseService();
  const { settings } = useSettings();
  const { knowledgeBase, addToKnowledgeBase, addCreatorsToKnowledgeBase } = useKnowledgeBase();

  const { actions, logAction, setActions } = useActionLog();
  const { files, setFiles, addFile, addFiles: addQueuedFiles, removeFile, updateFile } = useFileQueue();
  const { comics, setComics, refreshComics } = useComicLibrary();
  const readingListHook = useReadingList();
  const recentlyReadHook = useRecentlyRead();
  const [readingComic, setReadingComic] = useState<Comic | null>(null);
  const [apiUsageStats, setApiUsageStats] = useState<ApiUsageStats | null>(null);
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [metadataScanProgress, setMetadataScanProgress] = useState<{ processed: number; total: number; updated: number } | null>(null);
  const [fileLoadStatus, setFileLoadStatus] = useState({ isLoading: false, progress: 0, total: 0, currentFile: '', isCancellable: false });

  const operationIdCounter = useRef(0);

  const fetchApiUsageStats = useCallback(async () => {
    if (isElectron && electronAPI) {
      try {
        const stats = await electronAPI.getApiUsage();
        setApiUsageStats(stats);
      } catch (error) {
        console.error("Failed to fetch API usage stats:", error);
        setApiUsageStats(null);
      }
    }
  }, [isElectron, electronAPI]);

  useEffect(() => {
    fetchApiUsageStats();
    const interval = setInterval(fetchApiUsageStats, 60000);
    return () => clearInterval(interval);
  }, [fetchApiUsageStats]);

  const addComic = useCallback(async (comicData: NewComic, originalFile: QueuedFile) => {
    if (!databaseService) return;
    try {
      const newComic = {
        ...comicData,
        id: `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dateAdded: new Date(),
        coverUrl: '/placeholder.svg',
        filePath: originalFile.path,
      };
      const savedComic = await databaseService.saveComic(newComic);
      setComics(prev => [...prev, savedComic]);
      logAction('success', `Added '${savedComic.series} #${savedComic.issue}' to library.`, { type: 'ADD_COMIC', payload: { comicId: savedComic.id, originalFile } });
    } catch (error) {
      logAction('error', `Failed to add comic: ${comicData.series}`);
    }
  }, [databaseService, logAction, setComics]);

  const removeComic = useCallback(async (comicId: string, deleteFile: boolean) => {
    if (!databaseService) return;
    const comicToRemove = comics.find(c => c.id === comicId);
    if (!comicToRemove) return;

    try {
      await databaseService.deleteComic(comicId, deleteFile ? comicToRemove.filePath : undefined);
      setComics(prev => prev.filter(c => c.id !== comicId));
      logAction('success', `Removed '${comicToRemove.series} #${comicToRemove.issue}' from library.`);
    } catch (error) {
      logAction('error', `Failed to remove comic: ${comicToRemove.series}`);
    }
  }, [comics, databaseService, logAction, setComics]);

  const updateComic = useCallback(async (comic: Comic) => {
    if (!databaseService) return;
    try {
      const updated = await databaseService.updateComic(comic);
      setComics(prev => prev.map(c => c.id === updated.id ? updated : c));
      return updated;
    } catch (error) {
      logAction('error', `Failed to update comic: ${comic.series}`);
    }
  }, [databaseService, logAction, setComics]);

  const updateComicRating = useCallback(async (comicId: string, rating: number) => {
    const comic = comics.find(c => c.id === comicId);
    if (comic) {
      await updateComic({ ...comic, rating });
      recentlyReadHook.updateRecentRating(comicId, rating);
    }
  }, [comics, updateComic, recentlyReadHook]);

  const batchUpdateComics = useCallback(async (updates: (Partial<Comic> & { id: string })[]) => {
    if (!databaseService) return;
    try {
      const updatedCount = await databaseService.batchUpdateComics(updates);
      await refreshComics();
      showSuccess(`Successfully updated ${updatedCount} comics.`);
    } catch (error) {
      showError("Failed to apply bulk updates.");
    }
  }, [databaseService, refreshComics]);

  const importComics = useCallback(async (importedComics: Comic[]) => {
    if (!databaseService) return;
    return await databaseService.importComics(importedComics);
  }, [databaseService]);

  const skipFile = useCallback((file: QueuedFile) => {
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, { type: 'SKIP_FILE', payload: { skippedFile: file } });
  }, [removeFile, logAction]);

  const quickAddFiles = useCallback(async (filesToQuickAdd: QueuedFile[]) => {
    for (const file of filesToQuickAdd) {
      if (file.series && file.issue && file.year && file.publisher) {
        await addComic({
          series: file.series,
          issue: file.issue,
          year: file.year,
          publisher: file.publisher,
          volume: file.volume || String(file.year),
          summary: `Quick-added from file: ${file.name}`
        }, file);
        removeFile(file.id);
      } else {
        showError(`Cannot quick-add '${file.name}': Missing required information.`);
      }
    }
  }, [addComic, removeFile]);

  const addMockFiles = useCallback(() => {
    // Mock implementation for web
  }, []);

  const addFilesFromDrop = useCallback((droppedFiles: File[]) => {
    // Mock implementation for web
  }, []);

  const cancelFileLoading = useCallback(() => {
    if (electronAPI) {
      electronAPI.cancelFileLoading();
      setFileLoadStatus({ isLoading: false, progress: 0, total: 0, currentFile: '', isCancellable: false });
    }
  }, [electronAPI]);

  const startProcessing = useCallback(async () => {
    // Implementation for processing files
  }, []);

  const startMetadataScan = useCallback(async () => {
    // Implementation for metadata scan
  }, []);

  const scanComicForMetadata = useCallback(async (comicId: string) => {
    // Implementation for single comic scan
  }, []);

  const scanSelectedComicsForMetadata = useCallback(async (comicIds: string[]) => {
    // Implementation for selected comics scan
  }, []);

  const lastUndoableAction = useMemo(() => actions.find(a => a.undo)?.undo, [actions]);

  const undoLastAction = useCallback(() => {
    // Implementation for undo
  }, []);

  const openComicForReading = useCallback((comic: Comic) => {
    setReadingComic(comic);
    recentlyReadHook.addToRecentlyRead(comic);
  }, [recentlyReadHook]);

  const triggerSelectFiles = useCallback(() => {
    if (electronAPI) electronAPI.selectFilesDialog();
  }, [electronAPI]);

  const triggerScanFolder = useCallback(() => {
    if (electronAPI) electronAPI.selectFolderDialog();
  }, [electronAPI]);

  const triggerQuickAddFiles = useCallback(() => {
    // Placeholder for quick add functionality
  }, []);

  const syncKnowledgeBaseToLibrary = useCallback(async () => {
    // Implementation for KB sync
  }, []);

  const value: AppContextType = {
    comics,
    addComic,
    removeComic,
    updateComic,
    updateComicRating,
    batchUpdateComics,
    importComics,
    files,
    addFiles: addQueuedFiles,
    removeFile,
    updateFile,
    skipFile,
    quickAddFiles,
    addMockFiles,
    addFilesFromDrop,
    fileLoadStatus,
    cancelFileLoading,
    startProcessing,
    isScanningMetadata,
    metadataScanProgress,
    startMetadataScan,
    scanComicForMetadata,
    scanSelectedComicsForMetadata,
    actions,
    lastUndoableAction,
    undoLastAction,
    readingComic,
    setReadingComic,
    openComicForReading,
    readingList: readingListHook.readingList,
    addToReadingList: readingListHook.addToReadingList,
    removeFromReadingList: readingListHook.removeFromReadingList,
    toggleReadingItemCompleted: readingListHook.toggleReadingItemCompleted,
    toggleComicReadStatus: readingListHook.toggleComicReadStatus,
    recentlyRead: recentlyReadHook.recentlyRead,
    triggerSelectFiles,
    triggerScanFolder,
    triggerQuickAddFiles,
    apiUsageStats,
    fetchApiUsageStats,
    syncKnowledgeBaseToLibrary,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};