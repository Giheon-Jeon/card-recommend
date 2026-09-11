import { useMemo, useState, useRef, useEffect } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { useMyCards, downloadMyCardsBackup, parseAndValidateMyCardsBackup } from "@/lib/myCards";
import { catalogCards } from "@/lib/loadCatalog";
import { formatWon } from "@/lib/format";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";

interface MyCardsPageProps {
  myCards: ReturnType<typeof useMyCards>;
}

export function MyCardsPage({ myCards }: MyCardsPageProps) {
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const entries = useMemo(() => {
    const idSet = new Set(myCards.ids);
    return catalogCards.filter((c) => idSet.has(c.sourceId));
  }, [myCards.ids]);

  const totalAnnualFee = entries.reduce((sum, c) => sum + (c.annualFee ?? 0), 0);
  const knownFeeCount = entries.filter((c) => c.annualFee !== undefined).length;

  const handleBackupDownload = () => {
    if (myCards.ids.length === 0) {
      setToast({ type: "error", message: "백업할 카드가 없습니다." });
      return;
    }
    downloadMyCardsBackup(myCards.ids);
    setToast({ type: "success", message: "내 카드 목록 백업 파일이 다운로드되었습니다." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseAndValidateMyCardsBackup(text);
      if (!result.success) {
        setToast({ type: "error", message: result.error });
      } else {
        const added = myCards.importIds(result.cardIds, "merge");
        setToast({
          type: "success",
          message: `카드 ${result.count}장을 성공적으로 불러왔습니다. (신규 추가: ${added}장)`,
        });
      }
    } catch {
      setToast({ type: "error", message: "파일을 읽는 도중 오류가 발생했습니다." });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        data-testid="my-cards-file-input"
        onChange={handleFileUpload}
      />

      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm shadow-sm transition ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
            <p className="font-medium">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-3 text-xs font-semibold opacity-70 hover:opacity-100"
            aria-label="알림 닫기"
          >
            ✕
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl">
            🗂️
          </div>
          <p className="text-sm font-medium text-slate-600">아직 담아둔 카드가 없습니다.</p>
          <p className="max-w-sm text-xs text-slate-400">
            카드 갤러리에서 카드 우측 상단의 + 버튼을 눌러 내 카드에 추가하거나, 백업해둔 JSON 파일을 불러와 보세요.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              백업 파일 불러오기 (JSON)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">내 카드</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBackupDownload}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
                    title="내 카드 목록을 JSON 파일로 백업"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    백업 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
                    title="JSON 파일에서 내 카드 목록 불러오기"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    불러오기
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                보유 중이거나 관심 있는 카드 {entries.length}장을 담아뒀어요.
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-2 text-right">
              <p className="text-xs text-indigo-500">
                연회비 합계{knownFeeCount < entries.length ? " (정보 있는 카드만)" : ""}
              </p>
              <p className="text-lg font-bold text-indigo-700">{formatWon(totalAnnualFee)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <div
                key={entry.sourceId}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="flex flex-1 flex-col gap-2 text-left"
                >
                  <p className="text-xs font-medium text-indigo-600">{entry.issuer || "카드사 미상"}</p>
                  <h3 className="text-sm font-semibold leading-snug text-slate-900">{entry.name}</h3>
                  {entry.benefitSummary && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {entry.benefitSummary}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1 text-sm">
                    <span className="text-xs text-slate-400">연회비</span>
                    <span className="font-semibold text-slate-900">
                      {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => myCards.remove(entry.sourceId)}
                  className="rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  내 카드에서 제거
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <CardDetailModal
        entry={selected}
        onClose={() => setSelected(null)}
        inMyCards={selected ? myCards.has(selected.sourceId) : false}
        onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
      />
    </section>
  );
}
