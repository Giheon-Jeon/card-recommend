import { parseWithGemini, validateImageFile } from "@/lib/importerParser";
import type { ParsedSpendingItem } from "@/types/importer";

export const MAX_BATCH_RECEIPT_COUNT = 10;
export const DEFAULT_BATCH_DELAY_MS = 350;

export type BatchReceiptStatus = "pending" | "processing" | "completed" | "error";

export interface BatchReceiptItem {
  id: string;
  file: File;
  previewUrl: string;
  status: BatchReceiptStatus;
  errorMessage?: string;
  parsedItems?: ParsedSpendingItem[];
}

export interface BatchValidationResult {
  validFiles: File[];
  errors: string[];
}

export interface ProcessBatchCallbacks {
  onItemStart?: (item: BatchReceiptItem, index: number, total: number) => void;
  onItemComplete?: (updatedItem: BatchReceiptItem, index: number, total: number) => void;
  onProgress?: (completedCount: number, totalCount: number, currentItem?: BatchReceiptItem) => void;
}

export interface ProcessBatchOptions {
  delayMs?: number;
  callbacks?: ProcessBatchCallbacks;
  signal?: AbortSignal;
}

/**
 * File 객체로부터 BatchReceiptItem을 생성합니다.
 */
export function createBatchReceiptItem(file: File, id?: string): BatchReceiptItem {
  const itemId = id || `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  let previewUrl = "";
  try {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      previewUrl = URL.createObjectURL(file);
    }
  } catch {
    previewUrl = "";
  }

  return {
    id: itemId,
    file,
    previewUrl,
    status: "pending",
  };
}

/**
 * 업로드할 영수증 파일들의 개수 및 개별 유효성을 검증합니다.
 */
export function validateBatchFiles(
  incomingFiles: File[],
  existingCount: number = 0,
  maxCount: number = MAX_BATCH_RECEIPT_COUNT
): BatchValidationResult {
  const errors: string[] = [];
  const validFiles: File[] = [];

  const availableSlots = Math.max(0, maxCount - existingCount);

  if (availableSlots === 0) {
    errors.push(`영수증은 한 번에 최대 ${maxCount}장까지만 대기 큐에 등록할 수 있습니다.`);
    return { validFiles: [], errors };
  }

  const filesToProcess = incomingFiles.slice(0, availableSlots);
  if (incomingFiles.length > availableSlots) {
    errors.push(`최대 ${maxCount}장 한도를 초과한 ${incomingFiles.length - availableSlots}장의 파일은 제외되었습니다.`);
  }

  const isSingle = filesToProcess.length === 1 && existingCount === 0;

  for (const file of filesToProcess) {
    const valResult = validateImageFile(file);
    if (!valResult.isValid) {
      const errMsg = valResult.error || "올바르지 않은 이미지 파일입니다.";
      errors.push(isSingle ? errMsg : `[${file.name}] ${errMsg}`);
    } else {
      validFiles.push(file);
    }
  }

  return { validFiles, errors };
}

/**
 * 지연 함수 (Rate Limit 완충용)
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("분석 작업이 중단되었습니다."));
    }
    const timer = setTimeout(() => resolve(), ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("분석 작업이 중단되었습니다."));
        },
        { once: true }
      );
    }
  });
}

/**
 * 단일 영수증 이미지 분석 및 상태 갱신
 */
export async function parseSingleReceiptItem(
  item: BatchReceiptItem,
  apiKey: string
): Promise<BatchReceiptItem> {
  try {
    const items = await parseWithGemini(apiKey, undefined, item.file);
    const taggedItems = items.map((it, idx) => ({
      ...it,
      id: `${item.id}-item-${idx}`,
      sourceReceiptId: item.id,
    }));

    return {
      ...item,
      status: "completed",
      parsedItems: taggedItems,
      errorMessage: undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "영수증 이미지 분석에 실패했습니다.";
    return {
      ...item,
      status: "error",
      errorMessage: message,
    };
  }
}

/**
 * Gemini API Rate Limit 방지를 위해 큐에 담긴 영수증 목록을 비동기 순차 처리합니다.
 */
export async function processReceiptBatchSequentially(
  items: BatchReceiptItem[],
  apiKey: string,
  options: ProcessBatchOptions = {}
): Promise<BatchReceiptItem[]> {
  const { delayMs = DEFAULT_BATCH_DELAY_MS, callbacks, signal } = options;
  const results: BatchReceiptItem[] = [...items];
  const total = results.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      break;
    }

    const current = results[i];
    // 이미 완료된 건은 건너뜀 (재시도 플로우 대비)
    if (current.status === "completed") {
      continue;
    }

    results[i] = { ...current, status: "processing", errorMessage: undefined };
    callbacks?.onItemStart?.(results[i], i, total);
    callbacks?.onProgress?.(i, total, results[i]);

    const updated = await parseSingleReceiptItem(results[i], apiKey);
    results[i] = updated;

    callbacks?.onItemComplete?.(updated, i, total);
    callbacks?.onProgress?.(i + 1, total, updated);

    // 마지막 항목이 아니며 중단되지 않은 경우 딜레이 부여
    if (i < total - 1 && !signal?.aborted) {
      await sleep(delayMs, signal);
    }
  }

  return results;
}

/**
 * 실패한 특정 영수증 항목만 개별 재시도합니다.
 */
export async function retryBatchReceiptItem(
  item: BatchReceiptItem,
  apiKey: string
): Promise<BatchReceiptItem> {
  const processingItem: BatchReceiptItem = {
    ...item,
    status: "processing",
    errorMessage: undefined,
  };
  return parseSingleReceiptItem(processingItem, apiKey);
}

/**
 * 다중 영수증에서 파싱된 모든 지출 항목을 하나로 병합하고 중복(동일 가맹점+금액)을 검사합니다.
 */
export function mergeAndDeduplicateItems(
  receiptItems: BatchReceiptItem[]
): {
  mergedItems: ParsedSpendingItem[];
  duplicateCount: number;
} {
  const allItems: ParsedSpendingItem[] = [];

  for (const receipt of receiptItems) {
    if (receipt.status === "completed" && receipt.parsedItems && receipt.parsedItems.length > 0) {
      allItems.push(...receipt.parsedItems);
    }
  }

  // 가맹점명(공백/소문자 정규화) + 금액(부호 포함) 키로 출현 횟수 계산
  const keyCountMap = new Map<string, number>();

  for (const item of allItems) {
    const normMerchant = item.merchant.trim().toLowerCase().replace(/\s+/g, "");
    const key = `${normMerchant}::${item.amount}`;
    keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
  }

  let duplicateCount = 0;
  const mergedItems = allItems.map((item) => {
    const normMerchant = item.merchant.trim().toLowerCase().replace(/\s+/g, "");
    const key = `${normMerchant}::${item.amount}`;
    const count = keyCountMap.get(key) || 0;
    const isDuplicate = count > 1;
    if (isDuplicate) {
      duplicateCount++;
    }
    return {
      ...item,
      isDuplicate,
    };
  });

  return {
    mergedItems,
    duplicateCount,
  };
}
