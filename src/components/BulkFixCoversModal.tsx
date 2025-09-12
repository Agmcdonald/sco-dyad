import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  ImageIcon, 
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useElectron } from "@/hooks/useElectron";
import { showSuccess, showError } from "@/utils/toast";

interface BulkFixCoversModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComics: string[];
  comics: Comic[];
}

const BulkFixCoversModal = ({ isOpen, onClose, selectedComics, comics }: BulkFixCoversModalProps) => {
  const { updateComic } = useAppContext();
  const { isElectron, electronAPI } = useElectron();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentComic, setCurrentComic] = useState("");
  const [results, setResults] = useState<{ success: number; failed: number; total: number } | null>(null);

  const selectedComicObjects = comics.filter(c => selectedComics.includes(c.id));

  const handleBulkFixCovers = async () => {
    if (!isElectron || !electronAPI) {
      showError("Bulk cover fixing is only available in the desktop app.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentComic("");
    setResults(null);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedComicObjects.length; i++) {
      const comic = selectedComicObjects[i];
      setCurrentComic(`${comic.series} #${comic.issue}`);
      setProgress(((i + 1) / selectedComicObjects.length) * 100);

      if (comic.filePath) {
        try {
          console.log(`[BULK-FIX-COVERS] Re-extracting cover for: ${comic.filePath}`);
          const newCoverUrl = await electronAPI.extractCover(comic.filePath);
          const updatedComic = { ...comic, coverUrl: newCoverUrl };
          await updateComic(updatedComic);
          successCount++;
          console.log(`[BULK-FIX-COVERS] Successfully updated cover for: ${comic.series} #${comic.issue}`);
        } catch (error) {
          console.error(`[BULK-FIX-COVERS] Failed to fix cover for ${comic.series} #${comic.issue}:`, error);
          failedCount++;
        }
      } else {
        console.warn(`[BULK-FIX-COVERS] No file path for comic: ${comic.series} #${comic.issue}`);
        failedCount++;
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setResults({
      success: successCount,
      failed: failedCount,
      total: selectedComicObjects.length
    });

    setIsProcessing(false);
    setCurrentComic("");
    setProgress(100);

    if (successCount > 0) {
      showSuccess(`Successfully fixed covers for ${successCount} out of ${selectedComicObjects.length} comics.`);
    }
    if (failedCount > 0) {
      showError(`Failed to fix covers for ${failedCount} comics.`);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setResults(null);
      setProgress(0);
      setCurrentComic("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Bulk Fix Covers
          </DialogTitle>
          <DialogDescription>
            Re-extract covers from the original comic files for {selectedComics.length} selected comics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isElectron ? (
            <div className="text-center py-8">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-500 font-medium">Desktop App Required</p>
              <p className="text-xs text-muted-foreground mt-2">
                This feature is only available in the desktop application.
              </p>
            </div>
          ) : isProcessing ? (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">Processing covers...</p>
                <p className="text-xs text-muted-foreground">{currentComic}</p>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          ) : results ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Bulk Cover Fix Complete</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 border rounded-lg">
                  <div className="text-lg font-bold text-green-600">{results.success}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-lg font-bold text-red-600">{results.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-lg font-bold">{results.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Re-extract Covers</h4>
                <p className="text-sm text-muted-foreground">
                  This will re-extract covers from the original comic files for all selected comics. 
                  This process may take a few minutes depending on the number of comics.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedComics.length} comic{selectedComics.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button 
              onClick={handleBulkFixCovers} 
              disabled={!isElectron || isProcessing || selectedComics.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fix {selectedComics.length} Covers
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkFixCoversModal;