import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBatchReceiptItem,
  validateBatchFiles,
  processReceiptBatchSequentially,
  retryBatchReceiptItem,
  mergeAndDeduplicateItems,
  MAX_BATCH_RECEIPT_COUNT,
  type BatchReceiptItem,
} from "@/lib/batchReceiptOcr";
import * as importerParser from "@/lib/importerParser";

function createMockFile(name: string, size: number, type: string = "image/jpeg"): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("batchReceiptOcr unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createBatchReceiptItem", () => {
    it("File 객체로부터 pending 상태의 BatchReceiptItem을 생성한다", () => {
      const file = createMockFile("receipt1.jpg", 1024);
      const item = createBatchReceiptItem(file);

      expect(item.id).toBeDefined();
      expect(item.file).toBe(file);
      expect(item.status).toBe("pending");
      expect(item.parsedItems).toBeUndefined();
      expect(item.errorMessage).toBeUndefined();
    });

    it("지정된 id가 주어지면 해당 id를 사용한다", () => {
      const file = createMockFile("receipt1.jpg", 1024);
      const item = createBatchReceiptItem(file, "custom-id-123");
      expect(item.id).toBe("custom-id-123");
    });
  });

  describe("validateBatchFiles", () => {
    it("정상적인 이미지 파일들을 검증 통과시킨다", () => {
      const files = [
        createMockFile("rec1.jpg", 1024, "image/jpeg"),
        createMockFile("rec2.png", 2048, "image/png"),
      ];
      const result = validateBatchFiles(files, 0);

      expect(result.validFiles).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("허용되지 않은 확장자나 MIME 타입의 파일은 에러로 처리한다", () => {
      const files = [
        createMockFile("rec1.pdf", 1024, "application/pdf"),
        createMockFile("rec2.jpg", 1024, "image/jpeg"),
      ];
      const result = validateBatchFiles(files, 0);

      expect(result.validFiles).toHaveLength(1);
      expect(result.validFiles[0].name).toBe("rec2.jpg");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("rec1.pdf");
    });

    it("최대 개수(10장)를 초과하는 파일은 제외하고 안내 메시지를 반환한다", () => {
      const files = Array.from({ length: 12 }, (_, i) =>
        createMockFile(`rec${i + 1}.jpg`, 1024, "image/jpeg")
      );
      const result = validateBatchFiles(files, 0, MAX_BATCH_RECEIPT_COUNT);

      expect(result.validFiles).toHaveLength(10);
      expect(result.errors.some((e) => e.includes("한도를 초과한 2장의 파일은 제외"))).toBe(true);
    });

    it("기존 큐가 이미 10장 찼을 때 추가 파일 시도 시 전원 거부한다", () => {
      const files = [createMockFile("extra.jpg", 1024, "image/jpeg")];
      const result = validateBatchFiles(files, 10, MAX_BATCH_RECEIPT_COUNT);

      expect(result.validFiles).toHaveLength(0);
      expect(result.errors[0]).toContain("최대 10장까지만");
    });
  });

  describe("processReceiptBatchSequentially", () => {
    it("모든 영수증을 순차적으로 분석하며 콜백을 적절히 호출한다", async () => {
      const parseSpy = vi.spyOn(importerParser, "parseWithGemini").mockImplementation(async (_key, _text, file) => {
        return [
          {
            merchant: `${file?.name} 상점`,
            amount: 5000,
            category: "cafe",
          },
        ];
      });

      const file1 = createMockFile("r1.jpg", 100);
      const file2 = createMockFile("r2.jpg", 100);
      const queue: BatchReceiptItem[] = [
        createBatchReceiptItem(file1, "id-1"),
        createBatchReceiptItem(file2, "id-2"),
      ];

      const startOrder: string[] = [];
      const completeOrder: string[] = [];
      const progressList: number[] = [];

      const results = await processReceiptBatchSequentially(queue, "test-api-key", {
        delayMs: 10,
        callbacks: {
          onItemStart: (item) => startOrder.push(item.id),
          onItemComplete: (item) => completeOrder.push(item.id),
          onProgress: (comp) => progressList.push(comp),
        },
      });

      expect(parseSpy).toHaveBeenCalledTimes(2);
      expect(startOrder).toEqual(["id-1", "id-2"]);
      expect(completeOrder).toEqual(["id-1", "id-2"]);
      expect(results[0].status).toBe("completed");
      expect(results[0].parsedItems?.[0].merchant).toBe("r1.jpg 상점");
      expect(results[1].status).toBe("completed");
      expect(results[1].parsedItems?.[0].merchant).toBe("r2.jpg 상점");
    });

    it("개별 항목 분석 실패 시 에러 상태를 기록하고 다음 항목 분석을 중단 없이 계속 진행한다", async () => {
      let callCount = 0;
      vi.spyOn(importerParser, "parseWithGemini").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Gemini OCR Rate Limit 초과");
        }
        return [{ merchant: "성공 상점", amount: 10000, category: "dining" }];
      });

      const file1 = createMockFile("fail.jpg", 100);
      const file2 = createMockFile("success.jpg", 100);
      const queue: BatchReceiptItem[] = [
        createBatchReceiptItem(file1, "id-fail"),
        createBatchReceiptItem(file2, "id-success"),
      ];

      const results = await processReceiptBatchSequentially(queue, "test-key", { delayMs: 5 });

      expect(results[0].status).toBe("error");
      expect(results[0].errorMessage).toContain("Rate Limit");
      expect(results[1].status).toBe("completed");
      expect(results[1].parsedItems).toHaveLength(1);
    });

    it("AbortSignal이 전달되면 작업을 즉시 중단한다", async () => {
      vi.spyOn(importerParser, "parseWithGemini").mockResolvedValue([
        { merchant: "상점", amount: 1000, category: "mart" },
      ]);

      const controller = new AbortController();
      const files = [
        createMockFile("f1.jpg", 100),
        createMockFile("f2.jpg", 100),
        createMockFile("f3.jpg", 100),
      ];
      const queue = files.map((f, i) => createBatchReceiptItem(f, `id-${i}`));

      const promise = processReceiptBatchSequentially(queue, "key", {
        delayMs: 50,
        signal: controller.signal,
        callbacks: {
          onItemComplete: (_, index) => {
            if (index === 0) {
              controller.abort();
            }
          },
        },
      });

      const results = await promise;
      expect(results[0].status).toBe("completed");
      expect(results[1].status).toBe("pending");
      expect(results[2].status).toBe("pending");
    });
  });

  describe("retryBatchReceiptItem", () => {
    it("실패했던 항목을 다시 분석하여 성공 상태로 변경한다", async () => {
      vi.spyOn(importerParser, "parseWithGemini").mockResolvedValue([
        { merchant: "재시도 성공", amount: 7700, category: "cafe" },
      ]);

      const file = createMockFile("retry.jpg", 100);
      const failedItem: BatchReceiptItem = {
        id: "retry-1",
        file,
        previewUrl: "",
        status: "error",
        errorMessage: "네트워크 오류",
      };

      const updated = await retryBatchReceiptItem(failedItem, "test-key");

      expect(updated.status).toBe("completed");
      expect(updated.errorMessage).toBeUndefined();
      expect(updated.parsedItems?.[0].merchant).toBe("재시도 성공");
    });
  });

  describe("mergeAndDeduplicateItems", () => {
    it("여러 영수증의 완료된 항목을 통합하고 동일 가맹점+금액 항목을 중복으로 감지한다", () => {
      const items: BatchReceiptItem[] = [
        {
          id: "r1",
          file: createMockFile("1.jpg", 10),
          previewUrl: "",
          status: "completed",
          parsedItems: [
            { merchant: "스타벅스 강남점", amount: 4500, category: "cafe" },
            { merchant: "GS25", amount: 3000, category: "convenience" },
          ],
        },
        {
          id: "r2",
          file: createMockFile("2.jpg", 10),
          previewUrl: "",
          status: "completed",
          parsedItems: [
            // 동일 가맹점(공백 차이 허용), 동일 금액 -> 중복
            { merchant: "스타벅스강남점", amount: 4500, category: "cafe" },
            { merchant: "이마트", amount: 50000, category: "mart" },
          ],
        },
        {
          id: "r3",
          file: createMockFile("3.jpg", 10),
          previewUrl: "",
          status: "error",
          errorMessage: "실패",
        },
      ];

      const { mergedItems, duplicateCount } = mergeAndDeduplicateItems(items);

      expect(mergedItems).toHaveLength(4);
      expect(duplicateCount).toBe(2);

      const dupItems = mergedItems.filter((it) => it.isDuplicate);
      expect(dupItems).toHaveLength(2);
      expect(dupItems.every((it) => it.amount === 4500)).toBe(true);

      const nonDup = mergedItems.filter((it) => !it.isDuplicate);
      expect(nonDup).toHaveLength(2);
    });
  });
});
