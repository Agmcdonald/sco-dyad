import { useState, useCallback } from 'react';
import { QueuedFile } from '@/types';

let fileIdCounter = 0;

export const useFileQueue = () => {
  const [files, setFiles] = useState<QueuedFile[]>([]);

  const addFiles = useCallback((newFiles: QueuedFile[]) => {
    const filesWithIds = newFiles.map(f => ({ ...f, id: f.id || `file-${fileIdCounter++}` }));
    setFiles(prev => [...prev, ...filesWithIds]);
  }, []);

  const addFile = useCallback((file: QueuedFile) => {
    addFiles([file]);
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateFile = useCallback((updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  }, []);

  return { files, setFiles, addFile, addFiles, removeFile, updateFile };
};