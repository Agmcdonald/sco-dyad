import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardFooter } from "@/components/ui/card";
import { useSelection } from "@/context/SelectionContext";
import { Comic } from "@/types";
import { cn } from "@/lib/utils";

interface ComicCardProps {
  comic: Comic;
}

const ComicCard = ({ comic }: ComicCardProps) => {
  const { selectedItem, setSelectedItem } = useSelection();

  const isSelected = selectedItem?.type === 'comic' && selectedItem.id === comic.id;

  const handleClick = () => {
    if (isSelected) {
      setSelectedItem(null); // Allow deselecting
    } else {
      setSelectedItem({ ...comic, type: 'comic' });
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-lg scale-105"
      )}
      onClick={handleClick}
    >
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