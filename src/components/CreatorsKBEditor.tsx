"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, Search as SearchIcon } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import type { CreatorKnowledge } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { MultiSelect } from "./ui/multi-select";
import { creatorRoles } from "@/lib/constants";

const emptyCreator = (): CreatorKnowledge => ({
  id: `creator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "",
  roles: [],
  notes: "",
});

const normalize = (s: string | undefined | null) => (s || "").trim().toLowerCase();

const roleOptions = creatorRoles.map(role => ({ value: role, label: role }));

const CreatorsKBEditor = () => {
  const { knowledgeBase, replaceCreators } = useKnowledgeBase();
  const [localCreators, setLocalCreators] = useState<CreatorKnowledge[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLocalCreators(knowledgeBase.creators.map(c => ({ ...c, roles: [...c.roles] })));
  }, [knowledgeBase.creators]);

  const updateCreator = (index: number, patch: Partial<CreatorKnowledge>) => {
    setLocalCreators(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const addCreator = () => {
    setLocalCreators(prev => [emptyCreator(), ...prev]);
  };

  const removeCreator = (index: number) => {
    setLocalCreators(prev => prev.filter((_, i) => i !== index));
  };

  const filtered = localCreators.filter(creator => {
    const q = normalize(query);
    if (!q) return true;
    const inName = normalize(creator.name).includes(q);
    const inRoles = creator.roles.some(role => normalize(role).includes(q));
    return inName || inRoles;
  });

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const validCreators = localCreators.filter(c => c.name && c.name.trim() !== "");
      await replaceCreators(validCreators);
      showSuccess("Creators knowledge base saved.");
    } catch (err) {
      console.error("Creators KB save failed:", err);
      showError("Failed to save creators knowledge base.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Creators Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={addCreator} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Creator
            </Button>
            <Button onClick={handleSaveAll} size="sm" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> Save All
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or role..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Badge className="ml-2">{filtered.length} matches</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground p-4">
                {localCreators.length === 0 ? "No creators defined." : "No creators match your search."}
              </div>
            )}

            {filtered.map((creator, idx) => {
              const originalIndex = localCreators.findIndex(c => c.id === creator.id);
              return (
                <div key={creator.id} className="border rounded-md p-4 bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Creator Name</label>
                        <Input value={creator.name} onChange={(e) => updateCreator(originalIndex, { name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Roles</label>
                        <MultiSelect
                          options={roleOptions}
                          selected={creator.roles}
                          onChange={(newRoles) => updateCreator(originalIndex, { roles: newRoles })}
                          placeholder="Select roles..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground">Notes</label>
                        <Textarea value={creator.notes} onChange={(e) => updateCreator(originalIndex, { notes: e.target.value })} className="h-16 resize-none" />
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeCreator(originalIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
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

export default CreatorsKBEditor;