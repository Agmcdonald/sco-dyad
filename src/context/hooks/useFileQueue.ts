import { useState, useCallback } from 'react';
import { QueuedFile } from '@/types';
import { useElectron } from '@/hooks/useElectron';
import { showSuccess, showError } from '@/utils/toast';

let fileIdCounter = 0;

export const useFileQueue = () => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const { isElectron, electronAPI } = useElectron();

  const addFiles = useCallback((newFiles: QueuedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const addFile = useCallback((file: QueuedFile) => {
    addFiles([file]);
  }, [addFiles]);

  const addFilesFromPaths = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    const filesWithInfo = await Promise.all(
      paths.map(async (path, index) => {
        const newFile: QueuedFile = {
          id: `file-${fileIdCounter++}-${index}`,
          name: path.split(/[\\/]/).pop() || 'Unknown File',
          path: path,
          series: null,
          issue: null,
          year: null,
          publisher: null,
          confidence: null,
          status: 'Pending',
        };

        if (isElectron && electronAPI) {
          try {
            const fileInfo = await electronAPI.readComicFile(path);
            newFile.pageCount = fileInfo?.pageCount || undefined;
          } catch (error) {
            console.warn(`Could not read info for ${newFile.name}:`, error);
          }
        }
        return newFile;
      })
    );

    addFiles(filesWithInfo);
    showSuccess(`Added ${filesWithInfo.length} comic file${filesWithInfo.length !== 1 ? 's' : ''} to queue`);
  }, [addFiles, isElectron, electronAPI]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateFile = useCallback((updatedFile: QueuedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  }, []);

  return { files, setFiles, addFile, addFiles, removeFile, updateFile, addFilesFromPaths };
};