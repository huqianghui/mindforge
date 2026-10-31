import { useEffect, useState } from 'react';

export interface DocEntry {
  path: string;
  title: string;
  file: string;
}

export interface ContentManifest {
  generatedAt: string;
  sourceCommit?: string;
  docs: DocEntry[];
  assets: Record<string, string>;
}

export interface ContentIndex extends ContentManifest {
  byPath: Map<string, DocEntry>;
  // wikilink 按文件名（不含 .md）解析，wiki 页面依赖这种写法
  byStem: Map<string, DocEntry>;
}

export const HOME_DOC = 'README.md';
const CONTENT_BASE = `${import.meta.env.BASE_URL}content/`;
const VERSION = `?v=${encodeURIComponent(__CONTENT_VERSION__)}`;

let cached: Promise<ContentIndex> | null = null;

function loadIndex(): Promise<ContentIndex> {
  cached ??= fetch(`${CONTENT_BASE}manifest.json${VERSION}`)
    .then((res) => res.json())
    .then((m: ContentManifest) => {
      const byPath = new Map(m.docs.map((d) => [d.path, d]));
      const byStem = new Map<string, DocEntry>();
      for (const d of m.docs) {
        const stem = d.path.split('/').pop()!.replace(/\.md$/, '');
        if (!byStem.has(stem)) byStem.set(stem, d);
      }
      return { ...m, byPath, byStem };
    });
  return cached;
}

export function useContentIndex(): ContentIndex | null {
  const [index, setIndex] = useState<ContentIndex | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch((err) => console.error('Failed to load manifest', err));
  }, []);
  return index;
}

export function contentUrl(file: string): string {
  return CONTENT_BASE + file + VERSION;
}

/** 把文档内的相对路径解析成 vault 内路径（处理 ../ 与 %20 编码）。 */
export function resolvePath(fromDoc: string, ref: string): string {
  const parts = fromDoc.split('/').slice(0, -1);
  for (const seg of decodeURIComponent(ref).split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function docHash(path: string, anchor?: string): string {
  return `#/doc/${encodeURIComponent(path)}${anchor ? `?a=${encodeURIComponent(anchor)}` : ''}`;
}

export const REPO_BLOB = 'https://github.com/huqianghui/mindforge/blob/main/';

/** public/ 根目录下随内容同步更新的文件（如 wiki-graph.json），同样带版本号 */
export function publicUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file}${VERSION}`;
}
