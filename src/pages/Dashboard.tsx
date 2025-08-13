import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderPlus, GraduationCap, Plus } from "lucide-react";
import ProgressStrip from "@/components/ProgressStrip";
import RecentActions from "@/components/RecentActions";
import { useAppContext } from "@/context/AppContext";

const Dashboard = () => {
  const { comics, files, addMockFiles } = useAppContext();
  const navigate = useNavigate();

  const filesInQueue = files.filter(f => f.status === 'Pending').length;
  const comicsInLibrary = comics.length;
  const unmapped = files.filter(f => f.status === 'Warning').length;
  const errors = files.filter(f => f.status === 'Error').length;

  const handleScanFolder = () => {
    addMockFiles();
    navigate('/organize');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* Top Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files in Queue</CardTitle>
          </Header>
          <CardContent>
            <div className="text-2xl font-bold">{filesInQueue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comics in Library</CardTitle>
          </Header>
          <CardContent>
            <div className="text-2xl font-bold">{comicsInLibrary}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          </Header>
          <CardContent>
            <div className="text-2xl font-bold">{unmapped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </Header>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errors}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Progress Strip */}
          <ProgressStrip />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button onClick={() => navigate('/organize')}>
                <Plus className="mr-2 h-4 w-4" /> Add Files
              </Button>
              <Button variant="secondary" onClick={handleScanFolder}>
                <FolderPlus className="mr-2 h-4 w-4" /> Scan Folder
              </Button>
              <Button variant="secondary" onClick={() => navigate('/learning')}>
                <GraduationCap className="mr-2 h-4 w-4" /> Open Learning
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Actions */}
        <RecentActions />
      </div>
    </div>
  );
};

export default Dashboard;