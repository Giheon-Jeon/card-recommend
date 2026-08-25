import { useState } from "react";
import { Settings, Key } from "lucide-react";

interface ApiKeySettingsProps {
  apiKey: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
}

/** 지출 내역 가져오기 화면 우측 상단의 Gemini API Key 등록/해제 버튼과 팝오버. */
export function ApiKeySettings({ apiKey, onChange, onSave, onRemove }: ApiKeySettingsProps) {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const hasKey = apiKey.trim().length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowKeyInput(!showKeyInput)}
        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all duration-250 ${
          hasKey
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <Settings className={`h-3.5 w-3.5 ${hasKey ? "text-emerald-600" : "text-slate-500"}`} />
        {hasKey ? "Gemini AI 활성화됨" : "Gemini API 설정"}
      </button>

      {showKeyInput && (
        <div className="absolute right-0 top-11 z-20 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl transition-all duration-300">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <Key className="h-4 w-4 text-indigo-500" />
            Gemini API Key 설정
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            무료 혹은 유료 Gemini API Key를 등록하면 영수증 이미지 분석 및 문맥 기반 AI 카테고리 매핑이 완전 로컬 환경에서 안전하게 동작합니다. (저장위치: LocalStorage)
          </p>

          <div className="mt-3.5 flex flex-col gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => onChange(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              {hasKey && (
                <button
                  onClick={() => {
                    onRemove();
                    setShowKeyInput(false);
                  }}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => {
                  onSave();
                  setShowKeyInput(false);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
