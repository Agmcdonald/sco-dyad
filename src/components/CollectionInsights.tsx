import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Building,
  Calendar,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";

const CollectionInsights = () => {
  const { comics } = useAppContext();

  const insights = useMemo(() => {
    if (comics.length === 0) return null;

    // Publisher analysis
    const publisherStats = comics.reduce((acc, comic) => {
      acc[comic.publisher] = (acc[comic.publisher] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPublishers = Object.entries(publisherStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Decade analysis
    const yearStats = comics.reduce((acc, comic) => {
      const decade = Math.floor(comic.year / 10) * 10;
      acc[decade] = (acc[decade] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Granular year analysis
    const comicsByYear = comics.reduce((acc, comic) => {
      acc[comic.year] = (acc[comic.year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const yearChartData = Object.entries(comicsByYear)
      .map(([year, count]) => ({ name: year, comics: count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // Series analysis
    const seriesStats = comics.reduce((acc, comic) => {
      acc[comic.series] = (acc[comic.series] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSeries = Object.entries(seriesStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Collection completeness (mock data for demonstration)
    const incompleteSeries = topSeries.filter(([, count]) => count < 5).length;
    const completenessScore =
      topSeries.length > 0
        ? Math.round(
            ((topSeries.length - incompleteSeries) / topSeries.length) * 100,
          )
        : 0;

    // Chart data
    const publisherChartData = topPublishers
      .map(([name, count]) => ({ name, comics: count }))
      .reverse();
    const decadeChartData = Object.entries(yearStats)
      .map(([name, count]) => ({ name: `${name}s`, comics: count }))
      .sort((a, b) => (a.name > b.name ? 1 : -1));

    return {
      totalComics: comics.length,
      totalSeries: Object.keys(seriesStats).length,
      totalPublishers: Object.keys(publisherStats).length,
      topSeries,
      completenessScore,
      avgIssuesPerSeries:
        Object.keys(seriesStats).length > 0
          ? Math.round(comics.length / Object.keys(seriesStats).length)
          : 0,
      publisherChartData,
      decadeChartData,
      yearChartData,
    };
  }, [comics]);

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Collection Insights
          </CardTitle>
          <CardDescription>
            Add some comics to see insights about your collection.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Collection Overview
          </CardTitle>
          <CardDescription>
            Key metrics and trends from your comic library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights.totalComics}
              </div>
              <div className="text-sm text-muted-foreground">Total Comics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {insights.totalSeries}
              </div>
              <div className="text-sm text-muted-foreground">Unique Series</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {insights.totalPublishers}
              </div>
              <div className="text-sm text-muted-foreground">Publishers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {insights.avgIssuesPerSeries}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Issues/Series
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Collection Completeness
                </span>
                <span className="text-sm text-muted-foreground">
                  {insights.completenessScore}%
                </span>
              </div>
              <Progress value={insights.completenessScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Based on series with 5+ issues
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Top Publishers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={insights.publisherChartData}
                layout="vertical"
                margin={{ left: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Bar dataKey="comics" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Comics by Decade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.decadeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Bar dataKey="comics" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Comics by Publication Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={insights.yearChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickCount={10}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Line type="monotone" dataKey="comics" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Most Collected Series
          </CardTitle>
          <CardDescription>
            Series with the most issues in your collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.topSeries.map(([series, count], index) => (
              <div
                key={series}
                className="flex items-center justify-between p-2 rounded border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="font-medium">{series}</div>
                    <div className="text-sm text-muted-foreground">
                      {count} issue{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {count >= 10 && <Star className="h-4 w-4 text-yellow-500" />}
                  <Badge variant={count >= 5 ? "default" : "secondary"}>
                    {count >= 10 ? "Complete" : count >= 5 ? "Good" : "Started"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionInsights;