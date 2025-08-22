import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/library", icon: Library, label: "Library" },
  { to: "/app/organize", icon: ArrowDownToLine, label: "Organize" },
  { to: "/app/learning", icon: GraduationCap, label: "Learning" },
  { to: "/app/knowledge", icon: Tag, label: "Knowledge" },
  { to: "/app/maintenance", icon: Wrench, label: "Maintenance" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

const Sidebar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { comics } = useAppContext();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate("/app/library", { state: { searchTerm: searchTerm.trim() } });
      setSearchTerm("");
    }
  };

  const searchResults =
    searchTerm.length > 2
      ? comics
          .filter(
            (comic) =>
              comic.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
              comic.publisher.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 5)
      : [];

  return (
    <aside className="h-full flex flex-col bg-muted/40 border-r min-w-0">
      <div className="border-b">
        <div className="flex justify-center p-4">
          <img
            src="/logo.png"
            alt="Super Comic Organizer Logo"
            className="h-auto w-full object-contain"
          />
        </div>
        <div className="px-4 pb-4">
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
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                isActive ? "bg-muted text-primary font-semibold" : ""
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="ml-2">
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;