import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { QueuedFile, Comic, ActionType, RecentAction, Confidence } from '@/types'; // Import QueuedFile and Confidence

interface AppContextType {
  files: QueuedFile[];
  addFile: (file: QueuedFile) => void;
  addFiles: (files: QueuedFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (file: QueuedFile) => void;
  skipFile: (file: QueuedFile) => void;
  comics: Comic[];
  addComic: (comic: Comic, originalFile: QueuedFile) => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  actions: RecentAction[];
  logAction: (type: RecentAction['type'], message: string, undo?: RecentAction['undo']) => void;
  lastUndoableAction: RecentAction | null;
  undoLastAction: () => void;
  addMockFiles: () => void; // Add this to the interface
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let fileIdCounter = 0; // Simple counter for unique mock file IDs

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<RecentAction[]>([]);

  const logAction = useCallback((type: RecentAction['type'], message: string, undo?: RecentAction['undo']) => {
    const newAction: RecentAction = {
      id: Date.now(),
      type,
      text: message, // Changed message to text to match RecentAction interface
      time: new Date().toLocaleTimeString(), // Use time string
      undoable: !!undo,
      undo,
    };
    setActions(prev => [newAction, ...prev]);
  }, []);

  const addFile = (file: QueuedFile) => {
    setFiles(prev => [...prev, file]);
  };

  const addFiles = (newFiles: QueuedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const skipFile = (file: QueuedFile) => {
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { file }
    });
    removeFile(file.id);
  };

  const updateFile = (updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  const addComic = (comic: Comic, originalFile: QueuedFile) => {
    setComics(prev => [comic, ...prev]);
    logAction('success', `Organized '${originalFile.name}' as '${comic.series} #${comic.issue}'`, {
      type: 'ADD_COMIC',
      payload: { comic, originalFile }
    });
  };

  const startProcessing = () => setIsProcessing(true);
  const pauseProcessing = () => setIsProcessing(false);

  const lastUndoableAction = actions.find(a => a.undoable) || null;

  const undoLastAction = () => {
    if (!lastUndoableAction || !lastUndoableAction.undo) return;

    const { type, payload } = lastUndoableAction.undo;

    switch (type) {
      case 'ADD_COMIC':
        setComics(prev => prev.filter(c => c.series !== payload.comic.series || c.issue !== payload.comic.issue));
        addFile(payload.originalFile);
        break;
      case 'SKIP_FILE':
        addFile(payload.file);
        break;
    }

    logAction('info', `Undo: ${lastUndoableAction.text}`); // Use text here
    setActions(prev => prev.map(a => a.id === lastUndoableAction.id ? { ...a, undoable: false } : a));
  };

  const addMockFiles = useCallback(() => {
    const newMockFiles: QueuedFile[] = [
      {
        id: `file-${fileIdCounter++}`,
        name: "Saga #1 (2012).cbr",
        path: "/incoming/Saga #1 (2012).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Batman The Knight #1 (2022).cbr",
        path: "/incoming/Batman The Knight #1 (2022).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "The Amazing Spider-Man #300 (1988).cbr",
        path: "/incoming/The Amazing Spider-Man #300 (1988).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Action Comics #1 (1938).cbr",
        path: "/incoming/Action Comics #1 (1938).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Radiant Black #1 (2021).cbr",
        path: "/incoming/Radiant Black #1 (2021).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Invincible #1 (2003).cbr",
        path: "/incoming/Invincible #1 (2003).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Monstress #1 (2015).cbr",
        path: "/incoming/Monstress #1 (2015).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Paper Girls #1 (2015).cbr",
        path: "/incoming/Paper Girls #1 (2015).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "The Wicked The Divine #1 (2014).cbr",
        path: "/incoming/The Wicked The Divine #1 (2014).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "East of West #1 (2013).cbr",
        path: "/incoming/East of West #1 (2013).cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Unknown Comic.cbr",
        path: "/incoming/Unknown Comic.cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
      {
        id: `file-${fileIdCounter++}`,
        name: "Another Unknown Comic.cbr",
        path: "/incoming/Another Unknown Comic.cbr",
        series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending",
      },
    ];
    addFiles(newMockFiles);
    logAction('info', `Added ${newMockFiles.length} mock files to the queue.`);
  }, [addFiles, logAction]);

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, 
      isProcessing, startProcessing, pauseProcessing,
      actions, logAction,
      lastUndoableAction, undoLastAction,
      addMockFiles // Provide the new function
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