"use client";

import React from "react";
import KBEditor from "@/components/KBEditor";

const KnowledgeBasePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Edit series and publisher data used by the smart processor. Changes are saved to disk when running in the desktop (Electron) app.
        </p>
      </div>

      <KBEditor />
    </div>
  );
};

export default KnowledgeBasePage;