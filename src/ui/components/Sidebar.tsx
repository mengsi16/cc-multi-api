import { NavLink } from "react-router-dom";
import {
  Activity,
  FlaskConical,
  LayoutDashboard,
  Moon,
  Route,
  ScrollText,
  Server,
  Sun,
  type IconComponent,
} from "./icons";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/providers", label: "Providers", icon: Server },
  { to: "/routes", label: "Routes", icon: Route },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/test", label: "Test", icon: FlaskConical },
];

interface SidebarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex w-20 flex-col border-r border-[var(--border-primary)] bg-[var(--surface-1)]/90 backdrop-blur-md md:w-64">
      <div className="border-b border-[var(--border-primary)] px-3 py-4 md:px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/40 bg-blue-500/15 text-blue-300">
            <Activity size={16} />
          </span>
          <div className="hidden md:block">
            <h1 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)]">cc-multi-api</h1>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Proxy Control Deck</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ to, label, icon }) => (
          <SidebarLink key={to} to={to} label={label} icon={icon} />
        ))}
      </nav>
      <div className="space-y-2 border-t border-[var(--border-primary)] px-2 py-3 md:px-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="button-ghost w-full justify-center md:justify-start"
          aria-label="切换主题"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          <span className="hidden md:inline">{theme === "dark" ? "切到浅色" : "切到深色"}</span>
        </button>
        <a
          href="http://localhost:3456"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-lg border border-transparent px-2 py-2 text-[11px] text-[var(--text-muted)] transition hover:border-[var(--border-primary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] md:justify-between"
        >
          <span className="hidden md:block">cc-multi-api v0.1.0</span>
          <span className="md:hidden">v0.1.0</span>
        </a>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: IconComponent;
}) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`group relative flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all md:justify-start ${
            isActive
              ? "bg-[var(--nav-active-bg)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span
            className={`absolute left-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-r-full md:block ${
              isActive ? "bg-[var(--color-primary)]" : "bg-transparent"
            }`}
          />
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
              isActive
                ? "border-blue-400/50 bg-blue-500/15 text-blue-300"
                : "border-[var(--border-primary)] bg-[var(--surface-2)] text-[var(--text-secondary)] group-hover:border-blue-400/30 group-hover:text-blue-500"
            }`}
          >
            <Icon size={15} />
          </span>
          <span className="hidden md:block">{label}</span>
        </div>
      )}
    </NavLink>
  );
}
