"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, Search as SearchIcon, ChevronRight } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import type { ComicKnowledge } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

const emptyEntry = (): ComicKnowledge => ({
  series: "",
  publisher: "",
  startYear: new Date().getFullYear(),
  volumes: [],
});

const normalize = (s: string | undefined | null) => (s || "").trim().toLowerCase();

const KBEditor = () => {
  const { knowledgeBase, addToKnowledgeBase, replaceKnowledgeBase, saveKnowledgeBase } = useKnowledgeBase();
  const [localKB, setLocalKB] = useState<ComicKnowledge[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Search & filters
  const [query, setQuery] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [onlyWithVolumes, setOnlyWithVolumes] = useState(false);

  // Refs to entries for jump-to
  const entryRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [filteredIndexes, setFilteredIndexes] = useState<number[]>([]);
  const [currentJumpIndex, setCurrentJumpIndex] = useState<number>(-1);

  useEffect(() => {
    setLocalKB(knowledgeBase.series.map(k => ({ ...k, volumes: k.volumes ? [...k.volumes] : [] })));
  }, [knowledgeBase.series]);

  const updateEntry = (index: number, patch: Partial<ComicKnowledge>) => {
    setLocalKB(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const addEntry = () => {
    setLocalKB(prev => [emptyEntry(), ...prev]);
  };

  const removeEntry = (index: number) => {
    setLocalKB(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const addVolume = (index: number) => {
    setLocalKB(prev => {
      const copy = [...prev];
      const entry = { ...copy[index] };
      entry.volumes = entry.volumes ? [...entry.volumes, { volume: "", year: new Date().getFullYear() }] : [{ volume: "", year: new Date().getFullYear() }];
      copy[index] = entry;
      return copy;
    });
  };

  const updateVolume = (entryIndex: number, volIndex: number, patch: Partial<{ volume: string; year: number }>) => {
    setLocalKB(prev => {
      const copy = [...prev];
      const entry = { ...copy[entryIndex] };
      const vols = entry.volumes ? [...entry.volumes] : [];
      vols[volIndex] = { ...vols[volIndex], ...patch };
      entry.volumes = vols;
      copy[entryIndex] = entry;
      return copy;
    });
  };

  const removeVolume = (entryIndex: number, volIndex: number) => {
    setLocalKB(prev => {
      const copy = [...prev];
      const entry = { ...copy[entryIndex] };
      entry.volumes = (entry.volumes || []).filter((_, i) => i !== volIndex);
      copy[entryIndex] = entry;
      return copy;
    });
  };

  // Derived lists for filters
  const uniquePublishers = Array.from(new Set(localKB.map(e => e.publisher || "").filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(localKB.flatMap(e => (e.volumes || []).map(v => Number((v as any).year)).filter(Boolean)))).sort((a,b) => a - b);

  // Filtering logic
  const matchesEntry = (entry: ComicKnowledge) => {
    const q = normalize(query);
    if (q) {
      const inSeries = normalize(entry.series).includes(q);
      const inPublisher = normalize(entry.publisher).includes(q);
      if (!inSeries && !inPublisher) return false;
    }
    if (publisherFilter) {
      if (normalize(entry.publisher) !== normalize(publisherFilter)) return false;
    }
    if (yearFilter !== "") {
      // match either startYear or any volume year
      const vols = (entry.volumes || []).map(v => Number((v as any).year));
      const matchesYear = Number(entry.startYear) === Number(yearFilter) || vols.includes(Number(yearFilter));
      if (!matchesYear) return false;
    }
    if (onlyWithVolumes) {
      if (!entry.volumes || entry.volumes.length === 0) return false;
    }
    return true;
  };

  const filtered = localKB.map((e, i) => ({ entry: e, index: i })).filter(({ entry }) => matchesEntry(entry));
  const filteredOnlyEntries = filtered.map(f => f.entry);
  const filteredOnlyIndexes = filtered.map(f => f.index);

  useEffect(() => {
    setFilteredIndexes(filteredOnlyIndexes);
    // reset jump index when filters change
    setCurrentJumpIndex(filteredOnlyIndexes.length > 0 ? 0 : -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, publisherFilter, yearFilter, onlyWithVolumes, localKB]);

  const scrollToEntry = (idx: number) => {
    const el = entryRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        el.animate([{ background: "rgba(250,250,100,0.2)" }, { background: "transparent" }], { duration: 700 });
      } catch {}
    }
  };

  // Keyboard navigation (next/prev match)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if an input or textarea or contentEditable is focused
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
        return;
      }

      // Next: 'n' or 'j'
      if (e.key === 'n' || e.key === 'j') {
        e.preventDefault();
        if (filteredIndexes.length === 0) return;
        setCurrentJumpIndex(prev => {
          const next = prev < 0 ? 0 : (prev + 1) % filteredIndexes.length;
          // Scroll to corresponding real index
          const realIdx = filteredIndexes[next];
          scrollToEntry(realIdx);
          return next;
        });
      }

      // Previous: 'p' or 'k'
      if (e.key === 'p' || e.key === 'k') {
        e.preventDefault();
        if (filteredIndexes.length === 0) return;
        setCurrentJumpIndex(prev => {
          const next = prev < 0 ? filteredIndexes.length - 1 : (prev - 1 + filteredIndexes.length) % filteredIndexes.length;
          const realIdx = filteredIndexes[next];
          scrollToEntry(realIdx);
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredIndexes]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Build normalized local KB and dedupe volumes per series (case-insensitive)
      const map = new Map<string, ComicKnowledge>();
      for (const rawEntry of localKB) {
        if (!rawEntry.series || rawEntry.series.trim() === "") continue;
        const key = normalize(rawEntry.series);
        const normalizedEntry: ComicKnowledge = {
          series: (rawEntry.series || "").trim(),
          publisher: (rawEntry.publisher || "Unknown Publisher").trim(),
          startYear: Number(rawEntry.startYear) || new Date().getFullYear(),
          volumes: (rawEntry.volumes || []).map(v => ({
            volume: String((v as any).volume || "").trim(),
            year: Number((v as any).year) || Number(rawEntry.startYear) || new Date().getFullYear()
          }))
        };

        if (map.has(key)) {
          const existing = map.get(key)!;
          // earliest year
          if (normalizedEntry.startYear < (existing.startYear || Number.MAX_SAFE_INTEGER)) {
            existing.startYear = normalizedEntry.startYear;
          }
          // overwrite publisher if provided
          if (normalizedEntry.publisher) existing.publisher = normalizedEntry.publisher;
          // merge volumes deduped by normalized volume string
          const existingSet = new Set(existing.volumes.map(v => normalize(v.volume)));
          for (const vol of normalizedEntry.volumes) {
            const volKey = normalize(vol.volume);
            if (!existingSet.has(volKey)) {
              existing.volumes.push(vol);
              existingSet.add(volKey);
            }
          }
        } else {
          map.set(key, normalizedEntry);
        }
      }

      const finalKb = Array.from(map.values());
      // Replace entire persisted KB (this enables deletions)
      await replaceKnowledgeBase(finalKb);

      showSuccess("Knowledge base saved.");
    } catch (err) {
      console.error("KB save failed:", err);
      showError("Failed to save knowledge base.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick results: show top N matches with jump
  const quickResults = filteredOnlyEntries.slice(0, 8).map((entry, i) => {
    const originalIndex = filteredOnlyIndexes[i];
    return {
      label: `${entry.series} — ${entry.publisher || "Unknown"}`,
      index: originalIndex
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Knowledge Base Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={addEntry} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Entry
            </Button>
            <Button onClick={handleSaveAll} size="sm" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> Save All
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:gap-4">
          <div className="flex items-center gap-2 flex-1">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search series or publisher..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Badge className="ml-2">{filteredOnlyEntries.length} matches</Badge>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-sm"
            >
              <option value="">All publishers</option>
              {uniquePublishers.map(pub => <option key={pub} value={pub}>{pub}</option>)}
            </select>

            <select
              value={yearFilter === "" ? "" : String(yearFilter)}
              onChange={(e) => setYearFilter(e.target.value === "" ? "" : Number(e.target.value))}
              className="border rounded px-2 py-1 bg-background text-sm"
            >
              <option value="">Any year</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyWithVolumes} onChange={(e) => setOnlyWithVolumes(e.target.checked)} />
              With volumes
            </label>
          </div>
        </div>

        {/* Quick results */}
        <div className="flex gap-2 overflow-x-auto">
          {quickResults.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2">No quick results</div>
          ) : quickResults.map((r, i) => (
            <button
              key={i}
              onClick={() => scrollToEntry(r.index)}
              className="flex items-center gap-2 px-3 py-1 rounded border hover:bg-muted text-sm"
            >
              <ChevronRight className="h-3 w-3" />
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Keyboard: press "n" or "j" for next match, "p" or "k" for previous (when focus is outside inputs).</div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {localKB.length === 0 && (
              <div className="text-sm text-muted-foreground p-4">Knowledge base is empty.</div>
            )}

            {localKB.map((entry, idx) => {
              // if query/publisher/year filter excludes, hide entry
              if (!matchesEntry(entry)) return null;

              return (
                <div
                  key={idx}
                  ref={(el) => entryRefs.current[idx] = el}
                  className="border rounded-md p-4 bg-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Series</label>
                        <Input value={entry.series} onChange={(e) => updateEntry(idx, { series: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Publisher</label>
                        <Input value={entry.publisher} onChange={(e) => updateEntry(idx, { publisher: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Start Year</label>
                        <Input type="number" value={String(entry.startYear)} onChange={(e) => updateEntry(idx, { startYear: Number(e.target.value || new Date().getFullYear()) })} />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="text-xs">Volumes: {(entry.volumes || []).length}</Badge>
                      <Button variant="destructive" size="sm" onClick={() => removeEntry(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Volumes</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => addVolume(idx)}>
                          <Plus className="h-4 w-4 mr-2" /> Add Volume
                        </Button>
                      </div>
                    </div>

                    {(entry.volumes || []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">No volumes defined.</div>
                    ) : (
                      <div className="space-y-2">
                        {(entry.volumes || []).map((vol, vi) => (
                          <div key={vi} className="grid md:grid-cols-3 gap-2 items-center">
                            <Input placeholder="Volume" value={(vol as any).volume || ""} onChange={(e) => updateVolume(idx, vi, { volume: e.target.value })} />
                            <Input type="number" placeholder="Year" value={String((vol as any).year || "")} onChange={(e) => updateVolume(idx, vi, { year: Number(e.target.value || new Date().getFullYear()) })} />
                            <div className="flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => removeVolume(idx, vi)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredOnlyEntries.length === 0 && localKB.length > 0 && (
              <div className="text-sm text-muted-foreground p-4">No entries match your search/filter.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default KBEditor;