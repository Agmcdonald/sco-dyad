import { useState } from 'react';
import { RecentlyReadComic, Comic } from '@/types';

export const useRecentlyRead = () => {
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadComic[]>([]);

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
      rating: rating || comic.rating // Use provided rating or comic's current rating
    };

    setRecentlyRead(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.comicId !== comic.id);
      // Add to front and keep only last 10
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