import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Hourglass, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState, useRef } from "react"; // Import useRef

const ApiUsageCard = () => {
  console.log("ApiUsageCard is rendering.");
  const { apiUsageStats, fetchApiUsageStats } = useAppContext();
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Store the timestamp when apiUsageStats was last fetched
  const fetchTimestampRef = useRef<number>(Date.now());
  // Store the initial timeUntilResetMs from the last fetch
  const initialTimeUntilResetMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (apiUsageStats) {
      // Update refs when new apiUsageStats are received
      fetchTimestampRef.current = Date.now();
      initialTimeUntilResetMsRef.current = apiUsageStats.timeUntilResetMs;

      const updateTimer = () => {
        const now = Date.now();
        const elapsedSinceFetch = now - fetchTimestampRef.current;
        
        // Calculate remaining time based on the initial value and elapsed time
        let remainingMs = (initialTimeUntilResetMsRef.current || 0) - elapsedSinceFetch;

        if (remainingMs <= 0) {
          setTimeUntilReset('Resetting soon...');
          fetchApiUsageStats(); // Re-fetch to get new reset time and usage
          return;
        }
        const minutes = Math.floor(remainingMs / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        setTimeUntilReset(`${minutes}m ${seconds}s`);
      };

      // Call immediately and then set interval
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeUntilReset('Loading...');
    }
  }, [apiUsageStats, fetchApiUsageStats]); // Depend on apiUsageStats to re-run when it changes

  if (!apiUsageStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Comic Vine API Usage
          </CardTitle>
          <CardDescription>
            Loading API usage statistics...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentageUsed = (apiUsageStats.currentUsage / apiUsageStats.hourlyLimit) * 100;
  const remainingRequests = apiUsageStats.hourlyLimit - apiUsageStats.currentUsage;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Comic Vine API Usage
        </CardTitle>
        <CardDescription>
          Requests made in the last hour.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Requests Used</span>
            <span>{apiUsageStats.currentUsage} / {apiUsageStats.hourlyLimit}</span>
          </div>
          <Progress value={percentageUsed} className={getProgressColor(percentageUsed)} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{remainingRequests}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
          <div>
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Hourglass className="h-5 w-5 text-muted-foreground" />
              {timeUntilReset}
            </div>
            <div className="text-sm text-muted-foreground">Until Reset</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiUsageCard;