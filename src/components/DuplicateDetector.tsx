import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";

interface DuplicateGroup {
  key: string;
  comics: Comic[];
  series: string;
  issue: string;
  publisher: string;
}

const DuplicateDetector = () => {
  const { comics, removeComic } = useAppContext();
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  useEffect(() => {
    // Find duplicates based on series, issue, and publisher
    const groups = comics.reduce((acc, comic) => {
      const key = `${comic.series.toLowerCase()}-${comic.issue}-${comic.publisher.toLowerCase()}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(comic);
      return acc;
    }, {} as Record<string, Comic[]>);

    const duplicateGroups = Object.entries(groups)
      .filter(([, comics]) => comics.length > 1)
      .map(([key, comics]) => ({
        key,
        comics,
        series: comics[0].series,
        issue: comics[0].issue,
        publisher: comics[0].publisher,
      }));

    setDuplicates(duplicateGroups);
  }, [comics]);

  const handleRemoveDuplicate = (comicId: string) => {
    removeComic(comicId);
  };

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Duplicate Detection
          </CardTitle>
          <CardDescription>
            No duplicates found in your library.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Duplicate Detection
        </CardTitle>
        <CardDescription>
          Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} in your library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {duplicates.map((group) => (
          <div key={group.key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">{group.series} #{group.issue}</h4>
                <p className="text-sm text-muted-foreground">{group.publisher}</p>
              </div>
              <Badge variant="destructive">
                {group.comics.length} copies
              </Badge>
            </div>
            <div className="space-y-2">
              {group.comics.map((comic, index) => (
                <div key={comic.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="text-sm">
                    <span className="font-medium">Copy {index + 1}</span>
                    <span className="text-muted-foreground ml-2">
                      Year: {comic.year}, Volume: {comic.volume}
                    </span>
                  </div>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveDuplicate(comic.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DuplicateDetector;