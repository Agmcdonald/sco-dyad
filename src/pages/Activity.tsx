import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck2, FileX2, Info, AlertTriangle, Undo } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { RecentAction } from "@/types";

const actionIcons: Record<RecentAction['type'], React.ElementType> = {
  success: FileCheck2,
  error: FileX2,
  info: Info,
  warning: AlertTriangle,
};

const actionColors: Record<RecentAction['type'], string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

const actionBadgeVariants: Record<RecentAction['type'], "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  error: "destructive",
  info: "secondary",
  warning: "outline",
};

const Activity = () => {
  const { actions, undoLastAction } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-2">
            View the complete history of all file operations and system events.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            A chronological log of all actions performed in the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actions.length > 0 ? (
            <div className="space-y-4">
              {actions.map((action) => {
                const Icon = actionIcons[action.type];
                return (
                  <div key={action.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <Icon className={`h-5 w-5 mt-0.5 ${actionColors[action.type]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={actionBadgeVariants[action.type]} className="text-xs">
                          {action.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {action.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium break-words">{action.message}</p>
                    </div>
                    {action.undo && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-auto flex-shrink-0" 
                        onClick={undoLastAction}
                      >
                        <Undo className="h-3 w-3 mr-1.5" />
                        Undo
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground">
                Start organizing comics to see activity logs here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Activity;