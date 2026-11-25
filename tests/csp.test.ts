import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();

function computeInlineScriptHash(html: string): string {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("index.html에서 인라인 테마 스크립트를 찾을 수 없습니다.");
  }
  const digest = crypto.createHash("sha256").update(match[1], "utf8").digest("base64");
  return `'sha256-${digest}'`;
}

describe("Content-Security-Policy 설정 검증", () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(rootDir, "vercel.json"), "utf-8"),
  ) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };

  it("index.html의 CSP meta 태그가 인라인 테마 스크립트 SHA-256 해시와 필수 정책을 포함한다", () => {
    const metaMatch = indexHtml.match(
      /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
    );
    expect(metaMatch).not.toBeNull();
    const csp = metaMatch![1];

    const expectedHash = computeInlineScriptHash(indexHtml);
    expect(csp).toContain(`script-src 'self' ${expectedHash}`);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("connect-src 'self' https://generativelanguage.googleapis.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("img-src 'self' data: blob: https://d1c5n4ri2guedi.cloudfront.net");
    // meta 태그에서 브라우저 경고를 유발하는 frame-ancestors는 제외되어야 한다
    expect(csp).not.toContain("frame-ancestors");
  });

  it("vercel.json의 CSP HTTP 헤더가 인라인 테마 스크립트 해시 및 frame-ancestors 'none'을 포함한다", () => {
    const allHeaders = vercelConfig.headers.flatMap((rule) => rule.headers);
    const cspHeader = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(cspHeader).toBeDefined();

    const expectedHash = computeInlineScriptHash(indexHtml);
    expect(cspHeader!.value).toContain(`script-src 'self' ${expectedHash}`);
    expect(cspHeader!.value).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(cspHeader!.value).toContain(
      "connect-src 'self' https://generativelanguage.googleapis.com",
    );
    expect(cspHeader!.value).toContain("frame-ancestors 'none'");
  });
});
