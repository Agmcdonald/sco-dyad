import { useState } from 'react';
import { ReadingListItem, Comic } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useReadingList = () => {
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);

  const addToReadingList = (comic: Comic) => {
    if (readingList.some(item => item.comicId === comic.id)) {
      showError(`"${comic.series} #${comic.issue}" is already in your reading list.`);
      return;
    }

    const newItem: ReadingListItem = {
      id: `rl-${Date.now()}`,
      comicId: comic.id,
      title: `${comic.series} #${comic.issue}`,
      series: comic.series,
      issue: comic.issue,
      publisher: comic.publisher,
      year: comic.year,
      priority: 'medium',
      completed: false,
      dateAdded: new Date(),
      rating: comic.rating // Initialize with comic's current rating
    };
    setReadingList(prev => [newItem, ...prev]);
    showSuccess(`Added "${newItem.title}" to reading list.`);
  };

  const removeFromReadingList = (itemId: string) => {
    setReadingList(prev => prev.filter(item => item.id !== itemId));
    showSuccess("Removed from reading list");
  };

  const toggleReadingItemCompleted = (itemId: string) => {
    const item = readingList.find(i => i.id === itemId);
    if (item && !item.completed) {
      showSuccess(`Marked "${item.title}" as read!`);
    }
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { 
        ...item, 
        completed: !item.completed,
        dateCompleted: !item.completed ? new Date() : undefined
      } : item
    ));
  };

  const toggleComicReadStatus = (comic: Comic) => {
    const existingItem = readingList.find(item => item.comicId === comic.id);

    if (existingItem) {
      // Already in list, just toggle
      toggleReadingItemCompleted(existingItem.id);
    } else {
      // Not in list, add it and mark as read
      const newItem: ReadingListItem = {
        id: `rl-${Date.now()}`,
        comicId: comic.id,
        title: `${comic.series} #${comic.issue}`,
        series: comic.series,
        issue: comic.issue,
        publisher: comic.publisher,
        year: comic.year,
        priority: 'medium',
        completed: true,
        dateAdded: new Date(),
        dateCompleted: new Date(),
        rating: comic.rating
      };
      setReadingList(prev => [newItem, ...prev]);
      showSuccess(`Marked "${newItem.title}" as read!`);
    }
  };

  const setReadingItemPriority = (itemId: string, priority: 'low' | 'medium' | 'high') => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, priority } : item
    ));
  };

  const setReadingItemRating = (itemId: string, rating: number) => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, rating } : item
    ));
  };

  const syncReadingListWithComics = (comics: Comic[]) => {
    setReadingList(prev => prev.map(item => {
      const comic = comics.find(c => c.id === item.comicId);
      if (comic && comic.rating !== item.rating) {
        return { ...item, rating: comic.rating };
      }
      return item;
    }));
  };

  return { 
    readingList, 
    setReadingList, 
    addToReadingList, 
    removeFromReadingList, 
    toggleReadingItemCompleted, 
    setReadingItemPriority,
    setReadingItemRating,
    syncReadingListWithComics,
    toggleComicReadStatus
  };
};