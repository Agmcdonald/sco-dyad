import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck2, FileX2, History } from "lucide-react";

const actions = [
  {
    icon: FileCheck2,
    color: "text-green-500",
    text: "Moved 'Batman #125.cbz' to Library.",
    time: "2m ago",
  },
  {
    icon: FileCheck2,
    color: "text-green-500",
    text: "Moved 'Saga #60.cbz' to Library.",
    time: "3m ago",
  },
  {
    icon: FileX2,
    color: "text-red-500",
    text: "Failed to match 'Unknown Comic 01.cbr'.",
    time: "5m ago",
  },
  {
    icon: History,
    color: "text-blue-500",
    text: "Saved new mapping for 'Radiant Black'.",
    time: "1h ago",
  },
];

const RecentActions = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Actions</CardTitle>
        <CardDescription>A log of the latest file operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center gap-4">
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{action.text}</p>
                <p className="text-xs text-muted-foreground">{action.time}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Undo
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActions;