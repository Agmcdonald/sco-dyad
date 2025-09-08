import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  ArrowDownToLine,
  GraduationCap,
  Library,
  Settings,
  Search,
  Wrench,
  Tag,
  Sun,
  Moon,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom"; // Import useLocation

interface SidebarProps {
  isCollapsed?: boolean; // New prop to control collapse state
  onToggleExpansion?: (expanded: boolean) => void; // Callback for manual expansion
}

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/library", icon: Library, label: "Library" },
  { to: "/app/organize", icon: ArrowDownToLine, label: "Organize" },
  { to: "/app/learning", icon: GraduationCap, label: "Learning" },
  { to: "/app/knowledge", icon: Tag, label: "Knowledge" },
  { to: "/app/maintenance", icon: Wrench, label: "Maintenance" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

const Sidebar = ({ isCollapsed = false, onToggleExpansion }: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { comics } = useAppContext();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [manualCollapsed, setManualCollapsed] = useState(false); // For manual toggle

  const effectiveCollapsed = isCollapsed || manualCollapsed;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate("/app/library", { state: { searchTerm: searchTerm.trim() } });
      setSearchTerm("");
    }
  };

  const searchResults =
    searchTerm.trim().length > 0
      ? comics
          .filter(
            (comic) => {
              const lowerSearchTerm = searchTerm.toLowerCase().trim();
              if (!lowerSearchTerm) return false;

              const inSeries = comic.series.toLowerCase().includes(lowerSearchTerm);
              const inPublisher = comic.publisher.toLowerCase().includes(lowerSearchTerm);
              const inCreators = comic.creators?.some(creator => 
                creator.name.toLowerCase().includes(lowerSearchTerm)
              ) || false;
              
              let inIssue = false;
              const searchAsNum = Number(lowerSearchTerm);
              if (!isNaN(searchAsNum)) {
                const issueAsNum = Number(comic.issue);
                if (!isNaN(issueAsNum) && issueAsNum === searchAsNum) {
                  inIssue = true;
                }
              } else {
                inIssue = comic.issue.toLowerCase().includes(lowerSearchTerm);
              }

              return inSeries || inPublisher || inCreators || inIssue;
            }
          )
          .slice(0, 5)
      : [];

  // Navigation item component that handles tooltips
  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const location = useLocation(); // Get current location
    const isActive = location.pathname === item.to; // Determine active state manually

    return (
      <button // Changed from NavLink to button
        onClick={() => navigate(item.to)} // Explicitly navigate
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive ? "bg-muted text-primary font-semibold" : "", // Apply active class manually
          effectiveCollapsed && "justify-center px-2 py-2"
        )}
        aria-label={item.label}
        title={effectiveCollapsed ? item.label : undefined} // Use native title for collapsed state
      >
        <item.icon className="h-4 w-4" />
        {!effectiveCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside 
      className={cn(
        "h-full flex flex-col bg-muted/40 border-r transition-all duration-300 ease-in-out",
        effectiveCollapsed ? "w-[72px] items-center" : "w-64"
      )}
    >
        <div className="border-b">
          <div className={cn("flex justify-center px-4 py-2", effectiveCollapsed && "py-4")}>
            <img
              src="./logo.png"
              alt="Super Comic Organizer Logo"
              className={cn("scale-125 transition-transform duration-300", effectiveCollapsed && "scale-100")}
              style={{ transformOrigin: "center" }}
            />
          </div>
          <div className={cn("px-4 pb-4", effectiveCollapsed && "hidden")}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comics..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            {searchResults.length > 0 && (
              <div className="mt-2 bg-background border rounded-md shadow-lg">
                <div className="p-2 text-xs font-medium text-muted-foreground border-b">
                  Search Results
                </div>
                {searchResults.map((comic) => (
                  <button
                    key={comic.id}
                    className="w-full text-left p-2 hover:bg-muted text-sm"
                    onClick={() => {
                      navigate("/app/library", { state: { searchTerm: comic.series } });
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium">{comic.series}</div>
                    <div className="text-xs text-muted-foreground">
                      #{comic.issue} • {comic.publisher}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto p-4 border-t">
          {/* Theme toggle button with native title tooltip when collapsed */}
          <Button
            variant="outline"
            className={cn("w-full", effectiveCollapsed ? "justify-center" : "justify-start")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={effectiveCollapsed ? (theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode") : undefined}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            {!effectiveCollapsed && (
              <span className="ml-2">
                {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </span>
            )}
          </Button>

          {/* Expand/Collapse button with native title tooltip when collapsed */}
          <Button
            variant="ghost"
            className={cn("w-full mt-2", effectiveCollapsed ? "justify-center" : "justify-start")}
            onClick={() => {
              setManualCollapsed(!manualCollapsed);
              onToggleExpansion?.(!effectiveCollapsed);
            }}
            aria-label={effectiveCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={effectiveCollapsed ? "Expand Sidebar" : undefined}
          >
            {effectiveCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </Button>
        </div>
    </aside>
  );
};

export default Sidebar;