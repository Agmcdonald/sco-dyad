import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck2, FileX2, Info, Undo } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { ActionType } from "@/types";

const actionIcons: Record<ActionType, React.ElementType> = {
  success: FileCheck2,
  error: FileX2,
  info: Info,
};

const actionColors: Record<ActionType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
};

const RecentActions = () => {
  const { recentActions, lastUndoableAction, undoLastAction } = useAppContext();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Actions</CardTitle>
        <CardDescription>A log of the latest file operations.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentActions.length > 0 ? (
          <div className="space-y-4">
            {recentActions.map((action, index) => {
              const Icon = actionIcons[action.type];
              const isUndoable = index === 0 && !!lastUndoableAction;
              return (
                <div key={action.id} className="flex items-center gap-4">
                  <Icon className={`h-5 w-5 ${actionColors[action.type]}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.text}</p>
                    <p className="text-xs text-muted-foreground">{action.time}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto" 
                    disabled={!isUndoable}
                    onClick={undoLastAction}
                  >
                    <Undo className="h-3 w-3 mr-1.5" />
                    Undo
                  </Button>
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