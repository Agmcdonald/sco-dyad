import { useMemo } from 'react';
import { RecentlyReadComic, Comic } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';

export const useRecentlyRead = () => {
  const [storedRecentlyRead, setStoredRecentlyRead] = useLocalStorage<RecentlyReadComic[]>('recently-read-comics', []);

  const recentlyRead = useMemo(() => {
    if (!Array.isArray(storedRecentlyRead)) return [];
    return storedRecentlyRead.map(item => ({
      ...item,
      dateRead: new Date(item.dateRead),
    }));
  }, [storedRecentlyRead]);

  const setRecentlyRead = (updater: React.SetStateAction<RecentlyReadComic[]>) => {
    if (typeof updater === 'function') {
      setStoredRecentlyRead(prev => {
        const parsedPrev = (prev || []).map(item => ({ ...item, dateRead: new Date(item.dateRead) }));
        return updater(parsedPrev);
      });
    } else {
      setStoredRecentlyRead(updater);
    }
  };

  const addToRecentlyRead = (comic: Comic, rating?: number) => {
    const recentItem: RecentlyReadComic = {
      id: `recent-${Date.now()}`,
      comicId: comic.id,
      title: `${comic.series} #${comic.issue}`,
      series: comic.series,
      issue: comic.issue,
      publisher: comic.publisher,
      year: comic.year,
      coverUrl: comic.coverUrl,
      dateRead: new Date(),
      rating: rating || comic.rating
    };

    setStoredRecentlyRead(prev => {
      const filtered = (prev || []).filter(item => item.comicId !== comic.id);
      return [recentItem, ...filtered].slice(0, 10);
    });
  };

  const updateRecentRating = (comicId: string, rating: number) => {
    setStoredRecentlyRead(prev => (prev || []).map(item => 
      item.comicId === comicId ? { ...item, rating } : item
    ));
  };

  const syncRecentlyReadWithComics = (comics: Comic[]) => {
    setStoredRecentlyRead(prev => (prev || []).map(item => {
      const comic = comics.find(c => c.id === item.comicId);
      if (comic && comic.rating !== item.rating) {
        return { ...item, rating: comic.rating };
      }
      return item;
    }));
  };

  return { recentlyRead, setRecentlyRead, addToRecentlyRead, updateRecentRating, syncRecentlyReadWithComics };
};