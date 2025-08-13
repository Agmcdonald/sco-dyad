import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderPlus,
  Play,
  Pause,
  Eye,
  ArrowUpRightFromSquare,
  SidebarClose,
  SidebarOpen,
  Loader2,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface HeaderProps {
  isInspectorOpen: boolean;
  toggleInspector: () => void;
}

const Header = ({ isInspectorOpen, toggleInspector }: HeaderProps) => {
  const navigate = useNavigate();
  const { isProcessing, startProcessing, pauseProcessing, files } = useAppContext();
  const hasPendingFiles = files.some(f => f.status === 'Pending');

  const handleStartPause = () => {
    if (isProcessing) {
      pauseProcessing();
    } else {
      startProcessing();
      navigate('/organize');
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/organize')}>
          <Plus className="h-4 w-4 mr-2" /> Add Files...
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FolderPlus className="h-4 w-4 mr-2" /> Scan Folder...
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleStartPause}
          disabled={!hasPendingFiles && !isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              <span>Start</span>
            </>
          )}
        </Button>
      </div>
      <div className="flex-1">{/* Center content like filters will go here */}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" disabled>
          <ArrowUpRightFromSquare className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleInspector}>
          {isInspectorOpen ? (
            <SidebarClose className="h-4 w-4" />
          ) : (
            <SidebarOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;