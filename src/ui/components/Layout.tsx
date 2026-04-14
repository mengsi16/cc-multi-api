import { ReactNode, useEffect, useState } from "react";
import { Moon, Sun } from "./icons";
import Sidebar from "./Sidebar";

type ThemeMode = "light" | "dark";

interface LayoutProps {
  children: ReactNode;
}

function getInitialTheme(): ThemeMode {
  if (typeof localStorage === "undefined") {
    return "light";
  }
  const stored = localStorage.getItem("ccma-theme");
  return stored === "dark" ? "dark" : "light";
}

export default function Layout({ children }: LayoutProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ccma-theme", theme);
  }, [theme]);

  return (
    <div className="relative flex min-h-screen text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[var(--backdrop-accent)]" />
      <Sidebar
        theme={theme}
        onToggleTheme={() => setTheme(prev => (prev === "dark" ? "light" : "dark"))}
      />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-4 flex justify-end md:mb-6">
          <button
            type="button"
            className="button-ghost"
            onClick={() => setTheme(prev => (prev === "dark" ? "light" : "dark"))}
            aria-label="切换主题"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
