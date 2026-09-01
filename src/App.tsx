import { useState, lazy, Suspense } from "react";
import { useMyCards } from "@/lib/myCards";
import { CatalogGallery } from "@/components/catalog/CatalogGallery";
import { GeminiApiKeyProvider } from "@/contexts/GeminiApiKeyContext";

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
      <p className="text-sm text-slate-500">페이지를 불러오는 중입니다...</p>
    </div>
  );
}

type Tab = "gallery" | "myCards" | "simulator";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "gallery", label: "카드 갤러리", description: "국내 전체 카드 둘러보기" },
  { id: "myCards", label: "내 카드", description: "담아둔 카드 모아보기" },
  { id: "simulator", label: "혜택 시뮬레이터", description: "내 지출로 최적 카드 찾기" },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>("gallery");
  const myCards = useMyCards();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          <header>
            <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-extrabold text-transparent">
              카드 혜택 트래커
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              전체 카드를 둘러보고, 내 지출 패턴에 맞는 카드를 추천받아 보세요.
            </p>
          </header>

          <nav className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-start rounded-xl px-4 py-2.5 text-left transition ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {t.label}
                  {t.id === "myCards" && myCards.ids.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        tab === t.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                      }`}
                    >
                      {myCards.ids.length}
                    </span>
                  )}
                </span>
                <span className={`text-xs ${tab === t.id ? "text-indigo-100" : "text-slate-400"}`}>
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
    </div>
  );
}

export default function App() {
  return (
    <GeminiApiKeyProvider>
      <AppContent />
    </GeminiApiKeyProvider>
  );
}
