import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  type ThemeMode,
  type ResolvedTheme,
  type ThemeContextType,
  ThemeContext,
} from "./themeContextDef";

export type { ThemeMode, ResolvedTheme, ThemeContextType };

const STORAGE_KEY = "theme-mode";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(key: string, fallback: ThemeMode): ThemeMode {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage access might fail in private browsing or restricted iframe
  }
  return fallback;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    getStoredTheme(storageKey, defaultTheme),
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    // Modern browsers support addEventListener, older may use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else if ("addListener" in mediaQuery) {
      // Fallback for legacy environments
      (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handler);
      return () => {
        (mediaQuery as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handler);
      };
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === "system") {
      return systemPrefersDark ? "dark" : "light";
    }
    return theme;
  }, [theme, systemPrefersDark]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      try {
        window.localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore localStorage write errors
      }
    },
    [storageKey],
  );

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
