import fs from 'node:fs';
import {
  ROUTE_META,
  NOT_FOUND_META,
  SITE_ORIGIN,
  normalizePath,
  type RouteMeta,
} from '@shared/seo';

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;

// dist 는 빌드 산출물이라 프로세스가 사는 동안 바뀌지 않는다. 한 번만 읽는다.
let template: string | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBlock(pathname: string, meta: RouteMeta, found: boolean): string {
  const url = SITE_ORIGIN + (meta.canonical ?? pathname);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const lines = [
    '<!--seo-->',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
  ];
  // 없는 경로에 canonical 을 주면 존재하지 않는 문서를 정본이라고 가리키게 된다.
  if (found) lines.push(`<link rel="canonical" href="${url}" />`);
  lines.push(
    `<meta name="robots" content="${meta.index ? 'index, follow' : 'noindex, follow'}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    '<!--/seo-->',
  );
  return lines.join('\n    ');
}

/** 경로에 맞는 메타를 채운 index.html 을 돌려준다. 없는 경로는 404 용 메타를 쓴다. */
export function renderIndexHtml(indexPath: string, pathname: string): string {
  if (template === null) template = fs.readFileSync(indexPath, 'utf8');
  const normalized = normalizePath(pathname);
  const meta = ROUTE_META[normalized];
  // 함수형 replacer 를 쓴다 — 문자열이면 본문의 $ 가 치환 패턴으로 해석된다.
  return template.replace(SEO_BLOCK, () =>
    buildBlock(normalized, meta ?? NOT_FOUND_META, meta !== undefined),
  );
}
