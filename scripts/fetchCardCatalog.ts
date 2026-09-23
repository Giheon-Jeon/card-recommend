/**
 * 카드고릴라(card-gorilla.com) 상세 페이지에 SEO용으로 정적 렌더링되는
 * application/ld+json(schema.org Product)을 수집해 카드 기본정보 카탈로그를 생성합니다.
 *
 * 수집 항목: 카드명, 카드사, 카드 유형(신용/체크), 연회비, 이미지 URL, 혜택 요약 텍스트
 * 전월실적 구간별 상세 혜택(tiers)은 SPA 내부에서만 렌더링되어 이 스크립트로는 수집하지 않습니다.
 * data/cards/*.json에 실제 tiers를 채울 때 참고 자료로만 사용하세요.
 *
 * 실행: npx tsx scripts/fetchCardCatalog.ts [--limit=50] [--concurrency=4]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SITEMAP_URL = "https://www.card-gorilla.com/sitemap-cards.xml";
const DETAIL_URL = (id: number) => `https://www.card-gorilla.com/card/detail/${id}`;
const USER_AGENT = "card-recommend-catalog-bot/1.0 (+personal project; contact: jgh030814@gmail.com)";
const OUTPUT_DIR = join(process.cwd(), "data", "catalog");
const OUTPUT_FILE = join(OUTPUT_DIR, "cards-catalog.json");
const REQUEST_INTERVAL_MS = 300;

interface CatalogEntry {
  sourceId: number;
  sourceUrl: string;
  name: string;
  issuer: string;
  category: string;
  annualFeeText?: string;
  annualFee?: number;
  imageUrl?: string;
  benefitSummary?: string;
  fetchedAt: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
  return {
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    concurrency: concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 4,
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

async function fetchCardIds(): Promise<number[]> {
  const xml = await fetchText(SITEMAP_URL);
  const ids: number[] = [];
  const regex = /\/card\/detail\/(\d+)</g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    ids.push(Number(match[1]));
  }
  return ids;
}

function extractLdJsonProduct(html: string): any | null {
  const scriptMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const m of scriptMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const graph = parsed["@graph"];
      if (Array.isArray(graph)) {
        const product = graph.find((node: any) => node["@type"] === "Product");
        if (product) return product;
      }
    } catch {
      // 다음 script 태그 시도
    }
  }
  return null;
}

function toCatalogEntry(id: number, product: any): CatalogEntry {
  const rawName: string = product.name ?? "";
  const name = rawName.replace(/\s*\|\s*카드고릴라\s*$/, "").trim();
  const priceText: string | undefined = product.offers?.description;
  const price: number | undefined = typeof product.offers?.price === "number" ? product.offers.price : undefined;

  return {
    sourceId: id,
    sourceUrl: DETAIL_URL(id),
    name,
    issuer: product.brand?.name ?? "",
    category: product.category ?? "",
    annualFeeText: priceText,
    annualFee: price,
    imageUrl: product.image,
    benefitSummary: product.description,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchOne(id: number): Promise<CatalogEntry | null> {
  try {
    const html = await fetchText(DETAIL_URL(id));
    const product = extractLdJsonProduct(html);
    if (!product) return null;
    return toCatalogEntry(id, product);
  } catch (err) {
    console.error(`[skip] id=${id}: ${(err as Error).message}`);
    return null;
  }
}

async function runPool(ids: number[], concurrency: number): Promise<CatalogEntry[]> {
  const results: CatalogEntry[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const entry = await fetchOne(id);
      if (entry) results.push(entry);
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const { limit, concurrency } = parseArgs();

  console.log("사이트맵에서 카드 ID 목록을 가져오는 중...");
  let ids = await fetchCardIds();
  console.log(`전체 ${ids.length}개 카드 ID 확인.`);

  if (limit) {
    ids = ids.slice(0, limit);
    console.log(`--limit 옵션에 따라 ${ids.length}개만 수집합니다.`);
  }

  const entries = await runPool(ids, concurrency);
  entries.sort((a, b) => a.sourceId - b.sourceId);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2) + "\n", "utf-8");

  console.log(`완료: ${entries.length}/${ids.length}건 수집 -> ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("카탈로그 수집 실패:", err);
  process.exit(1);
});
