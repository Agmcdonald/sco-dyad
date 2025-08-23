import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Inspector from "./Inspector";
import { useSelection } from "@/context/SelectionContext";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const Layout = () => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const { selectedItem } = useSelection();

  const toggleInspector = () => {
    // If inspector is closed and we have a selected item, always open it
    if (!isInspectorOpen && selectedItem) {
      setIsInspectorOpen(true);
    } else {
      // Otherwise, toggle normally
      setIsInspectorOpen(!isInspectorOpen);
    }
  };

  // Auto-open inspector when an item is selected and inspector is closed
  const handleInspectorAutoOpen = () => {
    if (!isInspectorOpen && selectedItem) {
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
              <Outlet context={{ toggleInspector: handleInspectorAutoOpen }} />
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
    </div>
  );
};

export default Layout;