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

  // Determine if the inspector panel should be visually open
  const isInspectorPanelOpen = isInspectorOpen && !!selectedItem;

  // Calculate sidebar panel size based on inspector state
  // When inspector is open, collapse sidebar to 5 units (approx 72px)
  // When inspector is closed, allow sidebar to be its default size
  const sidebarCollapsedSize = 5; // Corresponds to ~72px
  const sidebarDefaultSize = 20;
  const sidebarMinSize = 15;
  const sidebarMaxSize = 25;

  const currentSidebarSize = isInspectorPanelOpen ? sidebarCollapsedSize : sidebarDefaultSize;
  const currentSidebarMinSize = isInspectorPanelOpen ? sidebarCollapsedSize : sidebarMinSize;
  const currentSidebarMaxSize = isInspectorPanelOpen ? sidebarCollapsedSize : sidebarMaxSize;


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
        <ResizablePanel 
          id="sidebar" 
          order={1} 
          defaultSize={currentSidebarSize} 
          minSize={currentSidebarMinSize} 
          maxSize={currentSidebarMaxSize}
          // The `onResize` prop is crucial here to update the `defaultSize` when the panel is manually resized
          // However, `defaultSize` is only for initial render. To make it truly dynamic,
          // we need to manage the `size` prop and update it.
          // For now, we'll rely on `minSize` and `maxSize` to constrain it.
          // The visual collapse will be handled by the Sidebar component itself.
        >
          <Sidebar isCollapsed={isInspectorPanelOpen} />
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