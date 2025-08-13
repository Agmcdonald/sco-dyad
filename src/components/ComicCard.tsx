import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardFooter } from "@/components/ui/card";

interface Comic {
  id: number;
  coverUrl: string;
  series: string;
  issue: string;
  year: number;
}

interface ComicCardProps {
  comic: Comic;
}

const ComicCard = ({ comic }: ComicCardProps) => {
  return (
    <Card className="overflow-hidden transition-transform duration-200 hover:scale-105 hover:shadow-lg">
      <AspectRatio ratio={2 / 3}>
        <img
          src={comic.coverUrl}
          alt={`${comic.series} #${comic.issue}`}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <CardFooter className="p-3">
        <div>
          <p className="font-semibold truncate">{comic.series}</p>
          <p className="text-sm text-muted-foreground">
            Issue #{comic.issue} ({comic.year})
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ComicCard;