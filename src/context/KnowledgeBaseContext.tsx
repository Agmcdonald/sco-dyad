import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComicKnowledge } from '@/types';
import { useElectron } from '@/hooks/useElectron';
import defaultKnowledgeBase from '@/data/comicsKnowledge.json';

interface KnowledgeBaseContextType {
  knowledgeBase: ComicKnowledge[];
  addToKnowledgeBase: (entry: ComicKnowledge) => void;
  replaceKnowledgeBase: (entries: ComicKnowledge[]) => Promise<void>;
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

  // Helper to normalize strings for comparison
  const normalizeStr = (s?: string | null) => (s || "").trim().toLowerCase();

  // Persist helper that writes the provided KB to disk (or via Electron)
  const persistKnowledgeBase = useCallback(async (kb: ComicKnowledge[]) => {
    const normalized = kb.map(entry => ({
      series: (entry.series || "").trim(),
      publisher: (entry.publisher || "Unknown Publisher").trim(),
      startYear: Number(entry.startYear) || new Date().getFullYear(),
      volumes: (entry.volumes || []).map(v => ({
        volume: String((v as any).volume || "").trim(),
        year: Number((v as any).year) || Number(entry.startYear) || new Date().getFullYear()
      }))
    }));
    setKnowledgeBase(normalized);
    if (isElectron && electronAPI) {
      try {
        await electronAPI.saveKnowledgeBase(normalized);
      } catch (err) {
        console.error("Failed to save knowledge base via Electron:", err);
      }
    }
  }, [isElectron, electronAPI]);

  // Replace entire knowledge base (used when saving editor state). This supports deletions.
  const replaceKnowledgeBase = useCallback(async (entries: ComicKnowledge[]) => {
    // Deduplicate by normalized series and merge volumes for the same series
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
        // choose earliest startYear
        if (normalizedEntry.startYear < (existing.startYear || Number.MAX_SAFE_INTEGER)) {
          existing.startYear = normalizedEntry.startYear;
        }
        // overwrite publisher if provided (trimmed)
        if (normalizedEntry.publisher) existing.publisher = normalizedEntry.publisher;

        // merge volumes deduped by normalized volume string
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

    const finalKb = Array.from(map.values());
    await persistKnowledgeBase(finalKb);
  }, [persistKnowledgeBase]);

  // Add or merge a single entry (keeps previous incremental behavior)
  const addToKnowledgeBase = useCallback((newEntry: ComicKnowledge) => {
    setKnowledgeBase(prev => {
      const updatedKb = [...prev];

      // Normalize series for matching (trim + case-insensitive)
      const normalizedNewSeries = normalizeStr(newEntry.series);

      const existingEntryIndex = updatedKb.findIndex(entry => normalizeStr(entry.series) === normalizedNewSeries);

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
        // Merge into existing entry
        const existingEntry = { ...updatedKb[existingEntryIndex] };

        // Overwrite publisher (but keep trimmed)
        existingEntry.publisher = normalizedEntry.publisher || existingEntry.publisher;

        // Update startYear to the earliest known
        if (normalizedEntry.startYear && (!existingEntry.startYear || normalizedEntry.startYear < existingEntry.startYear)) {
          existingEntry.startYear = normalizedEntry.startYear;
        }

        // Ensure volumes array exists
        existingEntry.volumes = existingEntry.volumes ? [...existingEntry.volumes] : [];

        // Append all volumes from newEntry that don't already exist (compare normalized)
        const existingVolumeSet = new Set(
          existingEntry.volumes.map(v => normalizeStr((v as any).volume))
        );

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

        // Save back
        updatedKb[existingEntryIndex] = existingEntry;
      } else {
        // New series: push normalized entry
        updatedKb.push(normalizedEntry);
      }

      // Persist the updated KB
      persistKnowledgeBase(updatedKb);
      return updatedKb;
    });
  }, [persistKnowledgeBase]);

  const saveKnowledgeBase = useCallback(async () => {
    await persistKnowledgeBase(knowledgeBase);
  }, [knowledgeBase, persistKnowledgeBase]);

  return (
    <KnowledgeBaseContext.Provider value={{ knowledgeBase, addToKnowledgeBase, replaceKnowledgeBase, saveKnowledgeBase }}>
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