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
    },
    // Comic Vine rate limiting and processing methods
    checkRateLimit: (): Promise<{ canProceed: boolean; requestsRemaining: number; nextReset?: string }> => {
      return electronAPI.checkRateLimit();
    },
    incrementRateLimit: (): Promise<void> => {
      return electronAPI.incrementRateLimit();
    },
    getComicsForComicVineProcessing: (limit?: number): Promise<Comic[]> => {
      return electronAPI.getComicsForComicVineProcessing(limit);
    },
    updateComicVineStatus: (comicId: string, status: string, fetchedAt?: string | null, retryAfter?: string | null): Promise<void> => {
      return electronAPI.updateComicVineStatus(comicId, status, fetchedAt, retryAfter);
    },
    getComicVineStats: (): Promise<{ pending: number; fetched: number; failed: number; skipped: number }> => {
      return electronAPI.getComicVineStats();
    },
    getComicsByComicVineStatus: (status: string, limit?: number): Promise<Comic[]> => {
      return electronAPI.getComicsByComicVineStatus(status, limit);
    },
    resetComicVineStatus: (comicIds: string[], newStatus?: string): Promise<number> => {
      return electronAPI.resetComicVineStatus(comicIds, newStatus);
    }
  };
};