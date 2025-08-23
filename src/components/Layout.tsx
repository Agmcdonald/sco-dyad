import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Inspector from "./Inspector";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const Layout = () => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const toggleInspector = () => setIsInspectorOpen(!isInspectorOpen);

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
              <Outlet context={{ toggleInspector }} />
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