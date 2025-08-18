import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Zap, XCircle, CheckCircle } from "lucide-react";
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess, showError } from "@/utils/toast";

const GcdDatabaseManager = () => {
  const gcdDbService = useGcdDatabaseService();
  const { settings } = useSettings();
  const [status, setStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'not_found'>('unknown');

  const checkConnection = async () => {
    if (!gcdDbService) {
      setStatus('disconnected');
      return;
    }
    const isConnected = await gcdDbService.connect(settings.gcdDbPath || '');
    if (isConnected) {
      setStatus('connected');
    } else {
      setStatus('not_found');
    }
  };

  useEffect(() => {
    checkConnection();
  }, [gcdDbService, settings.gcdDbPath]);

  const handleConnect = async () => {
    if (!gcdDbService) {
      showError("Database service not available.");
      return;
    }
    const success = await gcdDbService.connect(settings.gcdDbPath || '');
    if (success) {
      setStatus('connected');
      showSuccess("Connected to local GCD database.");
    } else {
      setStatus('not_found');
      showError("Could not find or connect to the local database. Please build it first.");
    }
  };

  const handleDisconnect = async () => {
    if (!gcdDbService) return;
    await gcdDbService.disconnect();
    setStatus('disconnected');
    showSuccess("Disconnected from local GCD database.");
  };

  const statusInfo = {
    connected: { text: "Connected", color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
    disconnected: { text: "Disconnected", color: "bg-gray-500", icon: <XCircle className="h-4 w-4" /> },
    not_found: { text: "Not Found", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
    unknown: { text: "Checking...", color: "bg-yellow-500", icon: <Zap className="h-4 w-4" /> },
  };

  const currentStatus = statusInfo[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Local Database Status
        </CardTitle>
        <CardDescription>
          Manage the connection to your local Grand Comics Database.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <Badge className={`${currentStatus.color} text-white`}>
            {currentStatus.icon}
            <span className="ml-1">{currentStatus.text}</span>
          </Badge>
        </div>
        <div className="flex gap-2">
          {status !== 'connected' && (
            <Button onClick={handleConnect}>Connect</Button>
          )}
          {status === 'connected' && (
            <Button variant="outline" onClick={handleDisconnect}>Disconnect</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GcdDatabaseManager;