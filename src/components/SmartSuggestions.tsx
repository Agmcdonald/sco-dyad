import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { parseFilename } from "@/lib/parser";

const SmartSuggestions = () => {
  const { files, comics } = useAppContext();
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const suggs: any[] = [];

    // Analyze files that need attention
    const errorFiles = files.filter(f => f.status === 'Error');
    const warningFiles = files.filter(f => f.status === 'Warning');
    const lowConfidenceFiles = files.filter(f => f.confidence === 'Low');

    // Suggest reviewing error files
    if (errorFiles.length > 0) {
      suggs.push({
        type: 'error',
        title: 'Files Need Manual Review',
        description: `${errorFiles.length} files couldn't be processed automatically`,
        action: 'Review Files',
        priority: 'high',
        count: errorFiles.length,
        path: '/app/learning',
        state: { filter: 'Error' }
      });
    }

    // Suggest checking warning files
    if (warningFiles.length > 0) {
      suggs.push({
        type: 'warning',
        title: 'Low Confidence Matches',
        description: `${warningFiles.length} files have uncertain matches`,
        action: 'Verify Matches',
        priority: 'medium',
        count: warningFiles.length,
        path: '/app/learning',
        state: { filter: 'Warning' }
      });
    }

    // Analyze unknown series (series not in current library)
    const knownSeries = new Set(comics.map(c => c.series.toLowerCase()));
    const unknownSeries = files
      .filter(f => f.series)
      .map(f => f.series!)
      .filter(series => !knownSeries.has(series.toLowerCase()));

    if (unknownSeries.length > 0) {
      suggs.push({
        type: 'info',
        title: 'New Series Detected',
        description: `${unknownSeries.length} series not yet in your library`,
        action: 'Review New Series',
        priority: 'low',
        count: unknownSeries.length,
        path: '/app/learning'
      });
    }

    // Suggest organizing successful files
    const successfulFiles = files.filter(f => f.status === 'Success' && f.confidence === 'High');
    if (successfulFiles.length > 5) {
      suggs.push({
        type: 'success',
        title: 'Ready to Organize',
        description: `${successfulFiles.length} files ready for library`,
        action: 'Add to Library',
        priority: 'high',
        count: successfulFiles.length
      });
    }

    return suggs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [files, comics]);

  const handleActionClick = (suggestion: any) => {
    if (suggestion.path) {
      if (suggestion.targetTab) {
        // Navigate to settings with specific tab
        navigate(suggestion.path, { 
          state: { 
            ...suggestion.state,
            targetTab: suggestion.targetTab 
          } 
        });
      } else {
        navigate(suggestion.path, { state: suggestion.state });
      }
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-green-500" />
            Smart Suggestions
          </CardTitle>
          <CardDescription>All caught up! No suggestions at the moment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          Smart Suggestions
        </CardTitle>
        <CardDescription>Intelligent recommendations to improve your workflow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-start gap-3">
              {getIcon(suggestion.type)}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <Badge variant={getBadgeVariant(suggestion.priority)} className="text-xs">
                    {suggestion.count}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleActionClick(suggestion)}>
              {suggestion.action}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SmartSuggestions;