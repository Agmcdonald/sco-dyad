import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { getCoverUrl } from "@/lib/cover";

interface NextIssuePreviewProps {
  nextComic: Comic;
  onReadNext: () => void;
}

const NextIssuePreview = ({ nextComic, onReadNext }: NextIssuePreviewProps) => {
  const coverSrc = getCoverUrl(nextComic.coverUrl);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle>Next Issue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="w-48 h-72 bg-muted rounded-lg overflow-hidden shadow-lg">
            <img
              src={coverSrc}
              alt={`Cover for ${nextComic.series} #${nextComic.issue}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{nextComic.series} #{nextComic.issue}</h3>
            <p className="text-sm text-muted-foreground">{nextComic.publisher} ({nextComic.year})</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onReadNext}>
            Read Next Issue <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NextIssuePreview;