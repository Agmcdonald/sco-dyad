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
      paths.map(async (filePath, index) => {
        // Safely extract filename from path
        const fileName = filePath ? filePath.split(/[\\/]/).pop() || 'Unknown File' : 'Unknown File';
        
        const newFile: QueuedFile = {
          id: `file-${fileIdCounter++}-${index}`,
          name: fileName,
          path: filePath || '',
          series: null,
          issue: null,
          year: null,
          publisher: null,
          volume: null,
          confidence: null,
          status: 'Pending',
        };

        if (isElectron && electronAPI && filePath) {
          try {
            const fileInfo = await electronAPI.readComicFile(filePath);
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