import { useState, useEffect, useRef } from "react";
import { Upload, FileText, AlertCircle, ArrowRight, HelpCircle, Zap, RefreshCw } from "lucide-react";
import { parseTextLocally, parseWithGemini, type ParsedSpendingItem } from "@/lib/importerParser";
import type { Category } from "@/types/card";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { ParsedItemsTable } from "@/components/ParsedItemsTable";
import { useGeminiApiKey } from "@/contexts/GeminiApiKeyContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface SpendingImporterProps {
  categories: Category[];
  onImport: (items: ParsedSpendingItem[], mode: "merge" | "overwrite") => void;
}

type TabType = "text" | "image" | "demo";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function SpendingImporter({ categories, onImport }: SpendingImporterProps) {
  const [activeTab, setActiveTab] = useState<TabType>("demo");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 파싱된 지출 내역 임시 보관
  const [parsedItems, setParsedItems] = useState<ParsedSpendingItem[]>([]);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { apiKey: savedApiKey, saveApiKey, removeApiKey } = useGeminiApiKey();

  // Sync with global key changes
  useEffect(() => {
    setApiKey(savedApiKey);
  }, [savedApiKey]);

  const handleSaveApiKey = () => {
    saveApiKey(apiKey.trim());
  };

  const handleRemoveApiKey = () => {
    removeApiKey();
    setApiKey("");
  };

  // 이미지 드래그앤드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalysisError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setSelectedFile(file);
    setAnalysisError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 파싱 결과 개별 수정/삭제 핸들러
  const handleUpdateItem = <K extends keyof ParsedSpendingItem>(
    index: number,
    field: K,
    value: ParsedSpendingItem[K],
  ) => {
    setParsedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 텍스트 분석 실행
  const handleAnalyzeText = async () => {
    if (!textInput.trim()) {
      setAnalysisError("지출 내역 텍스트를 입력해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setParsedItems([]);

    try {
      if (apiKey.trim()) {
        // Gemini API로 분석
        const result = await parseWithGemini(apiKey.trim(), textInput);
        setParsedItems(result);
      } else {
        // 로컬 키워드 분석
        const result = parseTextLocally(textInput);
        if (result.length === 0) {
          setAnalysisError("텍스트에서 인식 가능한 금액이나 결제 내역을 찾지 못했습니다. Gemini API Key를 등록하면 정확한 분석이 가능합니다.");
        } else {
          setParsedItems(result);
        }
      }
    } catch (err) {
      setAnalysisError(toErrorMessage(err, "텍스트 분석 중 에러가 발생했습니다."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 이미지 분석 실행
  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      setAnalysisError("분석할 이미지 파일을 선택해 주세요.");
      return;
    }

    if (!apiKey.trim()) {
      setAnalysisError("이미지 분석(OCR/AI)은 Gemini API Key 등록이 필요합니다. 우측 상단 설정을 눌러 Key를 입력해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setParsedItems([]);

    try {
      const result = await parseWithGemini(apiKey.trim(), undefined, selectedFile);
      if (result.length === 0) {
        setAnalysisError("이미지에서 지출 내역을 추출하지 못했습니다.");
      } else {
        setParsedItems(result);
      }
    } catch (err) {
      setAnalysisError(toErrorMessage(err, "이미지 분석 중 에러가 발생했습니다."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 데모 실행 (API Key 없이 기능을 체험할 수 있도록 미리 준비된 결과를 흉내낸 딜레이 후 표시)
  const handleRunDemo = (demoType: "cafe" | "convenience" | "text") => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setParsedItems([]);

    setTimeout(() => {
      setIsAnalyzing(false);
      if (demoType === "cafe") {
        setParsedItems([
          { merchant: "소담 커피", amount: 4500, category: "cafe" },
          { merchant: "소담 커피(라떼)", amount: 5000, category: "cafe" },
          { merchant: "소담 커피(케이크)", amount: 6500, category: "cafe" },
        ]);
      } else if (demoType === "convenience") {
        setParsedItems([
          { merchant: "GS25 강남역점(삼각김밥)", amount: 1200, category: "convenience" },
          { merchant: "GS25 강남역점(우유)", amount: 1700, category: "convenience" },
          { merchant: "GS25 강남역점(라면)", amount: 1500, category: "convenience" },
          { merchant: "GS25 강남역점(샌드위치)", amount: 2500, category: "convenience" },
        ]);
      } else {
        // 복합 텍스트 데모
        setParsedItems([
          { merchant: "스타벅스", amount: 12000, category: "cafe" },
          { merchant: "배달의민족(엽기떡볶이)", amount: 24000, category: "dining" },
          { merchant: "지하철 대중교통", amount: 55000, category: "transport" },
          { merchant: "쿠팡 결제", amount: 42900, category: "onlineShopping" },
        ]);
      }
    }, 1200); // 1.2초 모의 딜레이
  };

  // 최종 지출 시뮬레이터에 적용
  const handleApply = () => {
    if (parsedItems.length === 0) return;
    onImport(parsedItems, importMode);
    // 상태 초기화
    setParsedItems([]);
    setTextInput("");
    clearFile();
  };

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Zap className="h-5 w-5 text-indigo-500 fill-indigo-100" />
            외부 지출 내역 가져오기
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            결제 문자 내역이나 영수증 이미지를 업로드하여 이번 달 지출 금액을 원클릭으로 정리하세요.
          </p>
        </div>

        <ApiKeySettings
          apiKey={apiKey}
          onChange={setApiKey}
          onSave={handleSaveApiKey}
          onRemove={handleRemoveApiKey}
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100/70 p-1">
        <button
          onClick={() => { setActiveTab("demo"); setAnalysisError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
            activeTab === "demo" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          체험용 데모
        </button>
        <button
          onClick={() => { setActiveTab("text"); setAnalysisError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
            activeTab === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          결제 내역 텍스트
        </button>
        <button
          onClick={() => { setActiveTab("image"); setAnalysisError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
            activeTab === "image" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          영수증 이미지
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-5 min-h-[160px]">
        {/* DEMO TAB */}
        {activeTab === "demo" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              API Key 없이도 이미 생성된 고화질 모의 영수증과 결제 내역 텍스트 데이터를 분석해 볼 수 있습니다. 클릭하면 즉각 분석 시뮬레이션이 진행됩니다.
            </p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <button
                onClick={() => handleRunDemo("cafe")}
                className="group flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-250 hover:border-indigo-300 hover:bg-indigo-50/20 text-center"
              >
                <div className="relative mb-2.5 h-20 w-16 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <img src="/demo/cafe-receipt.jpg" alt="Cafe Receipt" className="h-full w-full object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-700">커피 전문점 영수증</span>
                <span className="mt-1 text-[10px] text-slate-400">카페/디저트 (16,000원)</span>
              </button>

              <button
                onClick={() => handleRunDemo("convenience")}
                className="group flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-250 hover:border-indigo-300 hover:bg-indigo-50/20 text-center"
              >
                <div className="relative mb-2.5 h-20 w-16 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <img src="/demo/convenience-receipt.jpg" alt="Convenience Receipt" className="h-full w-full object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-700">편의점 간식 영수증</span>
                <span className="mt-1 text-[10px] text-slate-400">편의점 (6,900원)</span>
              </button>

              <button
                onClick={() => handleRunDemo("text")}
                className="group flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-250 hover:border-indigo-300 hover:bg-indigo-50/20 text-center"
              >
                <div className="mb-2.5 flex h-20 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-indigo-500 group-hover:text-indigo-600 shadow-sm">
                  <FileText className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-slate-700">이용 문자 내역</span>
                <span className="mt-1 text-[10px] text-slate-400">쇼핑, 식비, 교통 등 (다중)</span>
              </button>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="예시:&#10;[신한체크승인] 전기헌 08/23 14:15 GS25강남역점 4,500원&#10;[현대카드] 전기헌 08/22 19:30 스타벅스 12,000원 일시불&#10;카카오택시 결제금액 16,800원"
              className="h-32 w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                {apiKey.trim()
                  ? "✨ Gemini AI 분석기가 텍스트를 문맥 분석합니다."
                  : "💡 API Key 미등록 시, 기본 키워드 매칭 규칙으로 간단 파싱합니다."}
              </span>
              <button
                onClick={handleAnalyzeText}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    분석 실행
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* IMAGE TAB */}
        {activeTab === "image" && (
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? "border-indigo-500 bg-indigo-50/20 scale-[0.98]"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-slate-400 mb-2 group-hover:text-indigo-500" />
                <p className="text-xs font-bold text-slate-700">영수증 또는 이용 명세서 캡처 업로드</p>
                <p className="mt-1 text-[10px] text-slate-400">클릭하거나 이미지 파일을 여기로 드래그하세요 (PNG, JPG)</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-center rounded-xl border border-slate-200 p-3 bg-slate-50/30">
                <div className="relative h-28 w-24 overflow-hidden rounded-md border border-slate-300 bg-white">
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 w-full text-center sm:text-left space-y-2">
                  <div className="text-xs font-semibold text-slate-700 truncate">
                    파일 준비됨: {selectedFile?.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    크기: {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <button
                      onClick={clearFile}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-50"
                    >
                      파일 교체
                    </button>
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          AI 분석 중...
                        </>
                      ) : (
                        <>영수증 분석 시작</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!apiKey.trim() && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-[11px] text-amber-800 leading-relaxed">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>알림:</strong> 이미지 OCR 분석을 실행하려면 **Gemini API Key** 등록이 필요합니다. 우측 상단의 <strong>Gemini API 설정</strong> 버튼을 눌러 키를 입력해 주세요. (또는 <strong>체험용 데모</strong> 탭을 클릭하여 미리 준비된 영수증으로 빠르게 연동 테스트를 진행할 수 있습니다.)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Error Warning */}
      {analysisError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Shimmer loading when analyzing */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <div className="text-sm font-bold text-slate-800 animate-pulse">지출 내역 분석 및 카테고리 매핑 중...</div>
            <div className="text-[10px] text-slate-500">Gemini 2.0 Flash AI가 지출 항목을 파싱하고 있습니다.</div>
          </div>
        </div>
      )}

      {/* Parsing Result Table / Preview */}
      {parsedItems.length > 0 && (
        <ErrorBoundary
          fallbackTitle="지출 내역 표 오류"
          fallbackMessage="파싱된 지출 내역 표를 렌더링하는 중 문제가 발생했습니다."
          onReset={() => setParsedItems([])}
        >
          <ParsedItemsTable
            categories={categories}
            items={parsedItems}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            importMode={importMode}
            onImportModeChange={setImportMode}
            onCancel={() => setParsedItems([])}
            onApply={handleApply}
          />
        </ErrorBoundary>
      )}
    </section>
  );
}
