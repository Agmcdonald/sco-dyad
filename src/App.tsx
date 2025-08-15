import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Organize from "./pages/Organize";
import Learning from "./pages/Learning";
import Library from "./pages/Library";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import ElectronIntegration from "./components/ElectronIntegration";
import { SelectionProvider } from "./context/SelectionContext";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./context/SettingsContext";
import { KnowledgeBaseProvider } from "./context/KnowledgeBaseContext";

const queryClient = new QueryClient();

const Root = () => (
  <>
    <ElectronIntegration />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: "/",
        element: <Index />,
      },
      {
        path: "/app",
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "organize", element: <Organize /> },
          { path: "learning", element: <Learning /> },
          { path: "library", element: <Library /> },
          { path: "activity", element: <Activity /> },
          { path: "settings", element: <Settings /> },
          { path: "maintenance", element: <Maintenance /> },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App = () => {
  useEffect(() => {
    // This is now handled by the KnowledgeBaseProvider
    // initializeKnowledgeBase(comicsKnowledgeData);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <SettingsProvider>
            <KnowledgeBaseProvider>
              <AppProvider>
                <SelectionProvider>
                  <Toaster />
                  <Sonner />
                  <RouterProvider router={router} />
                </SelectionProvider>
              </AppProvider>
            </KnowledgeBaseProvider>
          </SettingsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;