import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck2, FileX2, Info, Undo, AlertTriangle } from "lucide-react";
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

const RecentActions = () => {
  const { actions, undoLastAction } = useAppContext();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Actions</CardTitle>
        <CardDescription>A log of the latest file operations.</CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length > 0 ? (
          <div className="space-y-4">
            {actions.map((action) => {
              const Icon = actionIcons[action.type];
              return (
                <div key={action.id} className="flex items-center gap-4">
                  <Icon className={`h-5 w-5 ${actionColors[action.type]}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {action.undo && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto" 
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
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent actions to display.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActions;