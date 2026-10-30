import { useState, useCallback, lazy, Suspense } from "react";
import { useMyCards } from "@/lib/myCards";
import { CatalogGallery } from "@/components/catalog/CatalogGallery";
import { GeminiApiKeyProvider } from "@/contexts/GeminiApiKeyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { OfflineStatusBanner } from "@/components/common/OfflineStatusBanner";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

const MyCardsPage = lazy(() =>
  import("@/components/catalog/MyCardsPage").then((m) => ({ default: m.MyCardsPage })),
);
const SimulatorPage = lazy(() =>
  import("@/components/SimulatorPage").then((m) => ({ default: m.SimulatorPage })),
);

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      <p className="text-sm text-slate-500 dark:text-slate-400">페이지를 불러오는 중입니다...</p>
    </div>
  );
}

type Tab = "gallery" | "myCards" | "simulator";

const TABS: { id: Tab; label: string; description: string; shortcutKey: string }[] = [
  { id: "gallery", label: "카드 갤러리", description: "국내 전체 카드 둘러보기", shortcutKey: "1" },
  { id: "myCards", label: "내 카드", description: "담아둔 카드 모아보기", shortcutKey: "2" },
  { id: "simulator", label: "혜택 시뮬레이터", description: "내 지출로 최적 카드 찾기", shortcutKey: "3" },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>("gallery");
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const myCards = useMyCards();

  const handleFocusSearch = useCallback(() => {
    setTab("gallery");
    setTimeout(() => {
      const searchEl = document.getElementById("catalog-search-input") as HTMLInputElement | null;
      searchEl?.focus();
    }, 0);
  }, []);

  const handleToggleCompare = useCallback(() => {
    setTab("gallery");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("card-tracker:toggle-compare"));
    }, 0);
  }, []);

  useGlobalShortcuts({
    onSelectTab: (nextTab) => setTab(nextTab),
    onFocusSearch: handleFocusSearch,
    onToggleCompare: handleToggleCompare,
    onToggleHelpModal: () => setIsShortcutsModalOpen((prev) => !prev),
    onEscape: () => setIsShortcutsModalOpen(false),
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <OfflineStatusBanner />
      <div className="no-print border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-2xl font-extrabold text-transparent">
                카드 혜택 트래커
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                전체 카드를 둘러보고, 내 지출 패턴에 맞는 카드를 추천받아 보세요.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                aria-label="키보드 단축키 도움말 열기"
                title="키보드 단축키 안내 (?)"
                data-testid="open-shortcuts-modal-btn"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs transition hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <span className="hidden sm:inline">단축키</span>
                <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                  ?
                </kbd>
              </button>
              <ThemeToggle />
            </div>
          </header>

          <nav className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-keyshortcuts={t.shortcutKey}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-start rounded-xl px-4 py-2.5 text-left transition ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {t.label}
                  {t.id === "myCards" && myCards.ids.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        tab === t.id
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300"
                      }`}
                    >
                      {myCards.ids.length}
                    </span>
                  )}
                </span>
                <span
                  className={`text-xs ${
                    tab === t.id ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {t.description}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Suspense fallback={<TabLoadingFallback />}>
          {tab === "gallery" && <CatalogGallery myCards={myCards} />}
          {tab === "myCards" && <MyCardsPage myCards={myCards} />}
          {tab === "simulator" && (
            <SimulatorPage myCards={myCards} onGoToGallery={() => setTab("gallery")} />
          )}
        </Suspense>
      </main>

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GeminiApiKeyProvider>
          <AppContent />
        </GeminiApiKeyProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
