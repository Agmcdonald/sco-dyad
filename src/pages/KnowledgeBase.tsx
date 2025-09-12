"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SeriesKBEditor from "@/components/SeriesKBEditor";
import CreatorsKBEditor from "@/components/CreatorsKBEditor";

const KnowledgeBasePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Manage the data used by the smart processor to identify your comics.
        </p>
      </div>

      <Tabs defaultValue="series">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="series">Series & Publishers</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
        </TabsList>
        <TabsContent value="series" className="mt-4">
          <SeriesKBEditor />
        </TabsContent>
        <TabsContent value="creators" className="mt-4">
          <CreatorsKBEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeBasePage;