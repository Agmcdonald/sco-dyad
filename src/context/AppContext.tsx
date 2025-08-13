import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { QueuedFile, Comic, RecentAction, NewComic, UndoPayload } from '@/types';

interface AppContextType {
  files: QueuedFile[];
  addFile: (file: QueuedFile) => void;
  addFiles: (files: QueuedFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (file: QueuedFile) => void;
  skipFile: (file: QueuedFile) => void;
  comics: Comic[];
  addComic: (comicData: NewComic, originalFile: QueuedFile) => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  actions: RecentAction[];
  logAction: (type: RecentAction['type'], message: string, undo?: UndoPayload) => void;
  lastUndoableAction: RecentAction | null;
  undoLastAction: () => void;
  addMockFiles: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let fileIdCounter = 0;
let comicIdCounter = 0;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<RecentAction[]>([]);

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
    removeFile(file.id);
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { skippedFile: file }
    });
  };

  const updateFile = (updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  const addComic = (comicData: NewComic, originalFile: QueuedFile) => {
    const newComic: Comic = {
      ...comicData,
      id: `comic-${comicIdCounter++}`,
      coverUrl: 'placeholder.svg'
    };
    setComics(prev => [newComic, ...prev]);
    logAction('success', `Organized '${originalFile.name}' as '${newComic.series} #${newComic.issue}'`, {
      type: 'ADD_COMIC',
      payload: { comicId: newComic.id, originalFile }
    });
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
    const newMockFiles: QueuedFile[] = [
      { id: `file-${fileIdCounter++}`, name: "Saga #1 (2012).cbr", path: "/incoming/Saga #1 (2012).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Batman The Knight #1 (2022).cbr", path: "/incoming/Batman The Knight #1 (2022).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "The Amazing Spider-Man #300 (1988).cbr", path: "/incoming/The Amazing Spider-Man #300 (1988).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Action Comics #1 (1938).cbr", path: "/incoming/Action Comics #1 (1938).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Radiant Black #1 (2021).cbr", path: "/incoming/Radiant Black #1 (2021).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Invincible #1 (2003).cbr", path: "/incoming/Invincible #1 (2003).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Monstress #1 (2015).cbr", path: "/incoming/Monstress #1 (2015).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Paper Girls #1 (2015).cbr", path: "/incoming/Paper Girls #1 (2015).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "The Wicked The Divine #1 (2014).cbr", path: "/incoming/The Wicked The Divine #1 (2014).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "East of West #1 (2013).cbr", path: "/incoming/East of West #1 (2013).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Unknown Comic.cbr", path: "/incoming/Unknown Comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
      { id: `file-${fileIdCounter++}`, name: "Another Unknown Comic.cbr", path: "/incoming/Another Unknown Comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
    ];
    addFiles(newMockFiles);
    logAction('info', `Added ${newMockFiles.length} mock files to the queue.`);
  }, [logAction]);

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, 
      isProcessing, startProcessing, pauseProcessing,
      actions, logAction,
      lastUndoableAction, undoLastAction,
      addMockFiles
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