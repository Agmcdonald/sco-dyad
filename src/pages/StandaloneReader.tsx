import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import ComicReader from "@/components/ComicReader";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const StandaloneReader = () => {
  const { comics } = useAppContext();
  const [searchParams] = useSearchParams();
  const [comic, setComic] = useState<Comic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const comicId = searchParams.get("comicId");
    if (comicId) {
      // The comics list might not be populated immediately when the new window opens.
      // We need to wait for it to be available.
      if (comics.length > 0) {
        const foundComic = comics.find((c) => c.id === comicId);
        if (foundComic) {
          setComic(foundComic);
        }
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [searchParams, comics]);

  const handleClose = () => {
    window.close(); // This will close the Electron browser window
  };

  if (isLoading && comics.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading comic library...</p>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold mb-2">Comic Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The requested comic could not be found. It may have been removed.
        </p>
        <Button onClick={handleClose}>Close Window</Button>
      </div>
    );
  }

  return <ComicReader comic={comic} onClose={handleClose} />;
};

export default StandaloneReader;