/**
 * Knowledge Base Context
 * 
 * This context manages the local database of comic series and creator information.
 * The knowledge base is used by the smart processor to intelligently match and
 * enrich metadata for comic files.
 * 
 * Features:
 * - Loads a default knowledge base from JSON files
 * - Loads and persists a user-specific knowledge base in Electron
 * - Merges default and user knowledge bases
 * - Provides functions to add, replace, and save knowledge base entries
 * - Automatically grows as users map new comics
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComicKnowledge, CreatorKnowledge, KnowledgeBase, Creator } from '@/types';
import { useElectron } from '@/hooks/useElectron';
import defaultSeriesKB from '@/data/comicsKnowledge.json';
import defaultCreatorsKB from '@/data/creatorsKnowledge.json';

/**
 * Knowledge Base Context Interface
 * Defines the state and actions provided by the context
 */
interface KnowledgeBaseContextType {
  knowledgeBase: KnowledgeBase;
  addToKnowledgeBase: (entry: ComicKnowledge) => void;
  replaceKnowledgeBase: (entries: ComicKnowledge[]) => Promise<void>;
  saveKnowledgeBase: () => Promise<void>;
  replaceCreators: (creators: CreatorKnowledge[]) => Promise<void>;
  addCreatorsToKnowledgeBase: (creators: Creator[]) => void;
}

// Initial empty state for the knowledge base
const emptyKB: KnowledgeBase = { series: [], creators: [] };

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

/**
 * Knowledge Base Provider Component
 * Provides the knowledge base state and management functions to its children
 */
export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(emptyKB);
  const { isElectron, electronAPI } = useElectron();

  /**
   * Load knowledge base on component mount
   * - In Electron, loads from user's data directory
   * - In web mode, loads from bundled JSON files
   * - Merges user data with bundled defaults
   */
  useEffect(() => {
    const loadKnowledgeBase = async () => {
      let data: any;

      if (isElectron && electronAPI) {
        try {
          data = await electronAPI.getKnowledgeBase();
        } catch (error) {
          console.error("Failed to load knowledge base from Electron:", error);
        }
      }

      // If not in Electron or load failed, use bundled defaults
      if (!data) {
        const series = Array.isArray(defaultSeriesKB) ? defaultSeriesKB : (defaultSeriesKB as any).series || [];
        const creators = Array.isArray(defaultCreatorsKB) ? defaultCreatorsKB : (defaultCreatorsKB as any).creators || defaultCreatorsKB;
        data = { series, creators };
      }

      // Normalize data structure
      if (Array.isArray(data)) {
        setKnowledgeBase({ series: data, creators: [] });
      } else if (data && typeof data === 'object') {
        setKnowledgeBase({ series: data.series || [], creators: data.creators || [] });
      } else {
        setKnowledgeBase(emptyKB);
      }
    };
    loadKnowledgeBase();
  }, [isElectron, electronAPI]);

  /**
   * Persist knowledge base to disk (Electron only)
   * Updates local state and saves to user's data directory
   */
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

  // Helper to normalize strings for comparison
  const normalizeStr = (s?: string | null) => (s || "").trim().toLowerCase();

  /**
   * Replace the entire series knowledge base
   * Deduplicates and normalizes entries before saving
   */
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

      // Merge with existing entries in the map
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

  /**
   * Add or update a single series entry in the knowledge base
   * Merges with existing entries to prevent duplicates
   */
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
        // Update existing entry
        const existingEntry = { ...updatedSeries[existingEntryIndex] };
        existingEntry.publisher = normalizedEntry.publisher || existingEntry.publisher;
        if (normalizedEntry.startYear && (!existingEntry.startYear || normalizedEntry.startYear < existingEntry.startYear)) {
          existingEntry.startYear = normalizedEntry.startYear;
        }
        existingEntry.volumes = existingEntry.volumes ? [...existingEntry.volumes] : [];
        const existingVolumeSet = new Set(existingEntry.volumes.map(v => normalizeStr(v.volume)));
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
        // Add new entry
        updatedSeries.push(normalizedEntry);
      }
      
      const newKb = { ...prev, series: updatedSeries };
      persistKnowledgeBase(newKb);
      return newKb;
    });
  }, [persistKnowledgeBase]);

  /**
   * Add new creators to the knowledge base
   * Skips duplicates based on name
   */
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

  /**
   * Replace the entire creators knowledge base
   * Deduplicates and normalizes entries before saving
   */
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

  /**
   * Manually trigger a save of the current knowledge base state
   */
  const saveKnowledgeBase = useCallback(async () => {
    await persistKnowledgeBase(knowledgeBase);
  }, [knowledgeBase, persistKnowledgeBase]);

  return (
    <KnowledgeBaseContext.Provider value={{ knowledgeBase, addToKnowledgeBase, replaceKnowledgeBase, saveKnowledgeBase, replaceCreators, addCreatorsToKnowledgeBase }}>
      {children}
    </KnowledgeBaseContext.Provider>
  );
};

/**
 * Hook to access the knowledge base context
 * Must be used within a KnowledgeBaseProvider
 */
export const useKnowledgeBase = () => {
  const context = useContext(KnowledgeBaseContext);
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};