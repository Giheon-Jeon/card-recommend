/**
 * data/cards 폴더의 JSON 파일이 Card 타입 구조를 지키고 있는지 검사하는 스크립트입니다.
 * 실행: npx tsx scripts/validateCardData.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CARDS_DIR = join(process.cwd(), "data", "cards");

interface ValidationError {
  file: string;
  message: string;
}

function validateCard(file: string, data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const required = ["id", "name", "issuer", "cardType", "annualFee", "tiers"];

  for (const field of required) {
    if (data[field] === undefined) {
      errors.push({ file, message: `필수 필드 누락: ${field}` });
    }
  }

  if (!Array.isArray(data.tiers) || data.tiers.length === 0) {
    errors.push({ file, message: "tiers는 최소 1개 이상의 구간을 가져야 합니다." });
  } else {
    data.tiers.forEach((tier: any, i: number) => {
      if (typeof tier.minSpend !== "number") {
        errors.push({ file, message: `tiers[${i}].minSpend가 숫자가 아닙니다.` });
      }
      if (!Array.isArray(tier.benefits)) {
        errors.push({ file, message: `tiers[${i}].benefits가 배열이 아닙니다.` });
      } else {
        tier.benefits.forEach((benefit: any, j: number) => {
          if (!benefit.category) {
            errors.push({ file, message: `tiers[${i}].benefits[${j}].category가 없습니다.` });
          }
          if (typeof benefit.rate !== "number") {
            errors.push({ file, message: `tiers[${i}].benefits[${j}].rate가 숫자가 아닙니다.` });
          }
        });
      }
    });

    for (let i = 1; i < data.tiers.length; i++) {
      if (data.tiers[i].minSpend <= data.tiers[i - 1].minSpend) {
        errors.push({ file, message: "tiers는 minSpend 오름차순으로 정렬되어야 합니다." });
        break;
      }
    }
  }

  return errors;
}

function main() {
  const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
  let totalErrors: ValidationError[] = [];

  for (const file of files) {
    const raw = readFileSync(join(CARDS_DIR, file), "utf-8");
    const data = JSON.parse(raw);
    totalErrors = totalErrors.concat(validateCard(file, data));
  }

  if (totalErrors.length === 0) {
    console.log(`검증 완료: ${files.length}개 카드 파일 모두 정상입니다.`);
    return;
  }

  console.error(`검증 실패: ${totalErrors.length}건의 오류가 발견되었습니다.\n`);
  for (const error of totalErrors) {
    console.error(`- [${error.file}] ${error.message}`);
  }
  process.exit(1);
}

main();
