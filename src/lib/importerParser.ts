import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedSpendingItem {
  merchant: string;
  amount: number;
  category: string; // convenience, cafe, transport, mobile, onlineShopping, mart, dining, culture, gas, etc
}

// 한국어 지출 카테고리 매핑 규칙
export const KEYWORD_MAP: { [category: string]: string[] } = {
  cafe: ["스타벅스", "스벅", "투썸", "이디야", "커피", "메가커피", "빽다방", "폴바셋", "할리스", "카페", "디저트", "베이커리", "빵집", "설빙"],
  convenience: ["GS25", "CU", "세븐일레븐", "이마트24", "미니스톱", "편의점"],
  transport: ["택시", "버스", "지하철", "철도", "코레일", "SRT", "KTX", "티머니", "캐시비", "카카오T", "카카오택시", "타다", "대중교통"],
  mobile: ["SKT", "KT", "LGU+", "엘지유플러스", "알뜰폰", "통신요금", "통신비", "휴대폰요금"],
  onlineShopping: ["쿠팡", "네이버쇼핑", "네이버페이", "G마켓", "지마켓", "11번가", "SSG", "옥션", "마켓컬리", "컬리", "위메프", "티몬", "배송", "택배"],
  mart: ["이마트", "홈플러스", "롯데마트", "농협하나로", "하나로마트", "슈퍼마켓", "슈퍼", "마트", "다이소", "노브랜드"],
  dining: ["식당", "맛집", "푸드", "고기집", "갈비", "삼겹살", "국밥", "찌개", "치킨", "피자", "족발", "보쌈", "스시", "초밥", "반점", "짜장면", "파스타", "배달의민족", "배민", "요기요", "쿠팡이츠", "한식", "양식", "중식", "일식"],
  culture: ["넷플릭스", "유튜브", "premium", "디즈니", "티빙", "웨이브", "CGV", "롯데시네마", "메가박스", "영화관", "멜론", "지니", "티켓", "공연", "연극"],
  gas: ["주유소", "GS칼텍스", "칼텍스", "SK에너지", "엔크린", "에쓰오일", "S-OIL", "오일뱅크", "주유", "충전소"],
};

/**
 * 로컬 정규식 & 키워드 휴리스틱 파서
 * SMS 결제 문자, 카카오톡 알림톡, 텍스트 형태의 지출 기록을 한 줄씩 분석합니다.
 */
export function parseTextLocally(text: string): ParsedSpendingItem[] {
  const lines = text.split("\n");
  const results: ParsedSpendingItem[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 금액 패턴 검색 (예: 12,000원, 12000원, 5,500, 45000 등)
    // 뒤에 원이 붙거나 숫자 형태인 경우를 찾습니다.
    const amountRegex = /(\d{1,3}(,\d{3})+|\d+)\s*원?/g;
    let match;
    let amounts: { value: number; index: number; text: string }[] = [];

    while ((match = amountRegex.exec(line)) !== null) {
      const valStr = match[1].replace(/,/g, "");
      const val = parseInt(valStr, 10);
      if (val >= 100) { // 최소 100원 이상만 금액으로 인정 (날짜/시간 예외 처리)
        amounts.push({
          value: val,
          index: match.index,
          text: match[0],
        });
      }
    }

    if (amounts.length === 0) continue;

    // 대중교통 이용내역 같은 경우 전체 합산액이 보통 마지막이나 단독으로 나오므로, 가장 타당한 금액 선정
    // 여러 금액이 있을 때 보통 가장 큰 금액이 결제액이거나 마지막 금액이 결제액인 경우가 많음.
    // 여기서는 가장 마지막 매칭된 금액을 사용합니다.
    const selectedAmountObj = amounts[amounts.length - 1];
    const amount = selectedAmountObj.value;

    // 상호명(Merchant) 추정
    // 금액 텍스트 이전 영역에서 쓸데없는 공백이나 문자를 정제하고 상호명을 추출
    const beforeText = line.substring(0, selectedAmountObj.index).trim();
    let merchant = "기타 가맹점";

    if (beforeText) {
      // 괄호류 정제 (예: [신한체크승인], (주)) 및 날짜/시간(예: 08/23 14:15) 제거
      const cleaned = beforeText
        .replace(/\[[^\]]+\]/g, "") // 대괄호 제거
        .replace(/\([^)]+\)/g, "") // 소괄호 제거
        .replace(/\b\d{2}[/-]\d{2}\s+\d{2}:\d{2}\b/g, "") // MM/DD HH:MM 제거
        .replace(/\b\d{4}[/-]\d{2}[/-]\d{2}\b/g, "") // YYYY-MM-DD 제거
        .trim();

      const ignoredKeywords = ["결제", "승인", "완료", "일시불", "금액", "이용", "건", "님", "고객님", "회원님", "체크", "신용", "원", "타사"];
      const tokens = cleaned
        .split(/\s+/)
        .filter(t => t.length > 0 && !ignoredKeywords.includes(t));
        
      if (tokens.length > 0) {
        // 가장 마지막 토큰을 상호명으로 추정 (예: "전기헌 스타벅스" -> "스타벅스")
        merchant = tokens[tokens.length - 1];
      }
    }

    // 카테고리 매칭
    let category = "etc";
    let matched = false;

    for (const [catId, keywords] of Object.entries(KEYWORD_MAP)) {
      for (const keyword of keywords) {
        if (merchant.toLowerCase().includes(keyword.toLowerCase()) || line.toLowerCase().includes(keyword.toLowerCase())) {
          category = catId;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    results.push({
      merchant,
      amount,
      category,
    });
  }

  return results;
}

/**
 * File 객체를 Base64 및 MIME 타입 정보가 담긴 Part 객체로 변환합니다.
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Gemini Pro Vision 또는 2.0 Flash API를 사용해 지출 정보(텍스트 또는 이미지)를 분석합니다.
 */
export async function parseWithGemini(
  apiKey: string,
  text?: string,
  imageFile?: File
): Promise<ParsedSpendingItem[]> {
  if (!apiKey) {
    throw new Error("Gemini API Key가 필요합니다.");
  }

  // GoogleGenerativeAI 초기화
  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `
당신은 개인 금융 및 지출 내역 분석 전문가입니다.
사용자가 제공한 텍스트 결제 내역 혹은 영수증/명세서 캡처 이미지 내의 지출 내역을 분석하여, 각 결제 건별로 상호명(merchant), 금액(amount, 숫자형), 카테고리(category)를 추출해 주십시오.

반드시 아래에 명시된 10가지 카테고리 중 가장 적절한 하나로 분류해 주세요:
1. convenience: 편의점 (GS25, CU, 세븐일레븐 등)
2. cafe: 카페/디저트 (커피숍, 제과점, 디저트 가게 등)
3. transport: 대중교통 (버스, 지하철, 택시, 열차 등)
4. mobile: 통신비 (휴대폰 요금, 알뜰폰, 인터넷 요금 등)
5. onlineShopping: 온라인쇼핑 (쿠팡, 네이버쇼핑, G마켓 등)
6. mart: 대형마트/슈퍼 (이마트, 홈플러스, 동네 마트, 다이소 등)
7. dining: 외식 (일반 음식점, 고기집, 배달음식 등)
8. culture: 영화/공연/OTT (넷플릭스, 영화관, 티켓 예매 등)
9. gas: 주유 (주유소, 충전소 등)
10. etc: 그 외 일반가맹점 (병원, 약국, 학원, 미용실 등 위의 카테고리에 명확히 속하지 않는 경우)

반드시 아래 예시와 같은 순수 JSON 배열 형식으로만 응답해야 합니다. 마크다운 기호(\`\`\`json 등)나 추가적인 한국어 설명 없이 순수한 JSON 배열 문자열만 반환해야 합니다:
[
  { "merchant": "스타벅스 강남역점", "amount": 4500, "category": "cafe" },
  { "merchant": "이마트 역삼점", "amount": 45200, "category": "mart" }
]
`;

  const prompt = text 
    ? `아래 텍스트 지출 내역을 분석해 주세요:\n\n${text}`
    : "업로드된 영수증/이용내역 이미지 내의 모든 결제 항목을 분석해 주세요.";

  const contents: any[] = [prompt];

  if (imageFile) {
    const imagePart = await fileToGenerativePart(imageFile);
    contents.push(imagePart);
  }

  // @google/generative-ai getGenerativeModel 셋팅
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
    systemInstruction: systemInstruction
  });

  const result = await model.generateContent(contents);
  const responseText = result.response.text() || "";
  
  try {
    // 백틱 또는 불필요 문자 정제 후 JSON 파싱
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        merchant: String(item.merchant || "알 수 없음"),
        amount: Number(item.amount) || 0,
        category: String(item.category || "etc"),
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini Response parsing failed:", responseText, error);
    throw new Error("Gemini 분석 결과 형식이 올바르지 않습니다.");
  }
}
