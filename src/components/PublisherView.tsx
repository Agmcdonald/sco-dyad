import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Comic } from "@/types";
import ComicCard from "./ComicCard";

interface PublisherGroup {
  publisher: string;
  comics: Comic[];
  totalIssues: number;
  seriesCount: number;
  yearRange: string;
}

interface SeriesGroup {
  series: string;
  comics: Comic[];
}

interface PublisherViewProps {
  comics: Comic[];
}

const PublisherView = ({ comics }: PublisherViewProps) => {
  const [expandedPublishers, setExpandedPublishers] = useState<Set<string>>(new Set());
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  // Group comics by publisher
  const publisherGroups: PublisherGroup[] = Object.values(
    comics.reduce((acc, comic) => {
      if (!acc[comic.publisher]) {
        acc[comic.publisher] = {
          publisher: comic.publisher,
          comics: [],
          totalIssues: 0,
          seriesCount: 0,
          yearRange: "",
        };
      }
      acc[comic.publisher].comics.push(comic);
      return acc;
    }, {} as Record<string, PublisherGroup>)
  ).map(group => {
    const years = group.comics.map(c => c.year).sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const uniqueSeries = new Set(group.comics.map(c => c.series));
    
    return {
      ...group,
      totalIssues: group.comics.length,
      seriesCount: uniqueSeries.size,
      yearRange: minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`,
      comics: group.comics.sort((a, b) => a.series.localeCompare(b.series))
    };
  }).sort((a, b) => a.publisher.localeCompare(b.publisher));

  const togglePublisher = (publisher: string) => {
    const newExpanded = new Set(expandedPublishers);
    if (newExpanded.has(publisher)) {
      newExpanded.delete(publisher);
      // Also collapse all series under this publisher
      const seriesToCollapse = publisherGroups
        .find(p => p.publisher === publisher)?.comics
        .map(c => `${publisher}-${c.series}`) || [];
      seriesToCollapse.forEach(seriesKey => {
        const newExpandedSeries = new Set(expandedSeries);
        newExpandedSeries.delete(seriesKey);
        setExpandedSeries(newExpandedSeries);
      });
    } else {
      newExpanded.add(publisher);
    }
    setExpandedPublishers(newExpanded);
  };

  const toggleSeries = (publisher: string, series: string) => {
    const seriesKey = `${publisher}-${series}`;
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesKey)) {
      newExpanded.delete(seriesKey);
    } else {
      newExpanded.add(seriesKey);
    }
    setExpandedSeries(newExpanded);
  };

  // Group comics by series within each publisher
  const getSeriesGroups = (publisherComics: Comic[]): SeriesGroup[] => {
    return Object.values(
      publisherComics.reduce((acc, comic) => {
        if (!acc[comic.series]) {
          acc[comic.series] = {
            series: comic.series,
            comics: []
          };
        }
        acc[comic.series].comics.push(comic);
        return acc;
      }, {} as Record<string, SeriesGroup>)
    ).map(group => ({
      ...group,
      comics: group.comics.sort((a, b) => parseInt(a.issue) - parseInt(b.issue))
    })).sort((a, b) => a.series.localeCompare(b.series));
  };

  if (publisherGroups.length === 0) {
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
      {publisherGroups.map((publisherGroup) => {
        const isPublisherExpanded = expandedPublishers.has(publisherGroup.publisher);
        const seriesGroups = getSeriesGroups(publisherGroup.comics);
        
        return (
          <Card key={publisherGroup.publisher}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublisher(publisherGroup.publisher)}
                    className="p-1 h-auto"
                  >
                    {isPublisherExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <CardTitle className="text-lg">{publisherGroup.publisher}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {publisherGroup.seriesCount} series • {publisherGroup.yearRange}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {publisherGroup.totalIssues} issue{publisherGroup.totalIssues !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            {isPublisherExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {seriesGroups.map((seriesGroup) => {
                    const seriesKey = `${publisherGroup.publisher}-${seriesGroup.series}`;
                    const isSeriesExpanded = expandedSeries.has(seriesKey);
                    
                    return (
                      <div key={seriesGroup.series} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSeries(publisherGroup.publisher, seriesGroup.series)}
                              className="p-1 h-auto"
                            >
                              {isSeriesExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                            <div>
                              <h4 className="font-medium">{seriesGroup.series}</h4>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {seriesGroup.comics.length} issue{seriesGroup.comics.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {isSeriesExpanded && (
                          <div className="p-3 pt-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                              {seriesGroup.comics.map((comic) => (
                                <ComicCard key={comic.id} comic={comic} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default PublisherView;