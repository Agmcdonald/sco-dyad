import { useState, useCallback } from 'react';
import { RecentAction, UndoPayload } from '@/types';

let actionIdCounter = 0;

export const useActionLog = () => {
  const [actions, setActions] = useState<RecentAction[]>([]);

  const logAction = useCallback((type: RecentAction['type'], message: string, undo?: UndoPayload) => {
    const newAction: RecentAction = {
      id: actionIdCounter++,
      type,
      message,
      timestamp: new Date(),
      undo,
    };
    setActions(prev => [newAction, ...prev].slice(0, 20));
  }, []);

  return { actions, logAction, setActions };
};