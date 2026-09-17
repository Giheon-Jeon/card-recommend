import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, ArrowRight, HelpCircle, Zap, RefreshCw, FileSpreadsheet } from "lucide-react";
import {
  parseTextLocally,
  parseWithGemini,
  validateImageFile,
  type ParsedSpendingItem,
} from "@/lib/importerParser";
import { parseCsvFile, validateCsvFile } from "@/lib/csvSpendingParser";
import type { Category } from "@/types/card";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { ParsedItemsTable } from "@/components/ParsedItemsTable";
import { useGeminiApiKey } from "@/hooks/useGeminiApiKey";
import { useToast } from "@/hooks/useToast";
import type { StorageType } from "@/contexts/geminiApiKeyContextDef";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface SpendingImporterProps {
  categories: Category[];
  onImport: (items: ParsedSpendingItem[], mode: "merge" | "overwrite") => void;
}

type TabType = "text" | "image" | "csv" | "demo";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function SpendingImporter({ categories, onImport }: SpendingImporterProps) {
  const [activeTab, setActiveTab] = useState<TabType>("demo");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 파싱된 지출 내역 임시 보관
  const [parsedItems, setParsedItems] = useState<ParsedSpendingItem[]>([]);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // CSV 명세서 업로드 상태
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isCsvDragOver, setIsCsvDragOver] = useState(false);

  const { apiKey: savedApiKey, storageType: savedStorageType, saveApiKey, removeApiKey } = useGeminiApiKey();
  const toast = useToast();
  const [draftApiKey, setDraftApiKey] = useState(savedApiKey);
  const [prevSavedApiKey, setPrevSavedApiKey] = useState(savedApiKey);

  if (savedApiKey !== prevSavedApiKey) {
    setPrevSavedApiKey(savedApiKey);
    setDraftApiKey(savedApiKey);
  }

  const handleSaveApiKey = (type?: StorageType) => {
    saveApiKey(draftApiKey.trim(), type);
    toast.success("Gemini API Key가 안전하게 저장되었습니다.");
  };

  const handleRemoveApiKey = () => {
    removeApiKey();
    setDraftApiKey("");
    toast.info("Gemini API Key가 삭제되었습니다.");
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
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setAnalysisError(validation.error || "올바르지 않은 파일입니다.");
      setSelectedFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  // CSV 드래그앤드롭 및 파싱 핸들러
  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCsvDragOver(true);
  };

  const handleCsvDragLeave = () => {
    setIsCsvDragOver(false);
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCsvDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCsvFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCsvFileChange(e.target.files[0]);
    }
  };

  const handleCsvFileChange = (file: File) => {
    const validation = validateCsvFile(file);
    if (!validation.isValid) {
      setAnalysisError(validation.error || "올바르지 않은 CSV 파일입니다.");
      setSelectedCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      return;
    }

    setSelectedCsvFile(file);
    setAnalysisError(null);
  };

  const clearCsvFile = () => {
    setSelectedCsvFile(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const handleAnalyzeCsv = async () => {
    if (!selectedCsvFile) {
      setAnalysisError("분석할 CSV 파일을 선택해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setParsedItems([]);

    try {
      const result = await parseCsvFile(selectedCsvFile);
      setParsedItems(result);
      toast.success(`CSV 명세서에서 ${result.length}건의 지출 내역을 성공적으로 추출했습니다.`);
    } catch (err) {
      setAnalysisError(toErrorMessage(err, "CSV 파일 분석 중 에러가 발생했습니다."));
    } finally {
      setIsAnalyzing(false);
    }
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

  const handleDeleteSelected = (indices: number[]) => {
    const set = new Set(indices);
    setParsedItems((prev) => prev.filter((_, i) => !set.has(i)));
  };

  const handleAddItem = () => {
    const defaultCategory = categories[0]?.id || "other";
    setParsedItems((prev) => [
      ...prev,
      { merchant: "", amount: 0, category: defaultCategory },
    ]);
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
      if (savedApiKey.trim()) {
        // Gemini API로 분석
        const result = await parseWithGemini(savedApiKey.trim(), textInput);
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

    if (!savedApiKey.trim()) {
      setAnalysisError("이미지 분석(OCR/AI)은 Gemini API Key 등록이 필요합니다. 우측 상단 설정을 눌러 Key를 입력해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setParsedItems([]);

    try {
      const result = await parseWithGemini(savedApiKey.trim(), undefined, selectedFile);
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
  const handleRunDemo = (demoType: "cafe" | "convenience" | "text" | "csv") => {
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
      } else if (demoType === "csv") {
        // 모의 카드사 CSV 파싱 결과
        setParsedItems([
          { merchant: "스타벅스 강남점", amount: 4500, category: "cafe" },
          { merchant: "이마트 역삼점", amount: 45000, category: "mart" },
          { merchant: "배달의민족", amount: 24000, category: "dining" },
          { merchant: "카카오T택시", amount: 12800, category: "transport" },
          { merchant: "스타벅스 강남점(취소)", amount: -4500, category: "cafe" },
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
    const hasInvalid = parsedItems.some((item) => !item.merchant.trim() || item.amount === 0);
    if (hasInvalid) {
      setAnalysisError("가맹점명이 비어있거나 금액이 0원인 항목이 있습니다. 확인 후 다시 시도해 주세요.");
      return;
    }
    onImport(parsedItems, importMode);
    toast.success(`지출 내역 ${parsedItems.length}건이 시뮬레이터에 성공적으로 반영되었습니다.`);
    // 상태 초기화
    setParsedItems([]);
    setTextInput("");
    clearFile();
    clearCsvFile();
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
          apiKey={draftApiKey}
          storageType={savedStorageType}
          onChange={setDraftApiKey}
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
          onClick={() => { setActiveTab("csv"); setAnalysisError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
            activeTab === "csv" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV 명세서
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
              API Key 없이도 이미 생성된 고화질 모의 영수증, 결제 내역 텍스트, 카드사 CSV 명세서 데이터를 분석해 볼 수 있습니다. 클릭하면 즉각 분석 시뮬레이션이 진행됩니다.
            </p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => handleRunDemo("csv")}
                className="group flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-250 hover:border-emerald-300 hover:bg-emerald-50/20 text-center"
              >
                <div className="mb-2.5 flex h-20 w-16 items-center justify-center rounded-md border border-dashed border-emerald-300 bg-white text-emerald-600 group-hover:scale-105 transition-transform shadow-sm">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-slate-700">카드사 CSV 명세서</span>
                <span className="mt-1 text-[10px] text-slate-400">신한/현대/삼성 등 (모의 5건)</span>
              </button>

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
                {savedApiKey.trim()
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

        {/* CSV TAB */}
        {activeTab === "csv" && (
          <div className="space-y-4">
            {/* 카드사 지원 배지 안내 */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">자동 인식 지원:</span>
              {["신한", "현대", "삼성", "KB국민", "롯데", "우리", "하나", "토스/뱅샐"].map((name) => (
                <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {name}
                </span>
              ))}
            </div>

            {!selectedCsvFile ? (
              <>
                <input
                  type="file"
                  ref={csvInputRef}
                  onChange={handleCsvFileSelect}
                  accept=".csv,.txt,text/csv,application/vnd.ms-excel"
                  aria-label="CSV 명세서 파일 선택"
                  className="hidden"
                />
                <button
                  type="button"
                  aria-label="카드사 결제 내역 CSV 파일 업로드"
                  onDragOver={handleCsvDragOver}
                  onDragLeave={handleCsvDragLeave}
                  onDrop={handleCsvDrop}
                  onClick={() => csvInputRef.current?.click()}
                  className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isCsvDragOver
                      ? "border-indigo-500 bg-indigo-50/20 scale-[0.98]"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                  }`}
                >
                  <FileSpreadsheet className="h-8 w-8 text-slate-400 mb-2 group-hover:text-indigo-500" />
                  <p className="text-xs font-bold text-slate-700">카드사 결제 내역 CSV 파일 업로드</p>
                  <p className="mt-1 text-[10px] text-slate-400">최대 5MB, UTF-8 및 EUC-KR(CP949) 인코딩 자동 감지</p>
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-center rounded-xl border border-slate-200 p-3 bg-slate-50/30">
                <div className="flex h-20 w-18 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-xs">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div className="flex-1 w-full text-center sm:text-left space-y-2">
                  <div className="text-xs font-semibold text-slate-700 truncate">
                    파일 준비됨: {selectedCsvFile.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    크기: {(selectedCsvFile.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <button
                      onClick={clearCsvFile}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-50"
                    >
                      파일 교체
                    </button>
                    <button
                      onClick={handleAnalyzeCsv}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          CSV 분석 중...
                        </>
                      ) : (
                        <>
                          CSV 분석 시작
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
              <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                카드사 웹사이트(신한, 현대, 삼성, KB국민 등)의 결제/승인내역 페이지에서 다운로드한 CSV 파일을 그대로 업로드하세요. 가맹점명, 승인금액 및 환불/취소 내역을 자동으로 판별하여 카테고리별로 분류합니다.
              </div>
            </div>
          </div>
        )}

        {/* IMAGE TAB */}
        {activeTab === "image" && (
          <div className="space-y-4">
            {!imagePreview ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
                  aria-label="이미지 파일 선택"
                  className="hidden"
                />
                <button
                  type="button"
                  aria-label="영수증 또는 이용 명세서 캡처 이미지 업로드"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-50/20 scale-[0.98]"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                  }`}
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2 group-hover:text-indigo-500" />
                  <p className="text-xs font-bold text-slate-700">영수증 또는 이용 명세서 캡처 업로드</p>
                  <p className="mt-1 text-[10px] text-slate-400">최대 10MB, JPG/PNG/WebP 지원</p>
                </button>
              </>
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
            {!savedApiKey.trim() && (
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
            onDeleteSelected={handleDeleteSelected}
            onAddItem={handleAddItem}
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
