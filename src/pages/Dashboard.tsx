import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderPlus, GraduationCap, Plus, TrendingUp, BookOpen, Zap } from "lucide-react";
import ProgressStrip from "@/components/ProgressStrip";
import RecentActions from "@/components/RecentActions";
import LibraryStats from "@/components/LibraryStats";
import CollectionInsights from "@/components/CollectionInsights";
import ReadingList from "@/components/ReadingList";
import LibraryHealth from "@/components/LibraryHealth";
import { useAppContext } from "@/context/AppContext";

const Dashboard = () => {
  const { comics, files, triggerSelectFiles, triggerScanFolder } = useAppContext();
  const navigate = useNavigate();

  const filesInQueue = files.filter(f => f.status === 'Pending').length;
  const comicsInLibrary = comics.length;
  const unmapped = files.filter(f => f.status === 'Warning').length;
  const errors = files.filter(f => f.status === 'Error').length;

  const handleAddFiles = () => {
    triggerSelectFiles();
    navigate('/app/organize');
  };

  const handleScanFolder = () => {
    triggerScanFolder();
    navigate('/app/organize');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your comic collection and organization progress
          </p>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filesInQueue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comics in Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comicsInLibrary}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unmapped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="health">
            <Zap className="h-4 w-4 mr-2" />
            Health
          </TabsTrigger>
          <TabsTrigger value="reading">
            <BookOpen className="h-4 w-4 mr-2" />
            Reading
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              {/* Progress Strip */}
              <ProgressStrip />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button onClick={handleAddFiles}>
                    <Plus className="mr-2 h-4 w-4" /> Add Files
                  </Button>
                  <Button variant="secondary" onClick={handleScanFolder}>
                    <FolderPlus className="mr-2 h-4 w-4" /> Scan Folder
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/app/learning')}>
                    <GraduationCap className="mr-2 h-4 w-4" /> Open Learning
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Library Statistics */}
            <LibraryStats />

            {/* Recent Actions */}
            <RecentActions />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <CollectionInsights />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <LibraryHealth />
        </TabsContent>

        <TabsContent value="reading" className="space-y-6">
          <ReadingList />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <RecentActions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;