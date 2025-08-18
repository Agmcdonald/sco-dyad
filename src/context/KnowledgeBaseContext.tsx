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
      const exists = prev.some(entry => 
        entry.series.toLowerCase() === newEntry.series.toLowerCase() && 
        entry.publisher.toLowerCase() === newEntry.publisher.toLowerCase()
      );
      
      if (exists) {
        return prev;
      }
      
      const updatedKb = [...prev, newEntry];
      saveKnowledgeBase(updatedKb); // Auto-save on update
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