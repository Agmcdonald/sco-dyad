import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { getCoverUrl } from "@/lib/cover";

interface NextIssuePreviewProps {
  nextComic: Comic;
  onReadNext: () => void;
}

const NextIssuePreview = ({ nextComic, onReadNext }: NextIssuePreviewProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-muted/50">
      <Card className="max-w-sm w-full shadow-xl animate-in fade-in-0 zoom-in-95">
        <CardHeader>
          <CardTitle>Up Next</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-48 mx-auto aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-lg">
            <img
              src={getCoverUrl(nextComic.coverUrl)}
              alt={`Cover for ${nextComic.series} #${nextComic.issue}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{nextComic.series} #{nextComic.issue}</h3>
            <p className="text-sm text-muted-foreground">{nextComic.publisher} ({nextComic.year})</p>
          </div>
          <Button onClick={onReadNext} className="w-full">
            Read Next Issue <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NextIssuePreview;