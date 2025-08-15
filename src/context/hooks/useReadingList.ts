import { useState } from 'react';
import { ReadingListItem, Comic } from '@/types';
import { showSuccess } from '@/utils/toast';

export const useReadingList = () => {
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);

  const addToReadingList = (comic: Comic) => {
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
      dateAdded: new Date()
    };
    setReadingList(prev => [newItem, ...prev]);
    showSuccess(`Added "${newItem.title}" to reading list.`);
  };

  const removeFromReadingList = (itemId: string) => {
    setReadingList(prev => prev.filter(item => item.id !== itemId));
    showSuccess("Removed from reading list");
  };

  const toggleReadingItemCompleted = (itemId: string) => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    const item = readingList.find(i => i.id === itemId);
    if (item && !item.completed) {
      showSuccess(`Marked "${item.title}" as read!`);
    }
  };

  const setReadingItemPriority = (itemId: string, priority: 'low' | 'medium' | 'high') => {
    setReadingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, priority } : item
    ));
  };

  return { readingList, setReadingList, addToReadingList, removeFromReadingList, toggleReadingItemCompleted, setReadingItemPriority };
};