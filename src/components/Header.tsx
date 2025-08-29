import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  FolderPlus,
  ArrowUpRightFromSquare,
  SidebarClose,
  SidebarOpen,
  PlusSquare,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";

interface HeaderProps {
  isInspectorOpen: boolean;
  toggleInspector: () => void;
}

const Header = ({ isInspectorOpen, toggleInspector }: HeaderProps) => {
  const navigate = useNavigate();
  const { triggerSelectFiles, triggerScanFolder, triggerQuickAdd } = useAppContext();
  const { selectedItem } = useSelection();

  const handleAddFiles = () => {
    triggerSelectFiles();
    navigate('/app/organize');
  };

  const handleScanFolder = () => {
    triggerScanFolder();
    navigate('/app/organize');
  };

  const handleQuickAdd = () => {
    triggerQuickAdd();
  };

  const handleOpenInNewWindow = () => {
    // Open selected comic in a new reader window (future feature)
    if (selectedItem?.type === 'comic') {
      console.log('Open in new window:', selectedItem.series);
      // Could open comic reader in a separate window
    }
  };

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleQuickAdd}>
            <PlusSquare className="h-4 w-4 mr-2" /> Quick Add...
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddFiles}>
            <Plus className="h-4 w-4 mr-2" /> Add Files...
          </Button>
          <Button variant="outline" size="sm" onClick={handleScanFolder}>
            <FolderPlus className="h-4 w-4 mr-2" /> Scan Folder...
          </Button>
        </div>
        <div className="flex-1">{/* Center content like filters will go here */}</div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleOpenInNewWindow}
                disabled={!selectedItem || selectedItem.type !== 'comic'}
              >
                <ArrowUpRightFromSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in New Window (WIP)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={toggleInspector}>
                {isInspectorOpen ? (
                  <SidebarClose className="h-4 w-4" />
                ) : (
                  <SidebarOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isInspectorOpen ? 'Close' : 'Open'} Inspector</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default Header;