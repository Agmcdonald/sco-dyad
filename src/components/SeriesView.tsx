import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Comic } from "@/types";
import ComicCard from "./ComicCard";

interface SeriesGroup {
  series: string;
  publisher: string;
  comics: Comic[];
  totalIssues: number;
  yearRange: string;
}

interface SeriesViewProps {
  comics: Comic[];
}

const SeriesView = ({ comics }: SeriesViewProps) => {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  // Group comics by series
  const seriesGroups: SeriesGroup[] = Object.values(
    comics.reduce((acc, comic) => {
      const key = `${comic.series}-${comic.publisher}`;
      if (!acc[key]) {
        acc[key] = {
          series: comic.series,
          publisher: comic.publisher,
          comics: [],
          totalIssues: 0,
          yearRange: "",
        };
      }
      acc[key].comics.push(comic);
      return acc;
    }, {} as Record<string, SeriesGroup>)
  ).map(group => {
    const years = group.comics.map(c => c.year).sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    
    return {
      ...group,
      totalIssues: group.comics.length,
      yearRange: minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`,
      comics: group.comics.sort((a, b) => parseInt(a.issue) - parseInt(b.issue))
    };
  }).sort((a, b) => a.series.localeCompare(b.series));

  const toggleSeries = (seriesKey: string) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesKey)) {
      newExpanded.delete(seriesKey);
    } else {
      newExpanded.add(seriesKey);
    }
    setExpandedSeries(newExpanded);
  };

  if (seriesGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center rounded-lg border-2 border-dashed border-muted-foreground/50 p-12">
        <h3 className="text-lg font-semibold">No Comics Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seriesGroups.map((group) => {
        const seriesKey = `${group.series}-${group.publisher}`;
        const isExpanded = expandedSeries.has(seriesKey);
        
        return (
          <Card key={seriesKey}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSeries(seriesKey)}
                    className="p-1 h-auto"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <CardTitle className="text-lg">{group.series}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.publisher} • {group.yearRange}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {group.totalIssues} issue{group.totalIssues !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                  {group.comics.map((comic) => (
                    <ComicCard key={comic.id} comic={comic} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default SeriesView;