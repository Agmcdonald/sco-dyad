"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import type { ComicKnowledge } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

const emptyEntry = (): ComicKnowledge => ({
  series: "",
  publisher: "",
  startYear: new Date().getFullYear(),
  volumes: [],
});

const KBEditor = () => {
  const { knowledgeBase, addToKnowledgeBase, saveKnowledgeBase } = useKnowledgeBase();
  const [localKB, setLocalKB] = useState<ComicKnowledge[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalKB(knowledgeBase.map(k => ({ ...k, volumes: k.volumes ? [...k.volumes] : [] })));
  }, [knowledgeBase]);

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

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Persist each entry into knowledge base via addToKnowledgeBase (which merges/updates)
      for (const entry of localKB) {
        if (!entry.series || entry.series.trim() === "") continue;
        // Ensure volumes normalized
        const normalized = {
          ...entry,
          series: entry.series.trim(),
          publisher: entry.publisher?.trim() || "Unknown Publisher",
          startYear: Number(entry.startYear) || new Date().getFullYear(),
          volumes: (entry.volumes || []).map(v => ({
            volume: String(v.volume || ""),
            year: Number((v as any).year) || new Date().getFullYear()
          }))
        };
        addToKnowledgeBase(normalized);
      }
      await saveKnowledgeBase();
      showSuccess("Knowledge base saved.");
    } catch (err) {
      console.error("KB save failed:", err);
      showError("Failed to save knowledge base.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Knowledge Base Editor</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={addEntry} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Entry
          </Button>
          <Button onClick={handleSaveAll} size="sm" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" /> Save All
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {localKB.length === 0 && (
              <div className="text-sm text-muted-foreground p-4">Knowledge base is empty.</div>
            )}
            {localKB.map((entry, idx) => (
              <div key={idx} className="border rounded-md p-4 bg-background">
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
                    <Button size="sm" variant="ghost" onClick={() => addVolume(idx)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Volume
                    </Button>
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
            ))}
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