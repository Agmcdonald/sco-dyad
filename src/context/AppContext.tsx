import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface AppFile {
  id: string;
  name: string;
  path: string;
  size: number;
  status: 'Pending' | 'Success' | 'Warning' | 'Error';
  series?: string;
  issue?: string;
  year?: number;
  confidence?: 'High' | 'Low';
  publisher?: string;
  volume?: string;
  summary?: string;
}

export interface Comic {
  series: string;
  issue: string;
  year: number;
  publisher: string;
  volume: string;
  summary: string;
}

export type ActionType = 'ADD_COMIC' | 'SKIP_FILE';

export interface Action {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  undoable: boolean;
  undo?: {
    type: ActionType;
    payload: any;
  }
}

interface AppContextType {
  files: AppFile[];
  addFile: (file: AppFile) => void;
  addFiles: (files: AppFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (file: AppFile) => void;
  skipFile: (file: AppFile) => void;
  comics: Comic[];
  addComic: (comic: Comic, originalFile: AppFile) => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  actions: Action[];
  logAction: (type: Action['type'], message: string, undo?: Action['undo']) => void;
  lastUndoableAction: Action | null;
  undoLastAction: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);

  const logAction = useCallback((type: Action['type'], message: string, undo?: Action['undo']) => {
    const newAction: Action = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date(),
      undoable: !!undo,
      undo,
    };
    setActions(prev => [newAction, ...prev]);
  }, []);

  const addFile = (file: AppFile) => {
    setFiles(prev => [...prev, file]);
  };

  const addFiles = (newFiles: AppFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const skipFile = (file: AppFile) => {
    logAction('info', `Skipped file: ${file.name}`, {
      type: 'SKIP_FILE',
      payload: { file }
    });
    removeFile(file.id);
  };

  const updateFile = (updatedFile: AppFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  const addComic = (comic: Comic, originalFile: AppFile) => {
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

    logAction('info', `Undo: ${lastUndoableAction.message}`);
    setActions(prev => prev.map(a => a.id === lastUndoableAction.id ? { ...a, undoable: false } : a));
  };

  return (
    <AppContext.Provider value={{ 
      files, addFile, addFiles, removeFile, updateFile, skipFile,
      comics, addComic, 
      isProcessing, startProcessing, pauseProcessing,
      actions, logAction,
      lastUndoableAction, undoLastAction
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