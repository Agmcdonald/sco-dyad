import { useState, useMemo } from "react";
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
  seriesCover: string; // URL of the cover to use for this series
}

interface SeriesViewProps {
  comics: Comic[];
  sortOption: string; // Add sortOption prop
}

const SeriesView = ({ comics, sortOption }: SeriesViewProps) => {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  // Group comics by series, then optionally by publisher
  const groupedData = useMemo(() => {
    // First group by series
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
            seriesCover: "/placeholder.svg",
          };
        }
        acc[key].comics.push(comic);
        return acc;
      }, {} as Record<string, SeriesGroup>)
    ).map(group => {
      const years = group.comics.map(c => c.year).sort((a, b) => a - b);
      const minYear = years[0];
      const maxYear = years[years.length - 1];
      
      // Find the designated series cover, or fall back to the first comic's cover
      const seriesCoverComic = group.comics.find(c => c.isSeriesCover) || group.comics[0];
      
      return {
        ...group,
        totalIssues: group.comics.length,
        yearRange: minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`,
        seriesCover: seriesCoverComic?.coverUrl || "/placeholder.svg",
        comics: group.comics.sort((a, b) => parseInt(a.issue) - parseInt(b.issue))
      };
    }).sort((a, b) => a.series.localeCompare(b.series));

    // If sorting by publisher, group series by publisher
    if (sortOption.startsWith('publisher-')) {
      const publisherGroups = seriesGroups.reduce((acc, seriesGroup) => {
        const publisher = seriesGroup.publisher;
        if (!acc[publisher]) {
          acc[publisher] = [];
        }
        acc[publisher].push(seriesGroup);
        return acc;
      }, {} as Record<string, SeriesGroup[]>);

      return Object.entries(publisherGroups)
        .sort(([a], [b]) => sortOption === 'publisher-asc' ? a.localeCompare(b) : b.localeCompare(a))
        .map(([publisher, series]) => ({ publisher, series }));
    }

    // For non-publisher sorting, return all series in one group
    return [{ publisher: null, series: seriesGroups }];
  }, [comics, sortOption]);

  const toggleSeries = (seriesKey: string) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesKey)) {
      newExpanded.delete(seriesKey);
    } else {
      newExpanded.add(seriesKey);
    }
    setExpandedSeries(newExpanded);
  };

  if (comics.length === 0) {
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
    <div className="space-y-6">
      {groupedData.map(({ publisher, series }, groupIndex) => (
        <div key={publisher || 'all'} className="space-y-4">
          {/* Publisher Header - only show when sorting by publisher */}
          {publisher && sortOption.startsWith('publisher-') && (
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold text-foreground">{publisher}</h2>
              <p className="text-sm text-muted-foreground">
                {series.length} series • {series.reduce((total, s) => total + s.totalIssues, 0)} comics
              </p>
            </div>
          )}

          {/* Series Cards */}
          <div className="space-y-4">
            {series.map((group) => {
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
                        
                        {/* Series Cover Thumbnail */}
                        <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={group.seriesCover} 
                            alt={`${group.series} cover`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        
                        <div>
                          <CardTitle className="text-lg">{group.series}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {/* Only show publisher if not already shown in header */}
                            {!sortOption.startsWith('publisher-') && `${group.publisher} • `}
                            {group.yearRange}
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
        </div>
      ))}
    </div>
  );
};

export default SeriesView;