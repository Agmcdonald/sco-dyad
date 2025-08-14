import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { QueuedFile, Comic, RecentAction, NewComic, UndoPayload } from '@/types';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let fileIdCounter = 0;
let comicIdCounter = 0;

const sampleComics: Comic[] = [
  {
    id: `comic-${comicIdCounter++}`,
    series: "Saga",
    issue: "1",
    year: 2012,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "An epic space opera/fantasy comic about star-crossed lovers from enemy species."
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "The Walking Dead",
    issue: "1",
    year: 2003,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "A post-apocalyptic horror comic following survivors in a zombie-infested world."
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "Batman",
    issue: "1",
    year: 2016,
    publisher: "DC Comics",
    volume: "3",
    coverUrl: "/placeholder.svg",
    summary: "The Dark Knight's adventures in Gotham City continue in this acclaimed series."
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "The Amazing Spider-Man",
    issue: "1",
    year: 2018,
    publisher: "Marvel Comics",
    volume: "5",
    coverUrl: "/placeholder.svg",
    summary: "Your friendly neighborhood Spider-Man swings into action in New York City."
  },
  {
    id: `comic-${comicIdCounter++}`,
    series: "Invincible",
    issue: "1",
    year: 2003,
    publisher: "Image Comics",
    volume: "1",
    coverUrl: "/placeholder.svg",
    summary: "A teenage superhero discovers his powers and the complex world of heroes and villains."
  }
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<RecentAction[]>([]);
  const databaseService = useElectronDatabaseService();
  const { isElectron, electronAPI } = useElectron();
  const { settings } = useSettings();

  const logAction = useCallback((type: RecentAction['type'], message: string, undo?: UndoPayload) => {
    const newAction: RecentAction = {
      id: Date.now(),
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
            coverUrl: dbComic.coverUrl || '/placeholder.svg'
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
    if (isElectron && electronAPI && databaseService) {
      try {
        // 1. Organize the physical file
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

        // 2. Save comic metadata to the database with the new path
        const comicToSave = {
          ...comicData,
          filePath: organizeResult.newPath,
          fileSize: originalFile.pageCount ? originalFile.pageCount * 1000000 : 25000000, // Estimate size
        };
        
        const savedComic = await databaseService.saveComic(comicToSave);

        // 3. Update UI state with the final comic object from the database
        // The savedComic should have the coverUrl with the custom protocol
        const uiComic: Comic = {
          id: savedComic.id,
          series: savedComic.series,
          issue: savedComic.issue,
          year: savedComic.year,
          publisher: savedComic.publisher,
          volume: savedComic.volume,
          summary: savedComic.summary,
          coverUrl: savedComic.coverUrl || '/placeholder.svg'
        };

        setComics(prev => [uiComic, ...prev]);
        logAction('success', `Organized '${originalFile.name}' as '${savedComic.series} #${savedComic.issue}'`, {
          type: 'ADD_COMIC',
          payload: { comicId: savedComic.id, originalFile }
        });

        // Log cover URL for debugging
        console.log('Comic added with cover URL:', savedComic.coverUrl);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showError(`An error occurred while organizing ${originalFile.name}`);
        logAction('error', `Error organizing ${originalFile.name}: ${errorMessage}`);
        console.error('Error in addComic:', error);
      }
    } else {
      // Web mode (mock behavior)
      const newComic: Comic = {
        ...comicData,
        id: `comic-${comicIdCounter++}`,
        coverUrl: '/placeholder.svg'
      };
      setComics(prev => [newComic, ...prev]);
      logAction('success', `(Web Mode) Organized '${originalFile.name}' as '${newComic.series} #${newComic.issue}'`, {
        type: 'ADD_COMIC',
        payload: { comicId: newComic.id, originalFile }
      });
    }
  };

  const updateComic = async (updatedComic: Comic) => {
    // Update in database if available
    if (databaseService) {
      try {
        await databaseService.updateComic({
          ...updatedComic,
          filePath: `library/${updatedComic.series}/${updatedComic.series}_${updatedComic.issue}.cbz`,
          fileSize: 25000000,
          dateAdded: new Date().toISOString(),
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
        // TODO: Remove from database if available
        break;
      case 'SKIP_FILE':
        addFile(payload.skippedFile);
        break;
    }

    logAction('info', `Undo: ${lastUndoableAction.message}`);
    setActions(prev => prev.map(a => a.id === lastUndoableAction.id ? { ...a, undo: undefined } : a));
  };

  const addMockFiles = useCallback(() => {
    const newMockFiles: QueuedFile[] = [
      { id: `file-${fileIdCounter++}`, name: "Saga #2 (2012).cbr", path: "/incoming/Saga #2 (2012).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Batman The Knight #1 (2022).cbr", path: "/incoming/Batman The Knight #1 (2022).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "The Amazing Spider-Man #300 (1988).cbr", path: "/incoming/The Amazing Spider-Man #300 (1988).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Action Comics #1000 (2018).cbr", path: "/incoming/Action Comics #1000 (2018).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Radiant Black #1 (2021).cbr", path: "/incoming/Radiant Black #1 (2021).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Invincible #144 (2018).cbr", path: "/incoming/Invincible #144 (2018).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Monstress #1 (2015).cbr", path: "/incoming/Monstress #1 (2015).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Paper Girls #1 (2015).cbr", path: "/incoming/Paper Girls #1 (2015).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "The Wicked The Divine #1 (2014).cbr", path: "/incoming/The Wicked The Divine #1 (2014).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "East of West #1 (2013).cbr", path: "/incoming/East of West #1 (2013).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Unknown Comic.cbr", path: "/incoming/Unknown Comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Another Unknown Comic.cbr", path: "/incoming/Another Unknown Comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Superman - The Kryptonite Spectrum 001 (2025) (Webrip) (The Last Kryptonian-DCP) (1).cbr", path: "/incoming/Superman - The Kryptonite Spectrum 001 (2025) (Webrip) (The Last Kryptonian-DCP) (1).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
    ];
    addFiles(newMockFiles);
    logAction('info', `Added ${newMockFiles.length} mock files to the queue.`);
  }, [logAction]);

  const triggerSelectFiles = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      showError("This feature is only available in the desktop app.");
      addMockFiles(); // Fallback for web
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
      addMockFiles(); // Fallback for web
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

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, updateComic,
      isProcessing, startProcessing, pauseProcessing,
      actions, logAction,
      lastUndoableAction, undoLastAction,
      addMockFiles,
      triggerSelectFiles,
      triggerScanFolder
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