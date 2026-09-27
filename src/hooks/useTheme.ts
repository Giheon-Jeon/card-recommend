import { useContext } from "react";
import { ThemeContext } from "@/contexts/themeContextDef";
import type { ThemeContextType } from "@/contexts/themeContextDef";

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
