import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderPlus,
  Play,
  Eye,
  ArrowUpRightFromSquare,
  SidebarClose,
  SidebarOpen,
} from "lucide-react";

interface HeaderProps {
  isInspectorOpen: boolean;
  toggleInspector: () => void;
}

const Header = ({ isInspectorOpen, toggleInspector }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/organize')}>
          <Plus className="h-4 w-4 mr-2" /> Add Files...
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FolderPlus className="h-4 w-4 mr-2" /> Scan Folder...
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Play className="h-4 w-4 mr-2" /> Start
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