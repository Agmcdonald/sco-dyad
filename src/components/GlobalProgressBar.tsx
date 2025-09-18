import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const GlobalProgressBar = () => {
  const { isScanningMetadata, metadataScanProgress } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState("");
  const [displayProgress, setDisplayProgress] = useState(0);
  const [statusIcon, setStatusIcon] = useState<React.ElementType | null>(null);
  const [statusColor, setStatusColor] = useState("");

  useEffect(() => {
    if (isScanningMetadata) {
      setIsVisible(true);
      setStatusIcon(Loader2);
      setStatusColor("text-primary animate-spin");
      if (metadataScanProgress) {
        setDisplayMessage(
          `Scanning ${metadataScanProgress.processed} of ${metadataScanProgress.total} comics... (${metadataScanProgress.updated} updated)`
        );
        setDisplayProgress(
          (metadataScanProgress.processed / metadataScanProgress.total) * 100 || 0
        );
      } else {
        setDisplayMessage("Starting metadata scan...");
        setDisplayProgress(0);
      }
    } else if (metadataScanProgress && metadataScanProgress.total > 0 && metadataScanProgress.processed === metadataScanProgress.total) {
      // Operation just completed
      setIsVisible(true);
      if (metadataScanProgress.updated > 0) {
        setStatusIcon(CheckCircle);
        setStatusColor("text-green-500");
        setDisplayMessage(`Scan complete: ${metadataScanProgress.updated} comics updated.`);
      } else {
        setStatusIcon(CheckCircle);
        setStatusColor("text-muted-foreground");
        setDisplayMessage("Scan complete: No new metadata found.");
      }
      setDisplayProgress(100);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    } else {
      // No active scan and no recent completion to show
      setIsVisible(false);
    }
  }, [isScanningMetadata, metadataScanProgress]);

  if (!isVisible) return null;

  const Icon = statusIcon;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 w-80 transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <Card className="p-3 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className={cn("h-5 w-5", statusColor)} />}
          <span className="text-sm font-medium truncate">{displayMessage}</span>
        </div>
        <Progress value={displayProgress} className="h-2" />
      </Card>
    </div>
  );
};

export default GlobalProgressBar;