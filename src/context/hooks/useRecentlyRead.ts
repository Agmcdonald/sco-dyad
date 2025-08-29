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

    setRecentlyRead(prev => {
      // Ensure all dates in the previous state are Date objects before filtering
      const parsedPrev = prev.map(item => ({
        ...item,
        dateRead: item.dateRead instanceof Date ? item.dateRead : new Date(item.dateRead),
      }));
      const filtered = parsedPrev.filter(item => item.comicId !== comic.id);
      return [recentItem, ...filtered].slice(0, 10);
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

  return { recentlyRead, setRecentlyRead, addToRecentlyRead, updateRecentRating, syncRecentlyReadWithComics };
};