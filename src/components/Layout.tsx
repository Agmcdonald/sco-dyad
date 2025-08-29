import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Inspector from "./Inspector";
import ComicReader from "./ComicReader";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const Layout = () => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const { selectedItem } = useSelection();
  const { readingComic, setReadingComic } = useAppContext();

  const toggleInspector = () => {
    setIsInspectorOpen(!isInspectorOpen);
  };

  // Function specifically for auto-opening inspector when items are selected
  const autoOpenInspector = () => {
    if (!isInspectorOpen) {
      setIsInspectorOpen(true);
    }
  };

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel id="sidebar" order={1} defaultSize={20} minSize={15} maxSize={25}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="main" order={2}>
          <div className="flex flex-col h-full">
            <Header
              isInspectorOpen={isInspectorOpen}
              toggleInspector={toggleInspector}
            />
            <main className="flex-1 p-6 overflow-auto bg-muted/20">
              <Outlet context={{ 
                toggleInspector: toggleInspector,
                autoOpenInspector: autoOpenInspector,
                isInspectorOpen: isInspectorOpen
              }} />
            </main>
          </div>
        </ResizablePanel>
        {isInspectorOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="inspector" order={3} defaultSize={25} minSize={20} maxSize={40}>
              <Inspector />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {readingComic && (
        <ComicReader comic={readingComic} onClose={() => setReadingComic(null)} />
      )}
    </div>
  );
};

export default Layout;