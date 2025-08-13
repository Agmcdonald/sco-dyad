import { NavLink } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  ArrowDownToLine,
  GraduationCap,
  Library,
  History,
  Settings,
  Search,
} from "lucide-react";

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/organize", icon: ArrowDownToLine, label: "Organize" },
  { to: "/app/learning", icon: GraduationCap, label: "Learning" },
  { to: "/app/library", icon: Library, label: "Library" },
  { to: "/app/activity", icon: History, label: "Activity" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

const Sidebar = () => {
  return (
    <aside className="h-full flex flex-col bg-muted/40 border-r">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" />
        </div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
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
    </aside>
  );
};

export default Sidebar;