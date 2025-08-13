import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Suggestions from "./Suggestions";

interface LearningCardProps {
  fileName: string;
  coverUrl?: string;
}

const mockSuggestions = [
    { label: "Series", value: "The Amazing Spider-Man" },
    { label: "Publisher", value: "Marvel Comics" },
    { label: "Year", value: "1963" },
];

const LearningCard = ({ fileName, coverUrl }: LearningCardProps) => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{fileName}</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} alt={fileName} className="object-cover w-full h-full rounded-lg" />
            ) : (
              <span className="text-sm text-muted-foreground">No Preview</span>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="publisher">Publisher</Label>
              <Input id="publisher" placeholder="e.g., DC Comics" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="series">Series</Label>
              <Input id="series" placeholder="e.g., Batman" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="volume">Volume</Label>
              <Input id="volume" placeholder="e.g., 2016" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="issue">Issue</Label>
              <Input id="issue" placeholder="e.g., 125" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year">Year</Label>
              <Input id="year" placeholder="e.g., 2022" />
            </div>
          </div>
          <Suggestions suggestions={mockSuggestions} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Skip</Button>
        <Button>Save Mapping</Button>
      </CardFooter>
    </Card>
  );
};

export default LearningCard;