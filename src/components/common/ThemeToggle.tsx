import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/contexts/themeContextDef";

interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "라이트 모드", icon: Sun },
  { value: "dark", label: "다크 모드", icon: Moon },
  { value: "system", label: "시스템 설정 동기화", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      aria-label="테마 선택"
      className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-inner"
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={`relative flex items-center justify-center rounded-lg p-1.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isSelected
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
