import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FolderPlus, GraduationCap, Library } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to dashboard after a brief moment
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Comic Organizer</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Automatically organize and catalog your digital comic collection with intelligent metadata detection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/organize')}>
            <CardHeader className="text-center">
              <FolderPlus className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Organize</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add and process comic files to organize them into your library.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/library')}>
            <CardHeader className="text-center">
              <Library className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Browse and manage your organized comic collection.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/learning')}>
            <CardHeader className="text-center">
              <GraduationCap className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manually map unrecognized files to improve organization accuracy.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/dashboard')}>
            <CardHeader className="text-center">
              <BookOpen className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your collection statistics and recent activity.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/dashboard')}>
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;