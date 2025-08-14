import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { initializeKnowledgeBase } from "./lib/knowledgeBase";

const queryClient = new QueryClient();

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
                  <BrowserRouter>
                    <ElectronIntegration />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/app" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="organize" element={<Organize />} />
                        <Route path="learning" element={<Learning />} />
                        <Route path="library" element={<Library />} />
                        <Route path="activity" element={<Activity />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="maintenance" element={<Maintenance />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
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