import { useState } from "react";
import { OFFLINE_CAPABILITIES, useNetworkStatus } from "@/lib/pwa";

interface OfflineStatusBannerProps {
  /** 테스트 또는 미리보기용 강제 오프라인 플래그 */
  forceOffline?: boolean;
}

export function OfflineStatusBanner({ forceOffline }: OfflineStatusBannerProps) {
  const { isOnline, reconnected, dismissReconnected } = useNetworkStatus();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const effectiveOnline = forceOffline !== undefined ? !forceOffline : isOnline;

  if (effectiveOnline && !reconnected) {
    return null;
  }

  if (effectiveOnline && reconnected) {
    return (
      <output
        aria-live="polite"
        data-testid="online-reconnected-banner"
        className="no-print block w-full border-b border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/95 dark:bg-emerald-950/90 px-4 py-2 text-xs text-emerald-900 dark:text-emerald-200"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-semibold">
              네트워크 연결이 복구되었습니다. Gemini AI 분석을 포함한 모든 온라인 기능을 사용할 수 있습니다.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissReconnected}
            aria-label="네트워크 복구 알림 닫기"
            data-testid="dismiss-reconnected-btn"
            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
          >
            닫기
          </button>
        </div>
      </output>
    );
  }

  return (
    <output
      aria-live="polite"
      data-testid="offline-status-banner"
      className="no-print block w-full border-b border-amber-200 dark:border-amber-800/80 bg-amber-50/95 dark:bg-amber-950/90 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 animate-pulse"
              aria-hidden="true"
            />
            <span className="font-bold text-amber-900 dark:text-amber-200">
              오프라인 모드 동작 중
            </span>
            <span className="text-amber-800 dark:text-amber-300">
              네트워크 연결이 없어도 로컬에 저장된 카드 카탈로그·내 카드·혜택 시뮬레이터를 그대로 이용할 수 있습니다.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsGuideOpen((prev) => !prev)}
            aria-expanded={isGuideOpen}
            data-testid="offline-guide-toggle-btn"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/90 dark:bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200 transition hover:bg-amber-100/70 dark:hover:bg-amber-900/50"
          >
            <span>{isGuideOpen ? "오프라인 동작 가이드 접기" : "오프라인 동작 가이드 보기"}</span>
            <span aria-hidden="true">{isGuideOpen ? "▲" : "▼"}</span>
          </button>
        </div>

        {isGuideOpen && (
          <div
            data-testid="offline-guide-panel"
            className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-white/95 dark:bg-slate-900/90 p-3.5 text-slate-800 dark:text-slate-200 shadow-xs"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                📱 PWA 오프라인 동작 가이드
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                홈 화면에 앱으로 추가(Add to Home Screen)하면 주소창 없이 실행됩니다.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OFFLINE_CAPABILITIES.map((item) => (
                <div
                  key={item.id}
                  data-testid={`offline-capability-${item.id}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-2.5"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.feature}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                      item.availableOffline
                        ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {item.availableOffline ? "오프라인 가능" : "온라인 필요"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </output>
  );
}
