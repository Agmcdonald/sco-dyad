import { useState, useCallback, useEffect } from 'react';
import { Comic } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';

export const useComicLibrary = (logAction: (type: any, message: string) => void) => {
  const [comics, setComics] = useState<Comic[]>([]);
  const databaseService = useElectronDatabaseService();

  const refreshComics = useCallback(async () => {
    if (databaseService) {
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
      } catch (error) {
        console.error('Error refreshing comics from database:', error);
      }
    }
  }, [databaseService]);

  useEffect(() => {
    const loadData = async () => {
      if (databaseService) {
        await refreshComics();
        const currentComics = await databaseService.getComics();
        if (currentComics.length > 0) {
          logAction('info', `Loaded ${currentComics.length} comics from database.`);
        } else {
          logAction('info', 'Database is empty. Add files to start your library.');
        }
      }
    };
    loadData();
  }, [databaseService, refreshComics, logAction]);

  return { comics, setComics, refreshComics };
};