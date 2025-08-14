import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, Zap } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface HealthIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action?: {
    label: string;
    path: string;
    state?: any;
  };
}

const LibraryHealth = () => {
  const { comics, files } = useAppContext();
  const navigate = useNavigate();

  const healthAnalysis = useMemo(() => {
    const issues: HealthIssue[] = [];
    let healthScore = 100;

    // Check for missing metadata
    const missingYear = comics.filter(c => !c.year || c.year < 1900).length;
    if (missingYear > 0) {
      issues.push({
        type: 'warning',
        title: 'Missing Publication Years',
        description: `${missingYear} comics are missing valid publication years.`,
        count: missingYear,
        action: { label: 'Find & Edit', path: '/app/library' }
      });
      healthScore -= Math.min(20, missingYear * 2);
    }

    // Check for duplicate detection
    const seriesIssueMap = new Map<string, number>();
    comics.forEach(comic => {
      const key = `${comic.series}-${comic.issue}`;
      seriesIssueMap.set(key, (seriesIssueMap.get(key) || 0) + 1);
    });
    const duplicates = Array.from(seriesIssueMap.values()).filter(count => count > 1).length;
    if (duplicates > 0) {
      issues.push({
        type: 'error',
        title: 'Potential Duplicates',
        description: `Found ${duplicates} sets of comics that might be duplicates.`,
        count: duplicates,
        action: { label: 'Review Duplicates', path: '/app/maintenance' }
      });
      healthScore -= duplicates * 5;
    }

    // Check processing queue health
    const errorFiles = files.filter(f => f.status === 'Error').length;
    if (errorFiles > 0) {
      issues.push({
        type: 'error',
        title: 'Processing Errors',
        description: `${errorFiles} files failed to process automatically.`,
        count: errorFiles,
        action: { label: 'Review Errors', path: '/app/learning', state: { filter: 'Error' } }
      });
      healthScore -= errorFiles * 3;
    }

    const warningFiles = files.filter(f => f.status === 'Warning').length;
    if (warningFiles > 0) {
      issues.push({
        type: 'warning',
        title: 'Low Confidence Matches',
        description: `${warningFiles} files have uncertain metadata matches.`,
        count: warningFiles,
        action: { label: 'Verify Matches', path: '/app/learning', state: { filter: 'Warning' } }
      });
      healthScore -= warningFiles * 2;
    }

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
        <div className="text-center space-y-2">
          <div className={`text-4xl font-bold ${getHealthColor(healthAnalysis.healthScore)}`}>
            {healthAnalysis.healthScore}%
          </div>
          <div className="text-lg font-medium">
            {getHealthLabel(healthAnalysis.healthScore)}
          </div>
          <Progress value={healthAnalysis.healthScore} className="w-full" />
        </div>

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
                      <Badge variant={issue.type === 'error' ? 'destructive' : 'default'} className="text-xs">
                        {issue.count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
                {issue.action && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(issue.action!.path, { state: issue.action!.state })}
                  >
                    {issue.action.label}
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
      </CardContent>
    </Card>
  );
};

export default LibraryHealth;