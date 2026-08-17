"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeValue = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };

const ThemeContext = createContext<ThemeValue>({ theme: "light", resolved: "light", setTheme: () => {} });

export const CHART_COLORS = {
  light: { revenue: "#2563EB", cost: "#C2571F", profit: "#0EA5E9", prior: "#9AA19C", grid: "#DFE2DF", axis: "#6C736E" },
  dark: { revenue: "#60A5FA", cost: "#D98A50", profit: "#38BDF8", prior: "#6C736E", grid: "#252D29", axis: "#9AA19C" }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (window.localStorage.getItem("epa.theme") as Theme | null) ?? "light";
    setThemeState(stored);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem("epa.theme", next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useChartColors = () => CHART_COLORS[useTheme().resolved];
