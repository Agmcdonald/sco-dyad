import { useEffect } from "react";
import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { getCoverUrl } from "@/lib/cover";

interface NextIssuePreviewProps {
  nextComic: Comic;
  onReadNext: () => void;
  onGoBack?: () => void;
}

const NextIssuePreview = ({ nextComic, onReadNext, onGoBack }: NextIssuePreviewProps) => {
  const coverSrc = getCoverUrl(nextComic.coverUrl, nextComic.filePath);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onReadNext();
      }
      if (e.key === "ArrowLeft" && onGoBack) {
        e.preventDefault();
        onGoBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReadNext, onGoBack]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            📖 Story Complete!
          </Badge>
          <h1 className="text-3xl font-bold">Ready for the next issue?</h1>
          <p className="text-muted-foreground">
            Continue your reading journey with the next comic in the series.
          </p>
        </div>
        
        <Card className="overflow-hidden shadow-2xl border-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2">
              <span>Up Next</span>
              <ArrowRight className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="w-56 h-80 bg-muted rounded-xl overflow-hidden shadow-lg ring-2 ring-primary/20">
              <img
                src={coverSrc}
                alt={`Cover for ${nextComic.series} #${nextComic.issue}`}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl">{nextComic.series} #{nextComic.issue}</h3>
              <p className="text-muted-foreground">{nextComic.publisher} • {nextComic.year}</p>
              {nextComic.summary && (
                <p className="text-sm text-muted-foreground line-clamp-3 max-w-md">
                  {nextComic.summary}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 pt-6">
            {onGoBack && (
              <Button variant="outline" className="flex-1" onClick={onGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            <Button className="flex-1" onClick={onReadNext}>
              Continue Reading
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd> or{" "}
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> to continue
          </p>
          {onGoBack && (
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd> to go back
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextIssuePreview;