import { useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { RecentlyReadComic, Comic } from '@/types';

export const useRecentlyRead = () => {
  const [recentlyRead, setRecentlyRead] = useLocalStorage<RecentlyReadComic[]>('recentlyReadList', []);

  // This effect runs once on mount to parse date strings from localStorage
  useEffect(() => {
    const hasDateStrings = recentlyRead.some(item => typeof item.dateRead === 'string');
    if (hasDateStrings) {
      setRecentlyRead(prev => 
        prev.map(item => ({
          ...item,
          dateRead: new Date(item.dateRead), // Convert string back to Date object
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures it runs only once after initial load

  const updateReadingHistory = (comic: Comic, lastReadPage: number, totalPages: number) => {
    const progress = totalPages > 0 ? Math.round((lastReadPage / totalPages) * 100) : 0;
    const recentItem: RecentlyReadComic = {
      id: `recent-${comic.id}`,
      comicId: comic.id,
      title: `${comic.series} #${comic.issue}`,
      series: comic.series,
      issue: comic.issue,
      publisher: comic.publisher,
      year: comic.year,
      coverUrl: comic.coverUrl,
      dateRead: new Date(),
      rating: comic.rating,
      lastReadPage: lastReadPage,
      readProgress: progress,
    };

    setRecentlyRead(prev => {
      const parsedPrev = prev.map(item => ({
        ...item,
        dateRead: item.dateRead instanceof Date ? item.dateRead : new Date(item.dateRead),
      }));
      const filtered = parsedPrev.filter(item => item.comicId !== comic.id);
      return [recentItem, ...filtered].slice(0, 20);
    });
  };

  const updateRecentRating = (comicId: string, rating: number) => {
    setRecentlyRead(prev => prev.map(item => 
      item.comicId === comicId ? { ...item, rating } : item
    ));
  };

  const syncRecentlyReadWithComics = (comics: Comic[]) => {
    setRecentlyRead(prev => prev.map(item => {
      const comic = comics.find(c => c.id === item.comicId);
      if (comic && comic.rating !== item.rating) {
        return { ...item, rating: comic.rating };
      }
      return item;
    }));
  };

  return { recentlyRead, setRecentlyRead, updateReadingHistory, updateRecentRating, syncRecentlyReadWithComics };
};