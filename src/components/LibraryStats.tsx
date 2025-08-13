import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

const LibraryStats = () => {
  const { comics } = useAppContext();

  // Calculate statistics
  const totalComics = comics.length;
  const publisherStats = comics.reduce((acc, comic) => {
    acc[comic.publisher] = (acc[comic.publisher] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const yearStats = comics.reduce((acc, comic) => {
    const decade = Math.floor(comic.year / 10) * 10;
    const decadeLabel = `${decade}s`;
    acc[decadeLabel] = (acc[decadeLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPublishers = Object.entries(publisherStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const topDecades = Object.entries(yearStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Library Statistics</CardTitle>
        <CardDescription>
          Breakdown of your comic collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Top Publishers</h4>
          <div className="flex flex-wrap gap-2">
            {topPublishers.map(([publisher, count]) => (
              <Badge key={publisher} variant="secondary">
                {publisher}: {count}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2">Popular Decades</h4>
          <div className="flex flex-wrap gap-2">
            {topDecades.map(([decade, count]) => (
              <Badge key={decade} variant="outline">
                {decade}: {count}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-2xl font-bold">{totalComics}</div>
          <div className="text-sm text-muted-foreground">Total Comics</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LibraryStats;