import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const ProcessingStats = () => {
  const { files } = useAppContext();

  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === 'Pending').length,
    success: files.filter(f => f.status === 'Success').length,
    warning: files.filter(f => f.status === 'Warning').length,
    error: files.filter(f => f.status === 'Error').length,
    highConfidence: files.filter(f => f.confidence === 'High').length,
    mediumConfidence: files.filter(f => f.confidence === 'Medium').length,
    lowConfidence: files.filter(f => f.confidence === 'Low').length,
  };

  const processedPercentage = stats.total > 0 ? ((stats.success + stats.warning + stats.error) / stats.total) * 100 : 0;
  const successRate = (stats.success + stats.warning + stats.error) > 0 ? (stats.success / (stats.success + stats.warning + stats.error)) * 100 : 0;

  if (stats.total === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Progress</CardTitle>
          <CardDescription>Overall file processing status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processed</span>
              <span>{Math.round(processedPercentage)}%</span>
            </div>
            <Progress value={processedPercentage} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Metrics</CardTitle>
          <CardDescription>Confidence levels and success rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>{Math.round(successRate)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              High: {stats.highConfidence}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Medium: {stats.mediumConfidence}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <XCircle className="w-3 h-3 mr-1" />
              Low: {stats.lowConfidence}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingStats;