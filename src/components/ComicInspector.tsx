import { useState } from "react";
import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tag, BookOpen } from "lucide-react";
import EditComicModal from "./EditComicModal";
import ComicReader from "./ComicReader";

interface ComicInspectorProps {
  comic: Comic;
}

const ComicInspector = ({ comic }: ComicInspectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l">
        <div className="p-4 border-b">
          <h3 className="font-semibold truncate">{comic.series} #{comic.issue}</h3>
          <p className="text-sm text-muted-foreground">{comic.year}</p>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted overflow-hidden">
            <img src={comic.coverUrl} alt="Cover" className="object-cover w-full h-full" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Publisher</span>
                <span>{comic.publisher}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume</span>
                <span>{comic.volume}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">
              {comic.summary || "No summary available."}
            </p>
          </div>
        </div>
        <div className="p-4 border-t mt-auto bg-background space-y-2">
          <Button className="w-full" onClick={() => setIsReaderOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Read Comic
          </Button>
          <Button className="w-full" variant="outline" onClick={() => setIsModalOpen(true)}>
            <Tag className="mr-2 h-4 w-4" /> Edit Metadata
          </Button>
        </div>
      </div>
      
      {isReaderOpen && (
        <ComicReader comic={comic} onClose={() => setIsReaderOpen(false)} />
      )}

      {isModalOpen && (
        <EditComicModal
          comic={comic}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default ComicInspector;