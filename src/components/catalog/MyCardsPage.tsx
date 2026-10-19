import { useMemo, useState, useRef, useEffect } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { useMyCards, downloadMyCardsBackup, parseAndValidateMyCardsBackup } from "@/lib/myCards";
import { catalogCards, categories } from "@/lib/loadCatalog";
import { formatWon } from "@/lib/format";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";
import { PerformanceProgressTracker } from "@/components/catalog/PerformanceProgressTracker";
import { getCardPerformanceTiers, calculatePerformanceProgress } from "@/lib/performanceTracker";
import { readStoredSpending } from "@/lib/spendingProfile";
import { useToast } from "@/hooks/useToast";

interface MyCardsPageProps {
  myCards: ReturnType<typeof useMyCards>;
}

export function MyCardsPage({ myCards }: MyCardsPageProps) {
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isImportModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsImportModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImportModalOpen]);

  const [globalSpend, setGlobalSpend] = useState<number>(500000);
  const [cardSpends, setCardSpends] = useState<Record<number, number>>({});
  const [editingCardSpendId, setEditingCardSpendId] = useState<number | null>(null);

  const handleLoadSimulatorSpend = () => {
    const stored = readStoredSpending(categories);
    const total = Object.values(stored).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      setGlobalSpend(total);
      toast.success(`시뮬레이터 지출 총액 ${formatWon(total)}을 불러왔습니다.`);
    } else {
      toast.info("시뮬레이터에 등록된 지출 내역이 없습니다. (0원)");
    }
  };

  const entries = useMemo(() => {
    const idSet = new Set(myCards.ids);
    return catalogCards.filter((c) => idSet.has(c.sourceId));
  }, [myCards.ids]);

  const totalAnnualFee = entries.reduce((sum, c) => sum + (c.annualFee ?? 0), 0);
  const knownFeeCount = entries.filter((c) => c.annualFee !== undefined).length;

  const cardPerformanceMap = useMemo(() => {
    const map = new Map<
      number,
      {
        tiers: number[];
        spend: number;
        progress: ReturnType<typeof calculatePerformanceProgress>;
      }
    >();

    for (const entry of entries) {
      const tiers = getCardPerformanceTiers(entry);
      const spend = cardSpends[entry.sourceId] ?? globalSpend;
      const progress = calculatePerformanceProgress(spend, tiers);
      map.set(entry.sourceId, { tiers, spend, progress });
    }
    return map;
  }, [entries, cardSpends, globalSpend]);

  const performanceOverview = useMemo(() => {
    let metCount = 0;
    let maxCount = 0;
    let unmetCount = 0;
    let noneCount = 0;

    for (const { progress } of cardPerformanceMap.values()) {
      if (progress.status === "max") {
        maxCount++;
        metCount++;
      } else if (progress.status === "met") {
        metCount++;
      } else if (progress.status === "unmet") {
        unmetCount++;
      } else {
        noneCount++;
      }
    }

    return {
      total: entries.length,
      metCount,
      maxCount,
      unmetCount,
      noneCount,
    };
  }, [cardPerformanceMap, entries.length]);

  const issuerStats = useMemo(() => {
    const map = new Map<string, { count: number; totalFee: number }>();
    for (const entry of entries) {
      const issuer = entry.issuer || "기타";
      const current = map.get(issuer) ?? { count: 0, totalFee: 0 };
      current.count += 1;
      current.totalFee += entry.annualFee ?? 0;
      map.set(issuer, current);
    }
    return Array.from(map.entries())
      .map(([issuer, stat]) => ({
        issuer,
        count: stat.count,
        totalFee: stat.totalFee,
      }))
      .sort((a, b) => b.count - a.count || b.totalFee - a.totalFee);
  }, [entries]);

  const handleClearAll = () => {
    if (myCards.ids.length === 0) return;
    if (window.confirm("담아둔 모든 카드를 삭제하시겠습니까?")) {
      myCards.clear();
      toast.info("담아둔 모든 카드를 삭제했습니다.");
    }
  };

  const handleBackupDownload = () => {
    if (myCards.ids.length === 0) {
      toast.error("백업할 카드가 없습니다.");
      return;
    }
    downloadMyCardsBackup(myCards.ids);
    toast.success("내 카드 목록 백업 파일이 다운로드되었습니다.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseAndValidateMyCardsBackup(text);
      if (!result.success) {
        toast.error(result.error);
      } else {
        const added = myCards.importIds(result.cardIds, importMode);
        if (importMode === "overwrite") {
          toast.success(`기존 카드를 대체하여 총 ${result.count}장을 불러왔습니다.`);
        } else {
          toast.success(`카드 ${result.count}장을 성공적으로 불러왔습니다. (신규 추가: ${added}장)`);
        }
        setIsImportModalOpen(false);
      }
    } catch {
      toast.error("파일을 읽는 도중 오류가 발생했습니다.");
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

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-2xl">
            🗂️
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">아직 담아둔 카드가 없습니다.</p>
          <p className="max-w-sm text-xs text-slate-400 dark:text-slate-500">
            카드 갤러리에서 카드 우측 상단의 + 버튼을 눌러 내 카드에 추가하거나, 백업해둔 JSON 파일을 불러와 보세요.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
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
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">내 카드</h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBackupDownload}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="내 카드 목록을 JSON 파일로 백업"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    백업 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="JSON 파일에서 내 카드 목록 불러오기"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    불러오기
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="담아둔 모든 카드 비우기"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    전체 비우기
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                보유 중이거나 관심 있는 카드 {entries.length}장을 담아뒀어요.
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 px-4 py-2 text-right">
              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                연회비 합계{knownFeeCount < entries.length ? " (정보 있는 카드만)" : ""}
              </p>
              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatWon(totalAnnualFee)}</p>
            </div>
          </div>

          {/* 실적 달성 현황 및 지출액 설정 바 */}
          <div
            data-testid="performance-tracker-control-bar"
            className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  전월 실적 트래커
                </span>
                <span
                  data-testid="overview-met-count"
                  className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  총 {entries.length}장 중 {performanceOverview.metCount}장 달성
                </span>
                {performanceOverview.maxCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    최고 혜택 {performanceOverview.maxCount}장
                  </span>
                )}
                {performanceOverview.unmetCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    미달성 {performanceOverview.unmetCount}장
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                월 지출액을 기준으로 보유 카드의 최소 실적 및 구간별 달성 현황을 실시간 추적합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs">
                <label htmlFor="global-monthly-spend" className="font-medium text-slate-500 dark:text-slate-400">
                  월 지출액:
                </label>
                <input
                  id="global-monthly-spend"
                  type="number"
                  step="10000"
                  min="0"
                  value={globalSpend}
                  onChange={(e) => setGlobalSpend(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-24 bg-transparent font-bold text-slate-900 dark:text-slate-100 outline-none text-right"
                  aria-label="이번 달 월 지출액 입력"
                />
                <span className="text-slate-400 dark:text-slate-500">원</span>
              </div>

              <button
                type="button"
                onClick={handleLoadSimulatorSpend}
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 shadow-xs transition hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                시뮬레이터 지출 가져오기
              </button>
            </div>
          </div>

          {issuerStats.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  카드사별 보유 현황
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">총 {issuerStats.length}개 카드사</span>
              </div>
              <div
                data-testid="issuer-stats-grid"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              >
                {issuerStats.map((stat) => (
                  <div
                    key={stat.issuer}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs transition hover:border-indigo-200 dark:hover:border-indigo-800"
                  >
                    <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400" title={stat.issuer}>
                      {stat.issuer}
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {stat.count}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">장</span>
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatWon(stat.totalFee)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const perf = cardPerformanceMap.get(entry.sourceId);
              const spend = perf?.spend ?? globalSpend;
              const tiers = perf?.tiers ?? [];
              const isEditing = editingCardSpendId === entry.sourceId;

              return (
                <div
                  key={entry.sourceId}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(entry)}
                    className="flex flex-1 flex-col gap-2 text-left"
                  >
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{entry.issuer || "카드사 미상"}</p>
                    <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{entry.name}</h3>
                    {entry.benefitSummary && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {entry.benefitSummary}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-1 text-sm">
                      <span className="text-xs text-slate-400 dark:text-slate-500">연회비</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
                      </span>
                    </div>
                  </button>

                  {/* 카드별 실적 트래커 및 개별 사용액 입력 위젯 */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">실적 산정 사용액</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="10000"
                            min="0"
                            defaultValue={spend}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = Math.max(0, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                                setCardSpends((prev) => ({ ...prev, [entry.sourceId]: val }));
                                setEditingCardSpendId(null);
                              } else if (e.key === "Escape") {
                                setEditingCardSpendId(null);
                              }
                            }}
                            onBlur={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setCardSpends((prev) => ({ ...prev, [entry.sourceId]: val }));
                              setEditingCardSpendId(null);
                            }}
                            ref={(el) => el?.focus()}
                            className="w-20 rounded border border-indigo-400 dark:border-indigo-600 px-1.5 py-0.5 text-right font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-[11px]"
                            aria-label={`${entry.name} 월 사용액 수정`}
                          />
                          <span className="text-[11px] text-slate-500">원</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCardSpendId(entry.sourceId)}
                          title="이 카드의 월 사용액 직접 수정"
                          className="group flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <span>{formatWon(spend)}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-indigo-500">✎</span>
                        </button>
                      )}
                    </div>

                    <PerformanceProgressTracker
                      currentSpend={spend}
                      tiers={tiers}
                      cardName={entry.name}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => myCards.remove(entry.sourceId)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    내 카드에서 제거
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CardDetailModal
        entry={selected}
        onClose={() => setSelected(null)}
        inMyCards={selected ? myCards.has(selected.sourceId) : false}
        onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
      />

      {isImportModalOpen && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="import-modal-title"
          className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-none bg-slate-900/50 p-4 backdrop-blur-xs"
        >
          <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex flex-col gap-1.5">
              <h3 id="import-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                내 카드 불러오기 방식 선택
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                백업 JSON 파일을 불러옵니다. 현재 담긴 카드({entries.length}장)에 복원할 방식을 선택해 주세요.
              </p>
            </div>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="sr-only">불러오기 모드 선택</legend>
              <label
                htmlFor="import-mode-merge"
                aria-label="기존 목록에 병합"
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  importMode === "merge"
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-600"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  id="import-mode-merge"
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={importMode === "merge"}
                  onChange={() => setImportMode("merge")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">기존 목록에 병합 (권장)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    현재 담아둔 카드를 유지하고 새로운 카드만 중복 없이 추가합니다.
                  </span>
                </div>
              </label>

              <label
                htmlFor="import-mode-overwrite"
                aria-label="기존 목록 덮어쓰기"
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  importMode === "overwrite"
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-600"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  id="import-mode-overwrite"
                  type="radio"
                  name="import-mode"
                  value="overwrite"
                  checked={importMode === "overwrite"}
                  onChange={() => setImportMode("overwrite")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">기존 목록 덮어쓰기</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    현재 담아둔 모든 카드를 삭제하고 백업 파일의 카드로 완전히 대체합니다.
                  </span>
                </div>
              </label>
            </fieldset>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-indigo-700"
              >
                JSON 파일 선택
              </button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
