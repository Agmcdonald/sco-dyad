import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, Zap, FileX, Calendar } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface HealthIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action?: string;
}

const LibraryHealth = () => {
  const { comics, files } = useAppContext();

  const healthAnalysis = useMemo(() => {
    const issues: HealthIssue[] = [];
    let healthScore = 100;

    // Check for missing metadata
    const missingYear = comics.filter(c => !c.year || c.year < 1900).length;
    const missingPublisher = comics.filter(c => !c.publisher || c.publisher === 'Unknown Publisher').length;
    const missingSummary = comics.filter(c => !c.summary || c.summary.includes('No summary')).length;

    if (missingYear > 0) {
      issues.push({
        type: 'warning',
        title: 'Missing Publication Years',
        description: 'Some comics are missing valid publication years',
        count: missingYear,
        action: 'Update Metadata'
      });
      healthScore -= Math.min(20, missingYear * 2);
    }

    if (missingPublisher > 0) {
      issues.push({
        type: 'warning',
        title: 'Unknown Publishers',
        description: 'Some comics have unknown or missing publisher information',
        count: missingPublisher,
        action: 'Update Publishers'
      });
      healthScore -= Math.min(15, missingPublisher * 2);
    }

    if (missingSummary > 0) {
      issues.push({
        type: 'info',
        title: 'Missing Summaries',
        description: 'Comics without detailed summaries',
        count: missingSummary,
        action: 'Add Summaries'
      });
      healthScore -= Math.min(10, missingSummary);
    }

    // Check for duplicate detection
    const seriesIssueMap = new Map<string, number>();
    comics.forEach(comic => {
      const key = `${comic.series}-${comic.issue}-${comic.year}`;
      seriesIssueMap.set(key, (seriesIssueMap.get(key) || 0) + 1);
    });

    const duplicates = Array.from(seriesIssueMap.values()).filter(count => count > 1).length;
    if (duplicates > 0) {
      issues.push({
        type: 'error',
        title: 'Potential Duplicates',
        description: 'Comics that might be duplicates based on series, issue, and year',
        count: duplicates,
        action: 'Review Duplicates'
      });
      healthScore -= duplicates * 5;
    }

    // Check processing queue health
    const errorFiles = files.filter(f => f.status === 'Error').length;
    const warningFiles = files.filter(f => f.status === 'Warning').length;

    if (errorFiles > 0) {
      issues.push({
        type: 'error',
        title: 'Processing Errors',
        description: 'Files that failed to process automatically',
        count: errorFiles,
        action: 'Review Errors'
      });
      healthScore -= errorFiles * 3;
    }

    if (warningFiles > 0) {
      issues.push({
        type: 'warning',
        title: 'Low Confidence Matches',
        description: 'Files with uncertain metadata matches',
        count: warningFiles,
        action: 'Verify Matches'
      });
      healthScore -= warningFiles * 2;
    }

    // Check for incomplete series
    const seriesStats = comics.reduce((acc, comic) => {
      acc[comic.series] = (acc[comic.series] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const incompleteSeries = Object.entries(seriesStats).filter(([, count]) => count === 1).length;
    if (incompleteSeries > 5) {
      issues.push({
        type: 'info',
        title: 'Single Issue Series',
        description: 'Series with only one issue - might be incomplete',
        count: incompleteSeries,
        action: 'Find More Issues'
      });
      healthScore -= Math.min(10, incompleteSeries);
    }

    // Ensure health score doesn't go below 0
    healthScore = Math.max(0, healthScore);

    return {
      healthScore,
      issues: issues.sort((a, b) => {
        const priority = { error: 3, warning: 2, info: 1 };
        return priority[b.type] - priority[a.type];
      }),
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.type === 'error').length
    };
  }, [comics, files]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Attention';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getIssueBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Library Health
        </CardTitle>
        <CardDescription>
          Overall health and quality metrics for your comic collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Score */}
        <div className="text-center space-y-2">
          <div className={`text-4xl font-bold ${getHealthColor(healthAnalysis.healthScore)}`}>
            {healthAnalysis.healthScore}%
          </div>
          <div className="text-lg font-medium">
            {getHealthLabel(healthAnalysis.healthScore)}
          </div>
          <Progress value={healthAnalysis.healthScore} className="w-full" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 border rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {comics.length - healthAnalysis.issues.reduce((sum, issue) => sum + issue.count, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Healthy Items</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{healthAnalysis.totalIssues}</div>
            <div className="text-xs text-muted-foreground">Issues Found</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-lg font-bold text-red-600">{healthAnalysis.criticalIssues}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
        </div>

        {/* Issues List */}
        {healthAnalysis.issues.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Issues Detected</h4>
            {healthAnalysis.issues.map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getIssueIcon(issue.type)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm">{issue.title}</h5>
                      <Badge variant={getIssueBadgeVariant(issue.type)} className="text-xs">
                        {issue.count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
                {issue.action && (
                  <Button variant="outline" size="sm" disabled>
                    {issue.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-green-700">Perfect Health!</h3>
            <p className="text-sm text-muted-foreground">
              No issues detected in your library
            </p>
          </div>
        )}

        {/* Recommendations */}
        {healthAnalysis.healthScore < 90 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {healthAnalysis.criticalIssues > 0 && (
                <li>• Address critical issues first to improve library stability</li>
              )}
              {healthAnalysis.issues.some(i => i.title.includes('Missing')) && (
                <li>• Complete missing metadata to improve searchability</li>
              )}
              {healthAnalysis.issues.some(i => i.title.includes('Duplicate')) && (
                <li>• Remove duplicates to save space and avoid confusion</li>
              )}
              <li>• Regular maintenance helps keep your library organized</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LibraryHealth;