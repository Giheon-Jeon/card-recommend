import { describe, it, expect } from "vitest";
import {
  parseTextLocally,
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/lib/importerParser";

describe("parseTextLocally", () => {
  it("카드 승인 문자 포맷에서 편의점 결제 건을 올바르게 파싱한다", () => {
    const text = "[신한체크승인] 전기헌 08/23 14:15 GS25강남역점 4,500원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "GS25강남역점",
      amount: 4500,
      category: "convenience",
    });
  });

  it("현대카드 승인 포맷에서 카페 결제 건을 올바르게 파싱한다", () => {
    const text = "[현대카드] 전기헌 08/22 19:30 스타벅스 12,000원 일시불";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "스타벅스",
      amount: 12000,
      category: "cafe",
    });
  });

  it("대중교통 티머니 내역을 올바르게 파싱한다", () => {
    const text = "티머니 대중교통 55,000원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "대중교통",
      amount: 55000,
      category: "transport",
    });
  });

  it("쿠팡 온라인 쇼핑 내역을 올바르게 파싱한다", () => {
    const text = "쿠팡 결제 42,900원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "쿠팡",
      amount: 42900,
      category: "onlineShopping",
    });
  });

  it("여러 행의 지출 텍스트를 동시에 처리할 수 있다", () => {
    const text = `
      [신한체크승인] GS25강남역점 4,500원
      [현대카드] 스타벅스 12,000원
      쿠팡 결제 42,900원
    `;
    const result = parseTextLocally(text);
    expect(result).toHaveLength(3);
    expect(result[0].category).toBe("convenience");
    expect(result[1].category).toBe("cafe");
    expect(result[2].category).toBe("onlineShopping");
  });

  it("금액이 매칭되지 않는 행은 건너뛴다", () => {
    const text = "이것은 지출이 아닌 일반 텍스트입니다.";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(0);
  });

  describe("결제 취소 및 환불 내역 파싱", () => {
    it("승인취소 키워드가 포함된 경우 금액을 음수로 파싱한다", () => {
      const text = "[신한체크취소] 09/04 11:20 스타벅스 5,500원 승인취소";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -5500,
        category: "cafe",
      });
    });

    it("결제취소 키워드와 인명이 포함된 경우 상호명과 음수 금액을 올바르게 파싱한다", () => {
      const text = "[KB국민카드] 결제취소 홍길동 15,000원 스타벅스";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -15000,
        category: "cafe",
      });
    });

    it("마이너스 부호(-)가 포함된 결제 건의 금액을 음수로 변환한다", () => {
      const text = "[현대카드] 스타벅스 -12,000원 결제취소";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -12000,
        category: "cafe",
      });
    });

    it("특수 음수 부호(▲)가 포함된 환불 건을 음수로 변환한다", () => {
      const text = "쿠팡 ▲42,900원 환불";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "쿠팡",
        amount: -42900,
        category: "onlineShopping",
      });
    });

    it("정상 결제와 결제 취소가 혼합된 멀티라인 텍스트를 각각 올바른 부호로 파싱한다", () => {
      const text = `
        [신한체크승인] GS25강남역점 4,500원
        [신한체크취소] 09/04 11:20 스타벅스 5,500원 승인취소
        쿠팡 결제 42,900원
        [롯데카드] 배달의민족 24,000원 환불
      `;
      const result = parseTextLocally(text);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ merchant: "GS25강남역점", amount: 4500, category: "convenience" });
      expect(result[1]).toEqual({ merchant: "스타벅스", amount: -5500, category: "cafe" });
      expect(result[2]).toEqual({ merchant: "쿠팡", amount: 42900, category: "onlineShopping" });
      expect(result[3]).toEqual({ merchant: "배달의민족", amount: -24000, category: "dining" });
    });
  });
});

describe("validateImageFile", () => {
  it("허용 MIME 타입 및 확장자 목록이 올바르게 정의되어 있어야 한다", () => {
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/webp");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/heic");
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".jpg");
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".jpeg");
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".png");
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".webp");
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".heic");
  });

  it("허용된 이미지 형식(JPG, PNG, WebP, HEIC)의 10MB 이하 파일은 유효성 검사를 통과한다", () => {
    const formats = [
      { name: "receipt.jpg", type: "image/jpeg" },
      { name: "receipt.jpeg", type: "image/jpeg" },
      { name: "receipt.png", type: "image/png" },
      { name: "receipt.webp", type: "image/webp" },
      { name: "receipt.heic", type: "image/heic" },
    ];

    for (const fmt of formats) {
      const file = new File(["dummy content"], fmt.name, { type: fmt.type });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it("10MB 이하의 경계값 파일은 통과하고, 10MB를 초과하는 파일은 차단한다", () => {
    const validFile = new File(["a"], "valid.png", { type: "image/png" });
    Object.defineProperty(validFile, "size", { value: MAX_IMAGE_FILE_SIZE });
    expect(validateImageFile(validFile).isValid).toBe(true);

    const exceedFile = new File(["b"], "large.png", { type: "image/png" });
    Object.defineProperty(exceedFile, "size", { value: MAX_IMAGE_FILE_SIZE + 1 });
    const result = validateImageFile(exceedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("최대 10MB");

    // 30MB 고화질 사진 테스트
    const hugeFile = new File(["c"], "huge-photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(hugeFile, "size", { value: 30 * 1024 * 1024 });
    const hugeResult = validateImageFile(hugeFile);
    expect(hugeResult.isValid).toBe(false);
    expect(hugeResult.error).toContain("최대 10MB");
  });

  it("지원하지 않는 MIME 타입 또는 확장자의 파일은 차단한다", () => {
    const unsupportedFiles = [
      new File(["gif"], "animated.gif", { type: "image/gif" }),
      new File(["svg"], "vector.svg", { type: "image/svg+xml" }),
      new File(["pdf"], "receipt.pdf", { type: "application/pdf" }),
      new File(["txt"], "memo.txt", { type: "text/plain" }),
    ];

    for (const file of unsupportedFiles) {
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("지원하지 않는 이미지 형식");
    }
  });

  it("MIME 타입이 비어있거나 generic이어도 확장자가 유효한 포맷이면 통과한다", () => {
    // 모바일 브라우저나 OS에서 HEIC/WebP 파일의 type이 빈 문자열로 전달되는 케이스
    const heicFile = new File(["heic"], "iphone-photo.HEIC", { type: "" });
    expect(validateImageFile(heicFile).isValid).toBe(true);

    const webpFile = new File(["webp"], "photo.webp", { type: "application/octet-stream" });
    expect(validateImageFile(webpFile).isValid).toBe(true);
  });
});

