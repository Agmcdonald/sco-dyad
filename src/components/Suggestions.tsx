import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface Suggestion {
  label: string;
  value: string;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
}

const Suggestions = ({ suggestions }: SuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-start gap-2 mt-2">
      <Lightbulb className="h-4 w-4 text-yellow-500 mt-1.5" />
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2 mt-1">Suggestions:</span>
        {suggestions.map((suggestion) => (
          <Button key={suggestion.value} variant="outline" size="sm" className="h-auto py-1 px-2 text-xs">
            {suggestion.label}: <span className="font-semibold ml-1">{suggestion.value}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;