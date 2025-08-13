import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Organize from "./pages/Organize";
import Learning from "./pages/Learning";
import Library from "./pages/Library";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { SelectionProvider } from "./context/SelectionContext";
import { Comic, QueuedFile } from "./types";

const queryClient = new QueryClient();

// Initial mock data is now managed here
const initialComics: Comic[] = [
  { id: 1, coverUrl: "/placeholder.svg", series: "Saga", issue: "61", year: 2023, publisher: "Image Comics", volume: "1", summary: "The award-winning series returns with a new issue." },
  { id: 2, coverUrl: "/placeholder.svg", series: "Batman: The Knight", issue: "3", year: 2022, publisher: "DC Comics", volume: "2022", summary: "Bruce Wayne's training continues." },
  { id: 3, coverUrl: "/placeholder.svg", series: "Weird Comic", issue: "4", year: 2021, publisher: "Indie", volume: "2", summary: "Things get even weirder." },
  { id: 4, coverUrl: "/placeholder.svg", series: "The Amazing Spider-Man", issue: "1", year: 1963, publisher: "Marvel Comics", volume: "1963", summary: "The first appearance of Spider-Man in his own series." },
  { id: 5, coverUrl: "/placeholder.svg", series: "Action Comics", issue: "1", year: 1938, publisher: "DC Comics", volume: "1938", summary: "The first appearance of Superman." },
  { id: 6, coverUrl: "/placeholder.svg", series: "Detective Comics", issue: "27", year: 1939, publisher: "DC Comics", volume: "1939", summary: "The first appearance of Batman." },
];

const initialFiles: QueuedFile[] = [
  { id: 1, name: "Radiant Black 01.cbz", series: "Radiant Black", issue: "1", year: 2021, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 2, name: "Invincible_v1_001.cbr", series: "Invincible", issue: "1", year: 2003, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 3, name: "Monstress-001.cbz", series: "Monstress", issue: "1", year: 2015, publisher: "Image Comics", confidence: "Medium", status: "Pending" },
  { id: 4, name: "Paper Girls #1.zip", series: "Paper Girls", issue: "1", year: 2015, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 5, name: "WicDiv_1.cbz", series: "The Wicked + The Divine", issue: "1", year: 2014, publisher: "Image Comics", confidence: "Low", status: "Pending" },
  { id: 6, name: "East of West 01 (2013).cbr", series: "East of West", issue: "1", year: 2013, publisher: "Image Comics", confidence: "High", status: "Pending" },
  { id: 7, name: "Corrupted_File.cbz", series: null, issue: null, year: null, publisher: null, confidence: null, status: "Pending" },
];


const App = () => {
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [files, setFiles] = useState<QueuedFile[]>(initialFiles);

  const addComic = (comic: Omit<Comic, 'id' | 'coverUrl'>) => {
    setComics(prev => [...prev, { ...comic, id: Date.now(), coverUrl: '/placeholder.svg' }]);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SelectionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="organize" element={<Organize files={files} setFiles={setFiles} addComic={addComic} />} />
                <Route path="learning" element={<Learning />} />
                <Route path="library" element={<Library comics={comics} />} />
                <Route path="activity" element={<Activity />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SelectionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;