import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RATING_EMOJIS } from "@/lib/ratings";
import { cn } from "@/lib/utils";

interface RatingSelectorProps {
  currentRating?: number;
  onRatingChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const RatingSelector = ({ 
  currentRating, 
  onRatingChange, 
  size = "md",
  className 
}: RatingSelectorProps) => {
  const sizeClasses = {
    sm: "h-6 w-6 text-sm",
    md: "h-8 w-8 text-lg", 
    lg: "h-10 w-10 text-xl"
  };

  const handleRatingClick = (rating: number) => {
    console.log(`[RATING-SELECTOR] Clicked rating: ${rating}, current: ${currentRating}`);
    onRatingChange(rating);
  };

  return (
    <div className={cn("flex gap-1", className)}>
      {Object.entries(RATING_EMOJIS).map(([ratingValue, { emoji, label }]) => {
        const ratingNum = parseInt(ratingValue);
        const isSelected = currentRating === ratingNum;
        
        return (
          <Tooltip key={ratingValue}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  sizeClasses[size],
                  "p-0 transition-all duration-200 hover:scale-110",
                  isSelected && [
                    "bg-primary text-primary-foreground",
                    "ring-2 ring-primary ring-offset-2",
                    "scale-110 shadow-lg"
                  ],
                  !isSelected && "hover:bg-muted hover:text-foreground"
                )}
                onClick={() => handleRatingClick(ratingNum)}
                onMouseEnter={() => console.log(`[RATING-SELECTOR] Hover: ${label}`)}
              >
                {emoji}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm font-medium">{label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default RatingSelector;