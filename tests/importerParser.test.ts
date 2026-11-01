import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  parseTextLocally,
  matchesCategoryKeyword,
  parseWithGemini,
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/lib/importerParser";

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel;
    },
  };
});

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

  describe("누적·잔액·한도 금액 제외 및 결제금액 우선 추출 (QA-001)", () => {
    it("누적/잔액 금액은 결제금액으로 쓰지 않는다", () => {
      const [item] = parseTextLocally(
        "신한카드(1234)승인 홍*동 12,000원(일시불)10/28 14:30 스타벅스 누적1,234,567원",
        []
      );
      expect(item.amount).toBe(12000);
      expect(item.merchant).toBe("스타벅스");
      expect(item.category).toBe("cafe");
      expect(parseTextLocally("현대카드 결제 15,000원 잔액 2,000,000원", [])[0].amount).toBe(15000);
    });

    it("KB국민카드 Web발신 누적 금액 포함 문자를 올바르게 파싱한다", () => {
      const [item] = parseTextLocally(
        "[Web발신] KB국민카드1*2*승인 홍*동 4,500원 일시불 10/28 09:12 GS25역삼점 누적 523,000원",
        []
      );
      expect(item).toEqual({
        merchant: "GS25역삼점",
        amount: 4500,
        category: "convenience",
      });
    });

    it("한도 및 잔여 금액이 문장 끝에 위치해도 결제금액과 가맹점명을 정확히 추출한다", () => {
      const [limitItem] = parseTextLocally(
        "하나카드 승인 32,000원 일시불 이마트 한도 500,000원",
        []
      );
      expect(limitItem).toEqual({
        merchant: "이마트",
        amount: 32000,
        category: "mart",
      });

      const [remainItem] = parseTextLocally(
        "우리체크 승인 8,500원 스타벅스 잔여 120,000원",
        []
      );
      expect(remainItem).toEqual({
        merchant: "스타벅스",
        amount: 8500,
        category: "cafe",
      });
    });
  });

  describe("키워드 단어 경계 매칭 및 부분 문자열 오탐 방지 (CA-006)", () => {
    it.each([
      {
        input: "스마트스토어 29,000원",
        expectedMerchant: "스마트스토어",
        expectedAmount: 29000,
        expectedCategory: "onlineShopping",
      },
      {
        input: "스마트폰 케이스 15,000원",
        expectedMerchant: "케이스",
        expectedAmount: 15000,
        expectedCategory: "etc",
      },
      {
        input: "KTX 59,800원",
        expectedMerchant: "KTX",
        expectedAmount: 59800,
        expectedCategory: "transport",
      },
      {
        input: "SRT 52,000원",
        expectedMerchant: "SRT",
        expectedAmount: 52000,
        expectedCategory: "transport",
      },
      {
        input: "KT 통신요금 55,000원",
        expectedMerchant: "통신요금",
        expectedAmount: 55000,
        expectedCategory: "mobile",
      },
      {
        input: "CU역삼점 3,200원",
        expectedMerchant: "CU역삼점",
        expectedAmount: 32000 / 10,
        expectedCategory: "convenience",
      },
      {
        input: "FOCUS 아카데미 50,000원",
        expectedMerchant: "아카데미",
        expectedAmount: 50000,
        expectedCategory: "etc",
      },
      {
        input: "쿠팡이츠 24,000원",
        expectedMerchant: "쿠팡이츠",
        expectedAmount: 24000,
        expectedCategory: "dining",
      },
    ])(
      "$input 입력 시 카테고리 $expectedCategory 로 분류한다",
      ({ input, expectedMerchant, expectedAmount, expectedCategory }) => {
        const [item] = parseTextLocally(input, []);
        expect(item).toEqual({
          merchant: expectedMerchant,
          amount: expectedAmount,
          category: expectedCategory,
        });
      }
    );

    it("matchesCategoryKeyword는 영문 약어 경계와 일반어 오탐 예외를 준수한다", () => {
      expect(matchesCategoryKeyword("KTX 승차권", "KT")).toBe(false);
      expect(matchesCategoryKeyword("KTX 승차권", "KTX")).toBe(true);
      expect(matchesCategoryKeyword("KT통신비", "KT")).toBe(true);
      expect(matchesCategoryKeyword("FOCUS", "CU")).toBe(false);
      expect(matchesCategoryKeyword("CU강남점", "CU")).toBe(true);
      expect(matchesCategoryKeyword("스마트스토어", "마트")).toBe(false);
      expect(matchesCategoryKeyword("롯데마트", "마트")).toBe(true);
    });
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

describe("parseWithGemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("허용되지 않은 카테고리는 etc로 폴백하고 금액은 유한 정수로 정규화한다", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            { merchant: "스타벅스", amount: 4500.8, category: "cafe" },
            { merchant: "미분류상점", amount: "invalid", category: "invalid_category" },
          ]),
      },
    });

    const result = await parseWithGemini("dummy-key", "스타벅스 4500원");
    expect(result).toEqual([
      { merchant: "스타벅스", amount: 4500, category: "cafe" },
      { merchant: "미분류상점", amount: 0, category: "etc" },
    ]);
  });

  it("파싱 실패 시 민감한 응답 원문을 콘솔에 노출하지 않고 길이만 로깅한다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sensitiveRawText = "민감한_개인_소비내역_원문_데이터_12345";

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => sensitiveRawText,
      },
    });

    await expect(parseWithGemini("dummy-key", "테스트")).rejects.toThrow(
      "Gemini 분석 결과 형식이 올바르지 않습니다."
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const loggedArgs = errorSpy.mock.calls[0].map((arg) => String(arg)).join(" ");
    expect(loggedArgs).toContain(`(length: ${sensitiveRawText.length})`);
    expect(loggedArgs).not.toContain(sensitiveRawText);

    errorSpy.mockRestore();
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

  it("62번 이슈 명세인 5MB 제한 옵션을 적용하면 5MB 초과 파일을 올바르게 차단한다", () => {
    const valid5MbFile = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    Object.defineProperty(valid5MbFile, "size", { value: 5 * 1024 * 1024 });
    expect(validateImageFile(valid5MbFile, 5 * 1024 * 1024).isValid).toBe(true);

    const exceed5MbFile = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    Object.defineProperty(exceed5MbFile, "size", { value: 5 * 1024 * 1024 + 1 });
    const result = validateImageFile(exceed5MbFile, 5 * 1024 * 1024);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("최대 5MB");
  });
});
