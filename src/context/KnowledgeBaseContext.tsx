import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComicKnowledge, CreatorKnowledge, KnowledgeBase, Creator } from '@/types';
import { useElectron } from '@/hooks/useElectron';
import defaultKnowledgeBase from '@/data/comicsKnowledge.json';

interface KnowledgeBaseContextType {
  knowledgeBase: KnowledgeBase;
  addToKnowledgeBase: (entry: ComicKnowledge) => void;
  replaceKnowledgeBase: (entries: ComicKnowledge[]) => Promise<void>;
  saveKnowledgeBase: () => Promise<void>;
  replaceCreators: (creators: CreatorKnowledge[]) => Promise<void>;
  addCreatorsToKnowledgeBase: (creators: Creator[]) => void;
}

const emptyKB: KnowledgeBase = { series: [], creators: [] };

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(emptyKB);
  const { isElectron, electronAPI } = useElectron();

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      let data: any;
      if (isElectron && electronAPI) {
        try {
          data = await electronAPI.getKnowledgeBase();
        } catch (error) {
          console.error("Failed to load knowledge base from Electron:", error);
          data = defaultKnowledgeBase;
        }
      } else {
        data = defaultKnowledgeBase;
      }

      if (Array.isArray(data)) {
        setKnowledgeBase({ series: data, creators: [] });
      } else if (data && typeof data === 'object' && (data.series || data.creators)) {
        setKnowledgeBase({ series: data.series || [], creators: data.creators || [] });
      } else {
        setKnowledgeBase(emptyKB);
      }
    };
    loadKnowledgeBase();
  }, [isElectron, electronAPI]);

  const persistKnowledgeBase = useCallback(async (kb: KnowledgeBase) => {
    setKnowledgeBase(kb);
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveKnowledgeBase(kb);
      } catch (err) {
        console.error("Failed to save knowledge base via Electron:", err);
      }
    }
  }, [isElectron, electronAPI]);

  const normalizeStr = (s?: string | null) => (s || "").trim().toLowerCase();

  const replaceKnowledgeBase = useCallback(async (entries: ComicKnowledge[]) => {
    const map = new Map<string, ComicKnowledge>();
    for (const rawEntry of entries) {
      const seriesKey = normalizeStr(rawEntry.series);
      const normalizedEntry: ComicKnowledge = {
        series: (rawEntry.series || "").trim(),
        publisher: (rawEntry.publisher || "Unknown Publisher").trim(),
        startYear: Number(rawEntry.startYear) || new Date().getFullYear(),
        volumes: (rawEntry.volumes || []).map(v => ({
          volume: String((v as any).volume || "").trim(),
          year: Number((v as any).year) || Number(rawEntry.startYear) || new Date().getFullYear()
        }))
      };

      if (map.has(seriesKey)) {
        const existing = map.get(seriesKey)!;
        if (normalizedEntry.startYear < (existing.startYear || Number.MAX_SAFE_INTEGER)) {
          existing.startYear = normalizedEntry.startYear;
        }
        if (normalizedEntry.publisher) existing.publisher = normalizedEntry.publisher;
        const existingSet = new Set(existing.volumes.map(v => normalizeStr(v.volume)));
        for (const vol of normalizedEntry.volumes) {
          const volKey = normalizeStr(vol.volume);
          if (!existingSet.has(volKey)) {
            existing.volumes.push(vol);
            existingSet.add(volKey);
          }
        }
      } else {
        map.set(seriesKey, normalizedEntry);
      }
    }
    const finalSeries = Array.from(map.values());
    await persistKnowledgeBase({ ...knowledgeBase, series: finalSeries });
  }, [knowledgeBase, persistKnowledgeBase]);

  const addToKnowledgeBase = useCallback((newEntry: ComicKnowledge) => {
    setKnowledgeBase(prev => {
      const updatedSeries = [...prev.series];
      const normalizedNewSeries = normalizeStr(newEntry.series);
      const existingEntryIndex = updatedSeries.findIndex(entry => normalizeStr(entry.series) === normalizedNewSeries);

      const normalizedEntry: ComicKnowledge = {
        series: (newEntry.series || "").trim(),
        publisher: (newEntry.publisher || "Unknown Publisher").trim(),
        startYear: Number(newEntry.startYear) || new Date().getFullYear(),
        volumes: (newEntry.volumes || []).map(v => ({
          volume: String((v as any).volume || "").trim(),
          year: Number((v as any).year) || Number(newEntry.startYear) || new Date().getFullYear()
        }))
      };

      if (existingEntryIndex > -1) {
        const existingEntry = { ...updatedSeries[existingEntryIndex] };
        existingEntry.publisher = normalizedEntry.publisher || existingEntry.publisher;
        if (normalizedEntry.startYear && (!existingEntry.startYear || normalizedEntry.startYear < existingEntry.startYear)) {
          existingEntry.startYear = normalizedEntry.startYear;
        }
        existingEntry.volumes = existingEntry.volumes ? [...existingEntry.volumes] : [];
        const existingVolumeSet = new Set(existingEntry.volumes.map(v => normalizeStr((v as any).volume)));
        (normalizedEntry.volumes || []).forEach(v => {
          const volStr = normalizeStr((v as any).volume);
          if (!existingVolumeSet.has(volStr)) {
            existingEntry.volumes.push({
              volume: String((v as any).volume || "").trim(),
              year: Number((v as any).year) || normalizedEntry.startYear || new Date().getFullYear()
            });
            existingVolumeSet.add(volStr);
          }
        });
        updatedSeries[existingEntryIndex] = existingEntry;
      } else {
        updatedSeries.push(normalizedEntry);
      }
      
      const newKb = { ...prev, series: updatedSeries };
      persistKnowledgeBase(newKb);
      return newKb;
    });
  }, [persistKnowledgeBase]);

  const addCreatorsToKnowledgeBase = useCallback((newCreators: Creator[]) => {
    if (!newCreators || newCreators.length === 0) return;

    setKnowledgeBase(prev => {
      const updatedCreators = [...prev.creators];
      const existingCreatorNames = new Set(updatedCreators.map(c => normalizeStr(c.name)));
      let wasChanged = false;

      for (const creator of newCreators) {
        const normalizedName = normalizeStr(creator.name);
        if (normalizedName && !existingCreatorNames.has(normalizedName)) {
          updatedCreators.push({
            id: `creator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: creator.name.trim(),
            roles: [creator.role.trim()],
            notes: "",
          });
          existingCreatorNames.add(normalizedName);
          wasChanged = true;
        }
      }

      if (wasChanged) {
        const newKb = { ...prev, creators: updatedCreators };
        persistKnowledgeBase(newKb);
        return newKb;
      }
      
      return prev;
    });
  }, [persistKnowledgeBase]);

  const replaceCreators = useCallback(async (creators: CreatorKnowledge[]) => {
    const map = new Map<string, CreatorKnowledge>();
    for (const creator of creators) {
      const key = normalizeStr(creator.name);
      if (!map.has(key)) {
        map.set(key, creator);
      }
    }
    const finalCreators = Array.from(map.values());
    await persistKnowledgeBase({ ...knowledgeBase, creators: finalCreators });
  }, [knowledgeBase, persistKnowledgeBase]);

  const saveKnowledgeBase = useCallback(async () => {
    await persistKnowledgeBase(knowledgeBase);
  }, [knowledgeBase, persistKnowledgeBase]);

  return (
    <KnowledgeBaseContext.Provider value={{ knowledgeBase, addToKnowledgeBase, replaceKnowledgeBase, saveKnowledgeBase, replaceCreators, addCreatorsToKnowledgeBase }}>
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