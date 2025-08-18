import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, useOutletContext } from "react-router-dom";
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

const queryClient = new QueryClient();

// Wrapper components to pass context
const LibraryWithContext = () => {
  const { toggleInspector } = useOutletContext<{ toggleInspector: () => void }>();
  return <Library onToggleInspector={toggleInspector} />;
};

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
          { path: "library", element: <LibraryWithContext /> },
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <SettingsProvider>
            <AppProvider>
              <SelectionProvider>
                <Toaster />
                <Sonner />
                <RouterProvider router={router} />
              </SelectionProvider>
            </AppProvider>
          </SettingsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;