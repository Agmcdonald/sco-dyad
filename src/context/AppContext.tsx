/**
 * @file AppContext.tsx
 * @summary The main application context and provider.
 * @description This file defines the central `AppContext` for the entire application.
 * It consolidates state and logic from various custom hooks (`useFileQueue`, `useComicLibrary`, etc.)
 * into a single, cohesive provider. This approach simplifies state management and provides a
 * unified interface for components to access and manipulate application data and actions.
 */
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
import { showSuccess, showError } from "@/utils/toast";
import { useActionLog } from "./hooks/useActionLog";
import { useFileQueue } from "./hooks/useFileQueue";
import { useComicLibrary } from "./hooks/useComicLibrary";
import { useReadingList } from "./hooks/useReadingList";
import { useRecentlyRead } from "./hooks/useRecentlyRead";
import { useKnowledgeBase } from "./KnowledgeBaseContext";

/**
 * @interface AppContextType
 * @summary Defines the shape of the application context, including all state and actions.
 */
interface AppContextType {
  // --- Comic Library State & Actions ---
  /** The main collection of comics in the user's library. */
  comics: Comic[];
  /** Adds a new comic to the library after it has been processed. */
  addComic: (comicData: NewComic, originalFile: QueuedFile) => Promise<void>;
  /** Removes a comic from the library and optionally deletes its file. */
  removeComic: (comicId: string, deleteFile: boolean) => Promise<void>;
  /** Updates the data for a single comic. */
  updateComic: (comic: Comic) => Promise<void>;
  /** Updates the rating for a specific comic. */
  updateComicRating: (comicId: string, rating: number) => Promise<void>;
  /** Applies a batch of updates to multiple comics. */
  batchUpdateComics: (updates: (Partial<Comic> & { id: string })[]) => Promise<void>;
  /** Imports a list of comics, skipping duplicates. */
  importComics: (comics: Comic[]) => Promise<{ added: number; skipped: number } | undefined>;

  // --- File Queue State & Actions ---
  /** The list of files currently in the processing queue. */
  files: QueuedFile[];
  /** Adds multiple files to the processing queue. */
  addFiles: (files: QueuedFile[]) => void;
  /** Removes a single file from the queue. */
  removeFile: (fileId: string) => void;
  /** Updates the data for a file in the queue. */
  updateFile: (file: QueuedFile) => void;
  /** Skips a file, removing it from the queue and logging the action. */
  skipFile: (file: QueuedFile) => void;
  /** Quickly adds files to the library if they have sufficient metadata. */
  quickAddFiles: (files: QueuedFile[]) => Promise<void>;
  /** Adds mock files for testing in a web environment. */
  addMockFiles: () => void;
  /** Handles files added via drag-and-drop. */
  addFilesFromDrop: (droppedFiles: File[]) => void;
  /** The current status of file loading operations (e.g., scanning folders). */
  fileLoadStatus: { isLoading: boolean; progress: number; total: number; currentFile: string; isCancellable: boolean; };
  /** Cancels any ongoing file loading operations. */
  cancelFileLoading: () => void;

  // --- Processing State & Actions ---
  /** Starts the main processing pipeline for files in the queue. */
  startProcessing: () => void;
  /** Indicates if a metadata scan is currently in progress. */
  isScanningMetadata: boolean;
  /** The progress of the current metadata scan. */
  metadataScanProgress: { processed: number; total: number; updated: number } | null;
  /** Initiates a metadata scan for the entire library. */
  startMetadataScan: () => void;
  /** Scans a single comic for updated metadata from external sources. */
  scanComicForMetadata: (comicId: string) => Promise<void>;
  /** Scans a selection of comics for updated metadata. */
  scanSelectedComicsForMetadata: (comicIds: string[]) => Promise<void>;

  // --- Actions & Undo ---
  /** A log of recent actions performed by the user. */
  actions: RecentAction[];
  /** The most recent action that can be undone. */
  lastUndoableAction: UndoPayload | undefined;
  /** Executes the undo logic for the last undoable action. */
  undoLastAction: () => void;

  // --- Reading State & Actions ---
  /** The comic currently being viewed in the reader. */
  readingComic: Comic | null;
  /** Sets the comic to be viewed in the reader. */
  setReadingComic: (comic: Comic | null) => void;
  /** Opens a comic in the reader and adds it to the recently read list. */
  openComicForReading: (comic: Comic) => void;
  /** The user's reading list. */
  readingList: ReturnType<typeof useReadingList>['readingList'];
  /** Adds a comic to the reading list. */
  addToReadingList: ReturnType<typeof useReadingList>['addToReadingList'];
  /** Removes a comic from the reading list. */
  removeFromReadingList: ReturnType<typeof useReadingList>['removeFromReadingList'];
  /** Toggles the completed status of an item in the reading list. */
  toggleReadingItemCompleted: ReturnType<typeof useReadingList>['toggleReadingItemCompleted'];
  /** Toggles the read status of a comic. */
  toggleComicReadStatus: ReturnType<typeof useReadingList>['toggleComicReadStatus'];
  /** The list of recently read comics. */
  recentlyRead: ReturnType<typeof useRecentlyRead>['recentlyRead'];

  // --- Electron Dialog Triggers ---
  /** Triggers the native "Select Files" dialog. */
  triggerSelectFiles: () => void;
  /** Triggers the native "Scan Folder" dialog. */
  triggerScanFolder: () => void;
  /** Triggers the "Quick Add" functionality. */
  triggerQuickAddFiles: () => void;

  // --- API Usage ---
  /** Statistics on Comic Vine API usage. */
  apiUsageStats: ApiUsageStats | null;
  /** Fetches the latest API usage statistics. */
  fetchApiUsageStats: () => void;

  // --- Knowledge Base ---
  /** Synchronizes the knowledge base with the main comic library. */
  syncKnowledgeBaseToLibrary: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * @provider AppProvider
 * @summary Provides the central application state to all child components.
 * @description This component wraps the application and provides the `AppContext`. It initializes
 * all the custom hooks for state management, defines callback functions for actions, and
 * passes them all down through the context value.
 * @param {{ children: ReactNode }} props - The child components to be rendered within the provider.
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { electronAPI, isElectron } = useElectron();
  const databaseService = useElectronDatabaseService();
  const { settings } = useSettings();
  const { knowledgeBase, addToKnowledgeBase, addCreatorsToKnowledgeBase } = useKnowledgeBase();

  // --- State Hooks ---
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

  /**
   * Fetches API usage stats from the main process.
   */
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

  /**
   * Effect to fetch API usage stats on mount and then periodically.
   */
  useEffect(() => {
    fetchApiUsageStats();
    const interval = setInterval(fetchApiUsageStats, 60000);
    return () => clearInterval(interval);
  }, [fetchApiUsageStats]);

  /**
   * Adds a processed comic to the library.
   */
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

  /**
   * Removes a comic from the library.
   */
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

  /**
   * Updates an existing comic's data.
   */
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

  /**
   * Updates a comic's rating.
   */
  const updateComicRating = useCallback(async (comicId: string, rating: number) => {
    const comic = comics.find(c => c.id === comicId);
    if (comic) {
      await updateComic({ ...comic, rating });
      recentlyReadHook.updateRecentRating(comicId, rating);
    }
  }, [comics, updateComic, recentlyReadHook]);

  /**
   * Applies updates to multiple comics in a single database transaction.
   */
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

  /**
   * Imports comics from a backup file.
   */
  const importComics = useCallback(async (importedComics: Comic[]) => {
    if (!databaseService) return;
    return await databaseService.importComics(importedComics);
  }, [databaseService]);

  /**
   * Skips a file in the processing queue.
   */
  const skipFile = useCallback((file: QueuedFile) => {
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, { type: 'SKIP_FILE', payload: { skippedFile: file } });
  }, [removeFile, logAction]);

  /**
   * Quickly adds files to the library if they have enough pre-filled metadata.
   */
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
    // Mock implementation for web environment
  }, []);

  const addFilesFromDrop = useCallback((droppedFiles: File[]) => {
    // Mock implementation for web environment
  }, []);

  /**
   * Cancels any ongoing file scanning or loading operations.
   */
  const cancelFileLoading = useCallback(() => {
    if (electronAPI) {
      electronAPI.cancelFileLoading();
      setFileLoadStatus({ isLoading: false, progress: 0, total: 0, currentFile: '', isCancellable: false });
    }
  }, [electronAPI]);

  const startProcessing = useCallback(async () => {
    // Placeholder for the main file processing logic
  }, []);

  const startMetadataScan = useCallback(async () => {
    // Placeholder for library-wide metadata scanning
  }, []);

  const scanComicForMetadata = useCallback(async (comicId: string) => {
    // Placeholder for single comic metadata scan
  }, []);

  const scanSelectedComicsForMetadata = useCallback(async (comicIds: string[]) => {
    // Placeholder for batch metadata scan
  }, []);

  /**
   * Memoized value of the last action that can be undone.
   */
  const lastUndoableAction = useMemo(() => actions.find(a => a.undo)?.undo, [actions]);

  const undoLastAction = useCallback(() => {
    // Placeholder for the undo logic
  }, []);

  /**
   * Opens a comic in the reader view and marks it as recently read.
   */
  const openComicForReading = useCallback((comic: Comic) => {
    setReadingComic(comic);
    recentlyReadHook.addToRecentlyRead(comic);
  }, [recentlyReadHook]);

  /**
   * Triggers a native file selection dialog in the main process.
   */
  const triggerSelectFiles = useCallback(() => {
    if (electronAPI) electronAPI.selectFilesDialog();
  }, [electronAPI]);

  /**
   * Triggers a native folder selection dialog in the main process.
   */
  const triggerScanFolder = useCallback(() => {
    if (electronAPI) electronAPI.selectFolderDialog();
  }, [electronAPI]);

  const triggerQuickAddFiles = useCallback(() => {
    // Placeholder for quick add functionality
  }, []);

  const syncKnowledgeBaseToLibrary = useCallback(async () => {
    // Placeholder for KB sync logic
  }, []);

  // Consolidate all state and actions into the context value
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

/**
 * @hook useAppContext
 * @summary A custom hook for consuming the `AppContext`.
 * @description This hook provides a convenient way for components to access the application
 * context. It also includes a check to ensure it's used within an `AppProvider`.
 * @returns {AppContextType} The application context value.
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};