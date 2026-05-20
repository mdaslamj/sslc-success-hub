/**
 * Theme provider — applies `light` / `dark` / `system` to <html>.
 * Reads from localStorage on boot for instant paint; syncs to/from the
 * signed-in user's UserSettings doc when available.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

/** Curated accent palette for personalization (mapped to oklch values). */
export const ACCENT_OPTIONS = [
  { id: "sage",     label: "Sage",     value: "oklch(0.78 0.06 140)" },
  { id: "forest",   label: "Forest",   value: "oklch(0.6 0.08 150)" },
  { id: "ocean",    label: "Ocean",    value: "oklch(0.7 0.08 220)" },
  { id: "sunrise",  label: "Sunrise",  value: "oklch(0.78 0.13 60)" },
  { id: "blush",    label: "Blush",    value: "oklch(0.78 0.08 20)" },
  { id: "lavender", label: "Lavender", value: "oklch(0.72 0.09 300)" },
] as const;
export type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];

type ThemeContextValue = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (m: ThemeMode) => void;
  accent: AccentId;
  setAccent: (a: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "vidyapath:theme";
const ACCENT_KEY = "vidyapath:accent";

function applyTheme(mode: ThemeMode): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const sys =
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const resolved = mode === "system" ? sys : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const [accent, setAccentState] = useState<AccentId>(() => {
    if (typeof window === "undefined") return "sage";
    return (localStorage.getItem(ACCENT_KEY) as AccentId) || "sage";
  });

  useEffect(() => {
    setResolved(applyTheme(theme));
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") setResolved(applyTheme("system"));
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const opt = ACCENT_OPTIONS.find((a) => a.id === accent) ?? ACCENT_OPTIONS[0];
    document.documentElement.style.setProperty("--accent-personal", opt.value);
  }, [accent]);

  const setTheme = useCallback((m: ThemeMode) => {
    setThemeState(m);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const setAccent = useCallback((a: AccentId) => {
    setAccentState(a);
    if (typeof window !== "undefined") localStorage.setItem(ACCENT_KEY, a);
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, accent, setAccent }),
    [theme, resolved, setTheme, accent, setAccent],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}