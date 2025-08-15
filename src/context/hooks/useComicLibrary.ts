import { useState, useCallback, useEffect } from 'react';
import { Comic } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';

export const useComicLibrary = (logAction: (type: any, message: string) => void) => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [hasLoggedEmpty, setHasLoggedEmpty] = useState(false);
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
        
        // Only log if there's a meaningful change and we haven't logged before
        if (appComics.length > 0 && comics.length === 0 && !hasLoggedEmpty) {
          logAction('info', `Loaded ${appComics.length} comics from database.`);
        }
      } catch (error) {
        console.error('Error refreshing comics from database:', error);
      }
    }
  }, [databaseService, comics.length, hasLoggedEmpty, logAction]);

  useEffect(() => {
    const loadData = async () => {
      if (databaseService) {
        await refreshComics();
      } else if (!hasLoggedEmpty) {
        // Only log empty database message once
        logAction('info', 'Database is empty. Add files to start your library.');
        setHasLoggedEmpty(true);
      }
    };
    loadData();
  }, [databaseService, refreshComics, hasLoggedEmpty, logAction]);

  return { comics, setComics, refreshComics };
};