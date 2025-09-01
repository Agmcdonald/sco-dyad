import { useElectron } from '@/hooks/useElectron';
import { Comic, NewComic } from '@/types';

export const useElectronDatabaseService = () => {
  const { electronAPI } = useElectron();

  if (!electronAPI) {
    return null;
  }

  return {
    saveComic: (comic: NewComic): Promise<Comic> => {
      return electronAPI.saveComic(comic);
    },
    getComics: (): Promise<Comic[]> => {
      return electronAPI.getComics();
    },
    updateComic: (comic: Comic): Promise<Comic> => {
      return electronAPI.updateComic(comic);
    },
    batchUpdateComics: (updates: (Partial<Comic> & { id: string })[]): Promise<number> => {
      return electronAPI.batchUpdateComics(updates);
    },
    deleteComic: (comicId: string, filePath?: string): Promise<boolean> => {
      return electronAPI.deleteComic(comicId, filePath);
    },
    importComics: (comics: Comic[]): Promise<{ added: number; skipped: number }> => {
      return electronAPI.importComics(comics);
    }
  };
};