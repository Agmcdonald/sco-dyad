import { createContext, useContext, ReactNode } from 'react';
import { Comic, QueuedFile, RecentAction, ActionType, UndoableAction } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import useLocalStorage from '@/hooks/useLocalStorage';
import { showSuccess } from '@/utils/toast';

const initialComics: Comic[] = [
  { id: 1, coverUrl: "/placeholder.svg", series: "Saga", issue: "61", year: 2023, publisher: "Image Comics", volume: "1", summary: "The award-winning series returns with a new issue." },
  { id: 2, coverUrl: "/placeholder.svg", series: "Batman: The Knight", issue: "3", year: 2022, publisher: "DC Comics", volume: "2022", summary: "Bruce Wayne's training continues." },
  { id: 3, coverUrl: "/placeholder.svg", series: "Weird Comic", issue: "4", year: 2021, publisher: "Indie", volume: "2", summary: "Things get even weirder." },
  { id: 4, coverUrl: "/placeholder.svg", series: "The Amazing Spider-Man", issue: "1", year: 1963, publisher: "Marvel Comics", volume: "1963", summary: "The first appearance of Spider-Man in his own series." },
  { id: 5, coverUrl: "/placeholder.svg", series: "Action Comics", issue: "1", year: 1938, publisher: "DC Comics", volume: "1938", summary: "The first appearance of Superman." },
  { id: 6, coverUrl: "/placeholder.svg", series: "Detective Comics", issue: "27", year: 1939, publisher: "DC Comics", volume: "1939", summary: "The first appearance of Batman." },
];

const initialFiles: QueuedFile[] = [
  { id: 1, name: "Radiant Black 01.cbz", path: "/comics/incoming/Radiant Black 01.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 2, name: "Invincible_v1_001.cbr", path: "/comics/incoming/Invincible_v1_001.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 3, name: "Monstress-001.cbz", path: "/comics/incoming/Monstress-001.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 4, name: "Paper Girls #1.zip", path: "/comics/incoming/Paper Girls #1.zip", series: "Paper Girls", issue: "1", year: 2015, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 5, name: "WicDiv_1.cbz", path: "/comics/incoming/The Wicked + The Divine/WicDiv_1.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 6, name: "East of West 01 (2013).cbr", path: "/comics/incoming/East of West 01 (2013).cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
  { id: 7, name: "Corrupted_File.cbz", path: "/comics/incoming/Corrupted_File.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
];

const mockFilesToAdd: QueuedFile[] = [
    { id: 100, name: "BlackScience_01.cbr", path: "/comics/incoming/BlackScience_01.cbr", series: "Black Science", issue: "1", year: 2013, publisher: "Image Comics", confidence: "High", status: "Pending" },
    { id: 101, name: "DeadlyClass_v1_1.cbz", path: "/comics/incoming/DeadlyClass_v1_1.cbz", series: "Deadly Class", issue: "1", year: 2014, publisher: "Image Comics", confidence: "Medium", status: "Pending" },
    { id: 102, name: "unknown_comic.cbr", path: "/comics/incoming/unknown_comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: "Warning", status: "Pending" },
];

interface AppContextType {
  comics: Comic[];
  files: QueuedFile[];
  recentActions: RecentAction[];
  logAction: (type: ActionType, text: string, undoableAction?: UndoableAction) => void;
  addComic: (comicData: Omit<Comic, 'id' | 'coverUrl'>, originalFile: QueuedFile) => void;
  updateComic: (updatedComic: Comic) => void;
  updateFile: (updatedFile: QueuedFile) => void;
  setFiles: React.Dispatch<React.SetStateAction<QueuedFile[]>>;
  removeFile: (fileId: number, reason?: 'skip') => void;
  addMockFiles: () => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
  lastUndoableAction: UndoableAction;
  undoLastAction: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [comics, setComics] = useLocalStorage<Comic[]>('comics', initialComics);
  const [files, setFiles] = useLocalStorage<QueuedFile[]>('files', initialFiles);
  const [recentActions, setRecentActions] = useLocalStorage<RecentAction[]>('recentActions', []);
  const [isProcessing, setIsProcessing] = useLocalStorage('isProcessing', false);
  const [lastUndoableAction, setLastUndoableAction] = useLocalStorage<UndoableAction>('lastUndoableAction', null);

  const logAction = (type: ActionType, text: string, undoableAction: UndoableAction = null) => {
    const newAction: RecentAction = {
      id: Date.now(),
      type,
      text,
      time: formatDistanceToNow(new Date(), { addSuffix: true }),
    };
    setRecentActions(prev => [newAction, ...prev].slice(0, 5));
    if (undoableAction) {
      setLastUndoableAction(undoableAction);
    }
  };

  const addComic = (comicData: Omit<Comic, 'id' | 'coverUrl'>, originalFile: QueuedFile) => {
    const newComic = { ...comicData, id: Date.now(), coverUrl: '/placeholder.svg' };
    setComics(prev => [...prev, newComic]);
    logAction('success', `Moved '${originalFile.name}' to Library.`, { type: 'ADD_COMIC', comicId: newComic.id, originalFile });
  };

  const updateComic = (updatedComic: Comic) => {
    setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
    logAction('info', `Updated metadata for '${updatedComic.series} #${updatedComic.issue}'.`);
  };

  const updateFile = (updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };
  
  const removeFile = (fileId: number, reason?: 'skip') => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove && reason === 'skip') {
      logAction('info', `Skipped file: ${fileToRemove.name}`, { type: 'SKIP_FILE', skippedFile: fileToRemove });
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const addMockFiles = () => {
    setFiles(prev => {
        const newFiles = mockFilesToAdd.map((file, index) => ({
            ...file,
            id: Date.now() + index
        }));
        return [...prev, ...newFiles];
    });
    logAction('info', `Added ${mockFilesToAdd.length} files to the queue.`);
  };

  const startProcessing = () => setIsProcessing(true);
  const pauseProcessing = () => setIsProcessing(false);

  const undoLastAction = () => {
    if (!lastUndoableAction) return;

    if (lastUndoableAction.type === 'ADD_COMIC') {
      setComics(prev => prev.filter(c => c.id !== lastUndoableAction.comicId));
      setFiles(prev => [lastUndoableAction.originalFile, ...prev]);
      showSuccess("Action undone: Comic returned to queue.");
    } else if (lastUndoableAction.type === 'SKIP_FILE') {
      setFiles(prev => [lastUndoableAction.skippedFile, ...prev]);
      showSuccess("Action undone: Skipped file returned to queue.");
    }

    setLastUndoableAction(null);
    // Clear the log entry for the undone action
    setRecentActions(prev => prev.slice(1));
  };

  const value = {
    comics,
    files,
    recentActions,
    logAction,
    addComic,
    updateComic,
    updateFile,
    setFiles,
    removeFile,
    addMockFiles,
    isProcessing,
    startProcessing,
    pauseProcessing,
    lastUndoableAction,
    undoLastAction,
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
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};