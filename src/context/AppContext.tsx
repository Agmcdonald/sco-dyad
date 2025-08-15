import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { QueuedFile, Comic, RecentAction, NewComic, UndoPayload, ReadingListItem } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { useElectron } from '@/hooks/useElectron';
import { useSettings } from '@/context/SettingsContext';
import { formatPath } from '@/lib/formatter';
import { showSuccess, showError } from '@/utils/toast';

interface AppContextType {
  files: QueuedFile[];
  addFile: (file: QueuedFile) => void;
  addFiles: (files: QueuedFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (file: QueuedFile) => void;
  skipFile: (file: QueuedFile) => void;
  comics: Comic[];
  addComic: (comicData: NewComic, originalFile: QueuedFile) => void;
  updateComic: (comic: Comic) => void;
  removeComic: (id: string) => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  actions: RecentAction[];
  logAction: (type: RecentAction['type'], message: string, undo?: UndoPayload) => void;
  lastUndoableAction: RecentAction | null;
  undoLastAction: () => void;
  addMockFiles: () => void;
  triggerSelectFiles: () => void;
  triggerScanFolder: () => void;
  readingList: ReadingListItem[];
  addToReadingList: (comic: Comic) => void;
  removeFromReadingList: (itemId: string) => void;
  toggleReadingItemCompleted: (itemId: string) => void;
  setReadingItemPriority: (itemId: string, priority: 'low' | 'medium' | 'high') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let fileIdCounter = 0;
let comicIdCounter = 0;
let actionIdCounter = 0;

// Check if a file is a mock file
const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://') || 
         filePath.includes('(Digital)') || 
         filePath.includes('(Webrip)') || 
         filePath.includes('Kileko-Empire') ||
         filePath.includes('The Last Kryptonian-DCP');
};

const sampleComics: Comic[] = [
  {
    id: `comic-${comicIdCounter++}`,
    series: "Saga",
    issue: "1",
    year: 2012,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "An epic space opera/fantasy comic about star-crossed lovers from enemy species.",
    dateAdded: new Date('2023-10-26T10:00:00Z'),
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "The Walking Dead",
    issue: "1",
    year: 2003,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "A post-apocalyptic horror comic following survivors in a zombie-infested world.",
    dateAdded: new Date('2023-10-25T11:00:00Z'),
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "Batman",
    issue: "1",
    year: 2016,
    publisher: "DC Comics",
    volume: "3",
    coverUrl: "/placeholder.svg",
    summary: "The Dark Knight's adventures in Gotham City continue in this acclaimed series.",
    dateAdded: new Date('2023-10-24T12:00:00Z'),
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "The Amazing Spider-Man",
    issue: "1",
    year: 2018,
    publisher: "Marvel Comics",
    volume: "5",
    coverUrl: "/placeholder.svg",
    summary: "Your friendly neighborhood Spider-Man swings into action in New York City.",
    dateAdded: new Date('2023-10-23T13:00:00Z'),
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "Invincible",
    issue: "1",
    year: 2003,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "A teenage superhero discovers his powers and the complex world of heroes and villains.",
    dateAdded: new Date('2023-10-22T14:00:00Z'),
  }
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<RecentAction[]>([]);
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const databaseService = useElectronDatabaseService();
  const { isElectron, electronAPI } = useElectron();
  const { settings } = useSettings();

  const logAction = useCallback((type: RecentAction['type'], message: string, undo?: UndoPayload) => {
    const newAction: RecentAction = {
      id: actionIdCounter++, // Use incrementing counter instead of timestamp
      type,
      message,
      timestamp: new Date(),
      undo,
    };
    setActions(prev => [newAction, ...prev].slice(0, 10)); // Keep last 10 actions
  }, []);

  // Load comics from Electron database on startup or use sample data for web
  useEffect(() => {
    const loadData = async () => {
      if (databaseService) {
        // Electron mode: Load from the user's database
        try {
          const dbComics = await databaseService.getComics();
          const appComics = dbComics.map(dbComic => ({
            id: dbComic.id,
            series: dbComic.series,
            issue: dbComic.issue,
            year: dbComic.year,
            publisher: dbComic.publisher,
            volume: dbComic.volume,
            summary: dbComic.summary,
            coverUrl: dbComic.coverUrl || '/placeholder.svg',
            dateAdded: new Date(dbComic.dateAdded),
            filePath: dbComic.filePath,
          }));
          setComics(appComics);
          if (appComics.length > 0) {
            logAction('info', `Loaded ${appComics.length} comics from database.`);
          } else {
            logAction('info', 'Database is empty. Add files to start your library.');
          }
        } catch (error) {
          console.error('Error loading comics from database:', error);
          logAction('error', 'Failed to load comics from database.');
        }
      } else {
        // Web mode: Use sample data for demonstration
        setComics(sampleComics);
        if (sampleComics.length > 0) {
          setReadingList([
            {
              id: '1',
              comicId: sampleComics[0].id,
              title: `${sampleComics[0].series} #${sampleComics[0].issue}`,
              series: sampleComics[0].series,
              issue: sampleComics[0].issue,
              publisher: sampleComics[0].publisher,
              year: sampleComics[0].year,
              priority: 'high',
              completed: false,
              dateAdded: new Date()
            }
          ]);
        }
        logAction('info', `Comic Organizer initialized with ${sampleComics.length} sample comics.`);
      }
    };

    loadData();
  }, [databaseService, logAction]);

  const addFile = (file: QueuedFile) => {
    setFiles(prev => [...prev, file]);
  };

  const addFiles = (newFiles: QueuedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const addFilesFromPaths = useCallback((paths: string[]) => {
    if (paths.length === 0) return;

    const newFiles = paths.map((path, index) => ({
      id: `file-${fileIdCounter++}-${index}`,
      name: path.split(/[\\/]/).pop() || 'Unknown File',
      path: path,
      series: null,
      issue: null,
      year: null,
      publisher: null,
      confidence: null,
      status: 'Pending' as any,
    }));

    addFiles(newFiles);
    logAction('info', `Added ${newFiles.length} files to the queue.`);
    showSuccess(`Added ${newFiles.length} files to the queue.`);
  }, [logAction]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const skipFile = (file: QueuedFile) => {
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { skippedFile: file }
    });
  };

  const updateFile = (updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  const addComic = async (comicData: NewComic, originalFile: QueuedFile) => {
    // Check if this is a mock file - if so, handle it differently
    if (isMockFile(originalFile.path)) {
      // Mock file - just add to library without file operations
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
        // 1. First, extract cover and get file info BEFORE moving the file
        let coverUrl = '/placeholder.svg';
        let fileSize = 25000000; // Default size
        
        try {
          // Extract cover before moving the file
          coverUrl = await electronAPI.extractCover(originalFile.path);
          console.log('[ADD-COMIC] Cover extracted:', coverUrl);
        } catch (coverError) {
          console.warn('[ADD-COMIC] Could not extract cover:', coverError);
        }

        try {
          // Get file info before moving
          const fileInfo = await electronAPI.readComicFile(originalFile.path);
          if (fileInfo && fileInfo.size) {
            fileSize = fileInfo.size;
          }
        } catch (infoError) {
          console.warn('[ADD-COMIC] Could not read file info:', infoError);
        }

        // 2. Organize the physical file
        const fileExtension = originalFile.name.substring(originalFile.name.lastIndexOf('.'));
        const folderPart = formatPath(settings.folderNameFormat, comicData);
        const filePart = formatPath(settings.fileNameFormat, comicData) + fileExtension;
        const relativeTargetPath = `${folderPart}/${filePart}`.replace(/\\/g, '/');

        const organizeResult = await electronAPI.organizeFile(originalFile.path, relativeTargetPath);

        if (!organizeResult.success) {
          showError(`Failed to move file: ${originalFile.name}`);
          logAction('error', `Failed to organize file: ${originalFile.name}`);
          return;
        }

        // 3. Save comic metadata to the database with the new path and extracted cover
        const comicToSave = {
          ...comicData,
          filePath: organizeResult.newPath,
          fileSize: fileSize,
        };
        
        const savedComic = await databaseService.saveComic(comicToSave);

        // 4. Update the saved comic with the cover URL we extracted earlier
        const finalComic = {
          ...savedComic,
          coverUrl: coverUrl
        };

        // Update the database with the cover URL
        try {
          await databaseService.updateComic(finalComic);
        } catch (updateError) {
          console.warn('[ADD-COMIC] Could not update cover URL in database:', updateError);
        }

        // 5. Update UI state with the final comic object
        const uiComic: Comic = {
          id: finalComic.id,
          series: finalComic.series,
          issue: finalComic.issue,
          year: finalComic.year,
          publisher: finalComic.publisher,
          volume: finalComic.volume,
          summary: finalComic.summary,
          coverUrl: finalComic.coverUrl,
          dateAdded: new Date(finalComic.dateAdded),
          filePath: finalComic.filePath,
        };

        setComics(prev => [uiComic, ...prev]);
        logAction('success', `Organized '${originalFile.name}' as '${finalComic.series} #${finalComic.issue}'`, {
          type: 'ADD_COMIC',
          payload: { comicId: finalComic.id, originalFile }
        });

        console.log('[ADD-COMIC] Comic added successfully with cover:', finalComic.coverUrl);
        showSuccess(`Added '${finalComic.series} #${finalComic.issue}' to library`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showError(`An error occurred while organizing ${originalFile.name}`);
        logAction('error', `Error organizing ${originalFile.name}: ${errorMessage}`);
        console.error('[ADD-COMIC] Error:', error);
      }
    } else {
      // Web mode (mock behavior) - Don't try to organize files
      const newComic: Comic = {
        ...comicData,
        id: `comic-${comicIdCounter++}`,
        coverUrl: '/placeholder.svg',
        dateAdded: new Date(),
      };
      setComics(prev => [newComic, ...prev]);
      logAction('success', `(Web Mode) Added '${newComic.series} #${newComic.issue}' to library`, {
        type: 'ADD_COMIC',
        payload: { comicId: newComic.id, originalFile }
      });
      showSuccess(`Added '${newComic.series} #${newComic.issue}' to library`);
    }
  };

  const updateComic = async (updatedComic: Comic) => {
    if (databaseService) {
      try {
        await databaseService.updateComic({
          ...updatedComic,
          filePath: updatedComic.filePath || `library/${updatedComic.series}/${updatedComic.series}_${updatedComic.issue}.cbz`,
          fileSize: 25000000,
          dateAdded: updatedComic.dateAdded.toISOString(),
          lastModified: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating comic in database:', error);
        logAction('warning', `Comic updated in memory only: ${error.message}`);
      }
    }

    setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
    logAction('info', `Updated metadata for '${updatedComic.series} #${updatedComic.issue}'`);
  };

  const removeComic = (id: string) => {
    const comicToRemove = comics.find(c => c.id === id);
    if (comicToRemove) {
      setComics(prev => prev.filter(c => c.id !== id));
      logAction('info', `Removed comic: '${comicToRemove.series} #${comicToRemove.issue}'`);
      showSuccess("Comic removed from library");
    }
  };

  const startProcessing = () => setIsProcessing(true);
  const pauseProcessing = () => setIsProcessing(false);

  const lastUndoableAction = actions.find(a => !!a.undo) || null;

  const undoLastAction = () => {
    if (!lastUndoableAction || !lastUndoableAction.undo) return;

    const { type, payload } = lastUndoableAction.undo;

    switch (type) {
      case 'ADD_COMIC':
        setComics(prev => prev.filter(c => c.id !== payload.comicId));
        addFile(payload.originalFile);
        break;
      case 'SKIP_FILE':
        addFile(payload.skippedFile);
        break;
    }

    logAction('info', `Undo: ${lastUndoableAction.message}`);
    setActions(prev => prev.map(a => a.id === lastUndoableAction.id ? { ...a, undo: undefined } : a));
  };

  const addMockFiles = useCallback(() => {
    // Create mock files that are safe for testing (no actual file operations)
    const newMockFiles: QueuedFile[] = [
      { 
        id: `file-${fileIdCounter++}`, 
        name: "Saga #2 (2012).cbr", 
        path: "mock://saga-2-2012.cbr", // Use mock:// protocol to indicate these are fake
        series: null, 
        issue: null, 
        year: null, 
        publisher: null, 
        confidence: null, 
        status: "Pending" 
      },
      { 
        id: `file-${fileIdCounter++}`, 
        name: "Batman The Knight #1 (2022).cbr", 
        path: "mock://batman-knight-1-2022.cbr", 
        series: null, 
        issue: null, 
        year: null, 
        publisher: null, 
        confidence: null, 
        status: "Pending" 
      },
      { 
        id: `file-${fileIdCounter++}`, 
        name: "The Amazing Spider-Man #300 (1988).cbr", 
        path: "mock://amazing-spider-man-300-1988.cbr", 
        series: null, 
        issue: null, 
        year: null, 
        publisher: null, 
        confidence: null, 
        status: "Pending" 
      },
    ];
    addFiles(newMockFiles);
    logAction('info', `Added ${newMockFiles.length} mock files to the queue for testing.`);
  }, [logAction]);

  const triggerSelectFiles = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      addMockFiles();
      return;
    }
    try {
      const filePaths = await electronAPI.selectFilesDialog();
      addFilesFromPaths(filePaths);
    } catch (error) {
      console.error("Error selecting files:", error);
      showError("Could not select files.");
    }
  }, [isElectron, electronAPI, addFilesFromPaths, addMockFiles]);

  const triggerScanFolder = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      addMockFiles();
      return;
    }
    try {
      const filePaths = await electronAPI.selectFolderDialog();
      addFilesFromPaths(filePaths);
    } catch (error) {
      console.error("Error scanning folder:", error);
      showError("Could not scan folder.");
    }
  }, [isElectron, electronAPI, addFilesFromPaths, addMockFiles]);

  // Reading List Functions
  const addToReadingList = (comic: Comic) => {
    const newItem: ReadingListItem = {
      id: `rl-${Date.now()}`,
      comicId: comic.id,
      title: `${comic.series} #${comic.issue}`,
      series: comic.series,
      issue: comic.issue,
      publisher: comic.publisher,
      year: comic.year,
      priority: 'medium',
      completed: false,
      dateAdded: new Date()
    };
    setReadingList(prev => [newItem, ...prev]);
    showSuccess(`Added "${newItem.title}" to reading list.`);
  };

  const removeFromReadingList = (itemId: string) => {
    setReadingList(prev => prev.filter(item => item.id !== itemId));
    showSuccess("Removed from reading list");
  };

  const toggleReadingItemCompleted = (itemId: string) => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    const item = readingList.find(i => i.id === itemId);
    if (item && !item.completed) {
      showSuccess(`Marked "${item.title}" as read!`);
    }
  };

  const setReadingItemPriority = (itemId: string, priority: 'low' | 'medium' | 'high') => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, priority } : item
    ));
  };

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, updateComic, removeComic,
      isProcessing, startProcessing, pauseProcessing,
      actions, logAction,
      lastUndoableAction, undoLastAction,
      addMockFiles,
      triggerSelectFiles,
      triggerScanFolder,
      readingList,
      addToReadingList,
      removeFromReadingList,
      toggleReadingItemCompleted,
      setReadingItemPriority
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