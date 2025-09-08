import { useState, useRef, useEffect } from "react";
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
  ImperativePanelHandle
} from "@/components/ui/resizable";

const Layout = () => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSidebarManuallyExpanded, setIsSidebarManuallyExpanded] = useState(false);
  const inspectorPanelRef = useRef<ImperativePanelHandle>(null);
  const { selectedItem } = useSelection();
  const { readingComic, setReadingComic, readingContext, setReadingContext } = useAppContext();

  // Determine if the inspector panel should be visually open
  const isInspectorPanelOpen = isInspectorOpen && !!selectedItem;

  // Calculate sidebar panel size based on inspector state and manual expansion
  // When inspector is open AND sidebar is not manually expanded, collapse sidebar to 5 units (approx 72px)
  // When inspector is closed OR sidebar is manually expanded, allow sidebar to be its default size
  const sidebarCollapsedSize = 5; // Corresponds to ~72px
  const sidebarDefaultSize = 20;
  const sidebarMinSize = 15;
  const sidebarMaxSize = 25;

  const shouldCollapseSidebar = isInspectorPanelOpen && !isSidebarManuallyExpanded;
  const currentSidebarSize = shouldCollapseSidebar ? sidebarCollapsedSize : sidebarDefaultSize;
  const currentSidebarMinSize = shouldCollapseSidebar ? sidebarCollapsedSize : sidebarMinSize;
  const currentSidebarMaxSize = shouldCollapseSidebar ? sidebarCollapsedSize : sidebarMaxSize;


  const toggleInspector = () => {
    const newState = !isInspectorOpen;
    setIsInspectorOpen(newState);
    
    // Use the imperative API to collapse/expand the panel
    if (inspectorPanelRef.current) {
      if (newState) {
        inspectorPanelRef.current.expand();
      } else {
        inspectorPanelRef.current.collapse();
      }
    }
  };

  // Effect to sync panel state with isInspectorOpen
  useEffect(() => {
    if (inspectorPanelRef.current) {
      if (isInspectorOpen) {
        inspectorPanelRef.current.expand();
      } else {
        inspectorPanelRef.current.collapse();
      }
    }
  }, [isInspectorOpen]);

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
          <Sidebar 
            isCollapsed={shouldCollapseSidebar} 
            onToggleExpansion={(expanded) => setIsSidebarManuallyExpanded(expanded)}
          />
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
        <ResizableHandle withHandle />
        <ResizablePanel 
          ref={inspectorPanelRef}
          id="inspector" 
          order={3} 
          defaultSize={25} 
          minSize={20} 
          maxSize={40}
          collapsible={true}
          collapsedSize={0}
        >
          <Inspector />
        </ResizablePanel>
      </ResizablePanelGroup>
      {readingComic && (
        <ComicReader 
          comic={readingComic} 
          onClose={() => {
            setReadingComic(null);
            setReadingContext(null);
          }}
          comicList={readingContext?.comicList}
          currentIndex={readingContext?.currentIndex}
        />
      )}
    </div>
  );
};

export default Layout;