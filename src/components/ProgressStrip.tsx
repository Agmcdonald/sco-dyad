import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stages = ["Parse", "Match", "Rename", "Move"];

const ProgressStrip = () => {
  const currentProgress = 66; // Example progress, 2/3 of the way
  const activeStageIndex = 2; // "Rename" is the active stage

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={currentProgress} />
          <div className="flex justify-between text-sm text-muted-foreground">
            {stages.map((stage, index) => (
              <span
                key={stage}
                className={
                  index === activeStageIndex ? "font-semibold text-primary" : ""
                }
              >
                {stage}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressStrip;