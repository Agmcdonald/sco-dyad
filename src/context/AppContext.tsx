import { createContext, useState, useContext, ReactNode } from 'react';
import { Comic, QueuedFile } from '@/types';

const initialComics: Comic[] = [
  { id: 1, coverUrl: "/placeholder.svg", series: "Saga", issue: "61", year: 2023, publisher: "Image Comics", volume: "1", summary: "The award-winning series returns with a new issue." },
  { id: 2, coverUrl: "/placeholder.svg", series: "Batman: The Knight", issue: "3", year: 2022, publisher: "DC Comics", volume: "2022", summary: "Bruce Wayne's training continues." },
  { id: 3, coverUrl: "/placeholder.svg", series: "Weird Comic", issue: "4", year: 2021, publisher: "Indie", volume: "2", summary: "Things get even weirder." },
  { id: 4, coverUrl: "/placeholder.svg", series: "The Amazing Spider-Man", issue: "1", year: 1963, publisher: "Marvel Comics", volume: "1963", summary: "The first appearance of Spider-Man in his own series." },
  { id: 5, coverUrl: "/placeholder.svg", series: "Action Comics", issue: "1", year: 1938, publisher: "DC Comics", volume: "1938", summary: "The first appearance of Superman." },
  { id: 6, coverUrl: "/placeholder.svg", series: "Detective Comics", issue: "27", year: 1939, publisher: "DC Comics", volume: "1939", summary: "The first appearance of Batman." },
];

const initialFiles: QueuedFile[] = [
  { id: 1, name: "Radiant Black 01.cbz", series: "Radiant Black", issue: "1", year: 2021, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 2, name: "Invincible_v1_001.cbr", series: "Invincible", issue: "1", year: 2003, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 3, name: "Monstress-001.cbz", series: "Monstress", issue: "1", year: 2015, publisher: "Image Comics", confidence: "Medium", status: "Pending" },
  { id: 4, name: "Paper Girls #1.zip", series: "Paper Girls", issue: "1", year: 2015, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 5, name: "WicDiv_1.cbz", series: "The Wicked + The Divine", issue: "1", year: 2014, publisher: "Image Comics", confidence: "Low", status: "Pending" },
  { id: 6, name: "East of West 01 (2013).cbr", series: "East of West", issue: "1", year: 2013, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 7, name: "Corrupted_File.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
];

const mockFilesToAdd: QueuedFile[] = [
    { id: 100, name: "BlackScience_01.cbr", series: "Black Science", issue: "1", year: 2013, publisher: "Image Comics", confidence: "High", status: "Pending" },
    { id: 101, name: "DeadlyClass_v1_1.cbz", series: "Deadly Class", issue: "1", year: 2014, publisher: "Image Comics", confidence: "Medium", status: "Pending" },
    { id: 102, name: "unknown_comic.cbr", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Warning" },
];

interface AppContextType {
  comics: Comic[];
  files: QueuedFile[];
  addComic: (comicData: Omit<Comic, 'id' | 'coverUrl'>) => void;
  updateComic: (updatedComic: Comic) => void;
  updateFile: (updatedFile: QueuedFile) => void;
  setFiles: React.Dispatch<React.SetStateAction<QueuedFile[]>>;
  removeFile: (fileId: number) => void;
  addMockFiles: () => void;
  isProcessing: boolean;
  startProcessing: () => void;
  pauseProcessing: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [files, setFiles] = useState<QueuedFile[]>(initialFiles);
  const [isProcessing, setIsProcessing] = useState(false);

  const addComic = (comicData: Omit<Comic, 'id' | 'coverUrl'>) => {
    setComics(prev => [...prev, { ...comicData, id: Date.now(), coverUrl: '/placeholder.svg' }]);
  };

  const updateComic = (updatedComic: Comic) => {
    setComics(prev => prev.map(c => c.id === updatedComic.id ? updatedComic : c));
  };

  const updateFile = (updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };
  
  const removeFile = (fileId: number) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const addMockFiles = () => {
    setFiles(prev => {
        const newFiles = mockFilesToAdd.map((file, index) => ({
            ...file,
            id: Date.now() + index // Ensure unique IDs
        }));
        return [...prev, ...newFiles];
    });
  };

  const startProcessing = () => setIsProcessing(true);
  const pauseProcessing = () => setIsProcessing(false);

  const value = {
    comics,
    files,
    addComic,
    updateComic,
    updateFile,
    setFiles,
    removeFile,
    addMockFiles,
    isProcessing,
    startProcessing,
    pauseProcessing,
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