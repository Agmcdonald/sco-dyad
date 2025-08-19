import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComicKnowledge } from '@/types';
import { useElectron } from '@/hooks/useElectron';
import defaultKnowledgeBase from '@/data/comicsKnowledge.json';

interface KnowledgeBaseContextType {
  knowledgeBase: ComicKnowledge[];
  addToKnowledgeBase: (entry: ComicKnowledge) => void;
  saveKnowledgeBase: () => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
  const [knowledgeBase, setKnowledgeBase] = useState<ComicKnowledge[]>([]);
  const { isElectron, electronAPI } = useElectron();

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      if (isElectron && electronAPI) {
        try {
          const data = await electronAPI.getKnowledgeBase();
          setKnowledgeBase(data);
        } catch (error) {
          console.error("Failed to load knowledge base from Electron:", error);
          setKnowledgeBase(defaultKnowledgeBase);
        }
      } else {
        // Web mode fallback
        setKnowledgeBase(defaultKnowledgeBase);
      }
    };
    loadKnowledgeBase();
  }, [isElectron, electronAPI]);

  const saveKnowledgeBase = useCallback(async (dataToSave: ComicKnowledge[]) => {
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveKnowledgeBase(dataToSave);
      } catch (error) {
        console.error("Failed to save knowledge base:", error);
      }
    }
  }, [isElectron, electronAPI]);

  const addToKnowledgeBase = useCallback((newEntry: ComicKnowledge) => {
    setKnowledgeBase(prev => {
      const updatedKb = [...prev];
      const existingEntryIndex = updatedKb.findIndex(entry => 
        entry.series.toLowerCase() === newEntry.series.toLowerCase()
      );

      if (existingEntryIndex > -1) {
        // Series exists, update it with new publisher/volume info
        const existingEntry = updatedKb[existingEntryIndex];
        existingEntry.publisher = newEntry.publisher; // Overwrite publisher
        if (newEntry.startYear < existingEntry.startYear) {
          existingEntry.startYear = newEntry.startYear;
        }
        const volumeExists = existingEntry.volumes.some(v => v.volume === newEntry.volumes[0].volume);
        if (!volumeExists) {
          existingEntry.volumes.push(newEntry.volumes[0]);
        }
        updatedKb[existingEntryIndex] = existingEntry;
      } else {
        // New series, add it
        updatedKb.push(newEntry);
      }
      
      saveKnowledgeBase(updatedKb);
      return updatedKb;
    });
  }, [saveKnowledgeBase]);

  return (
    <KnowledgeBaseContext.Provider value={{ knowledgeBase, addToKnowledgeBase, saveKnowledgeBase: () => saveKnowledgeBase(knowledgeBase) }}>
      {children}
    </KnowledgeBaseContext.Provider>
  );
};

export const useKnowledgeBase = () => {
  const context = useContext(KnowledgeBaseContext);
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};