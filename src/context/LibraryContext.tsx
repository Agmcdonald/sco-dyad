import { createContext, useState, useContext, ReactNode } from 'react';
import { Comic } from '@/types';

interface LibraryContextType {
  sortedComics: Comic[];
  setSortedComics: (comics: Comic[]) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const [sortedComics, setSortedComics] = useState<Comic[]>([]);

  return (
    <LibraryContext.Provider value={{ sortedComics, setSortedComics }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibraryContext = () => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibraryContext must be used within a LibraryProvider');
  }
  return context;
};