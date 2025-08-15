import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useElectron } from '@/hooks/useElectron';
import defaultKnowledgeBase from '@/data/comicsKnowledge.json';
import { showSuccess, showError } from '@/utils/toast';
import { ComicKnowledge } from '@/types';

interface KnowledgeBaseContextType {
  knowledgeBase: ComicKnowledge[];
  isLoading: boolean;
  updateKnowledgeBase: (updatedData: ComicKnowledge[]) => Promise<void>;
  addSeries: (newSeries: ComicKnowledge) => Promise<void>;
  updateSeries: (updatedSeries: ComicKnowledge, originalSeriesName: string) => Promise<void>;
  deleteSeries: (seriesName: string) => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
  const { isElectron, electronAPI } = useElectron();
  const [knowledgeBase, setKnowledgeBase] = useState<ComicKnowledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      setIsLoading(true);
      if (isElectron && electronAPI) {
        try {
          const userKnowledgeBase = await electronAPI.getKnowledgeBase();
          setKnowledgeBase(userKnowledgeBase);
        } catch (error) {
          console.error('Failed to load user knowledge base:', error);
          setKnowledgeBase(defaultKnowledgeBase as ComicKnowledge[]);
        }
      } else {
        // Web mode or Electron not ready, use default
        setKnowledgeBase(defaultKnowledgeBase as ComicKnowledge[]);
      }
      setIsLoading(false);
    };

    loadKnowledgeBase();
  }, [isElectron, electronAPI]);

  const updateKnowledgeBase = useCallback(async (updatedData: ComicKnowledge[]) => {
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveKnowledgeBase(updatedData);
        setKnowledgeBase(updatedData);
        showSuccess('Knowledge base updated successfully!');
      } catch (error) {
        showError('Failed to save knowledge base.');
        console.error('Error saving knowledge base:', error);
      }
    } else {
      // In web mode, this is a temporary update
      setKnowledgeBase(updatedData);
      showSuccess('Knowledge base updated for this session.');
    }
  }, [isElectron, electronAPI]);

  const addSeries = async (newSeries: ComicKnowledge) => {
    const updatedData = [...knowledgeBase, newSeries];
    await updateKnowledgeBase(updatedData);
  };

  const updateSeries = async (updatedSeries: ComicKnowledge, originalSeriesName: string) => {
    const updatedData = knowledgeBase.map(series => 
      series.series === originalSeriesName ? updatedSeries : series
    );
    await updateKnowledgeBase(updatedData);
  };

  const deleteSeries = async (seriesName: string) => {
    const updatedData = knowledgeBase.filter(series => series.series !== seriesName);
    await updateKnowledgeBase(updatedData);
  };

  return (
    <KnowledgeBaseContext.Provider value={{ 
      knowledgeBase, 
      isLoading, 
      updateKnowledgeBase,
      addSeries,
      updateSeries,
      deleteSeries
    }}>
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