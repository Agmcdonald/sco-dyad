import { useState, useCallback, useEffect } from 'react';
import { Comic } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { useActionLog } from '@/context/hooks/useActionLog';

export const useComicLibrary = () => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [hasLoggedEmpty, setHasLoggedEmpty] = useState(false);
  const databaseService = useElectronDatabaseService();
  const { logAction } = useActionLog(); // ✅ now internal

  const refreshComics = useCallback(async () => {
    if (!databaseService) return;

    try {
      const dbComics = await databaseService.getComics();
      const appComics = dbComics.map(dbComic => ({
        ...dbComic,
        dateAdded: new Date(dbComic.dateAdded),
        coverUrl: dbComic.coverUrl || '/placeholder.svg',
      }));
      setComics(appComics);

      if (appComics.length > 0 && comics.length === 0 && !hasLoggedEmpty) {
        logAction('info', `Loaded ${appComics.length} comics from database.`);
      }
    } catch (error) {
      console.error('Error refreshing comics from database:', error);
      logAction('error', 'Failed to refresh comics from database');
    }
  }, [databaseService, comics.length, hasLoggedEmpty, logAction]);

  useEffect(() => {
    const loadData = async () => {
      if (databaseService) {
        await refreshComics();
      } else if (!hasLoggedEmpty) {
        logAction('info', 'Database is empty. Add files to start your library.');
        setHasLoggedEmpty(true);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseService]);

  return { comics, setComics, refreshComics };
};