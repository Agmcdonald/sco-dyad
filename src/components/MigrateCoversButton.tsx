"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Database } from "lucide-react";
import { useElectron } from "@/hooks/useElectron";
import { showError, showSuccess } from "@/utils/toast";

const MigrateCoversButton: React.FC = () => {
  const { electronAPI, isElectron } = useElectron();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!isElectron || !electronAPI) {
      showError("Migration is only available in the desktop application.");
      return;
    }

    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const res = await electronAPI.migrateCovers();
      setReport(res);
      setOpen(true);
      showSuccess(`Migration complete: updated ${res.updated} / ${res.total}`);
    } catch (err: any) {
      console.error("Covers migration failed:", err);
      setError(err?.message || String(err));
      setOpen(true);
      showError("Covers migration failed. See console for details.");
    } finally {
      setRunning(false);
    }
  };

  const renderReport = () => {
    if (error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle />
            <div className="font-medium">Migration Failed</div>
          </div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      );
    }

    if (!report) {
      return <div className="text-sm text-muted-foreground">No report available.</div>;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Covers Migration Report</div>
            <div className="text-xs text-muted-foreground">Summary of canonicalization</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 border rounded">
            <div className="text-xs text-muted-foreground">Total Comics</div>
            <div className="font-semibold">{report.total}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-xs text-muted-foreground">Updated</div>
            <div className="font-semibold text-green-600">{report.updated}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-xs text-muted-foreground">Skipped</div>
            <div className="font-semibold">{report.skipped}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="font-semibold text-red-600">{report.failed}</div>
          </div>
        </div>

        {report.updatedIds && report.updatedIds.length > 0 && (
          <Card>
            <CardContent>
              <div className="text-sm font-medium mb-2">Sample Updated IDs</div>
              <div className="text-xs text-muted-foreground break-words">{report.updatedIds.slice(0, 20).join(", ")}</div>
              {report.updatedIds.length > 20 && <div className="text-xs text-muted-foreground mt-2">...and {report.updatedIds.length - 20} more</div>}
            </CardContent>
          </Card>
        )}

        {report.failedIds && report.failedIds.length > 0 && (
          <Card>
            <CardContent>
              <div className="text-sm font-medium mb-2 text-red-600">Sample Failed IDs</div>
              <div className="text-xs text-muted-foreground break-words">{report.failedIds.slice(0, 20).join(", ")}</div>
              {report.failedIds.length > 20 && <div className="text-xs text-muted-foreground mt-2">...and {report.failedIds.length - 20} more</div>}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setOpen(true)}>
          View Migration Status
        </Button>
        <Button onClick={handleRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Run Covers Migration
        </Button>
      </div>

      <Dialog open={open} onOpenChange={() => setOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5" />
              <DialogTitle>Run Covers Migration</DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-4">
            <div className="mb-4 text-sm text-muted-foreground">
              This will attempt to canonicalize legacy or stale cover paths to the app covers directory and replace missing covers with a placeholder. It is safe to run multiple times.
            </div>

            {running ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <div>Migration in progress… this may take a few moments.</div>
              </div>
            ) : (
              renderReport()
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
              <Button onClick={handleRun} disabled={running}>
                {running ? "Running..." : "Run Migration"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MigrateCoversButton;