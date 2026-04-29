/**
 * Built-in project data registry.
 * These projects are embedded in the app and don't need IndexedDB.
 */

import { ZT2_DATA, ZT2_HEADERS, ZT2_HEADERS_CN } from "./zt2Data";

export interface BuiltinProject {
  id: string;
  name: string;
  description: string;
  headers: string[];
  headersCn: string[];
  rows: Record<string, string>[];
}

export const BUILTIN_PROJECTS: BuiltinProject[] = [
  {
    id: "zt2",
    name: "征途2手游",
    description: "2020年1月-2020年11月 · 月度运营数据 · 328行×16列",
    headers: ZT2_HEADERS,
    headersCn: ZT2_HEADERS_CN,
    rows: ZT2_DATA,
  },
];

export function getBuiltinProject(id: string): BuiltinProject | undefined {
  return BUILTIN_PROJECTS.find(p => p.id === id);
}

export function getBuiltinProjectData(id: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const p = getBuiltinProject(id);
  if (!p) return null;
  return { headers: p.headersCn, rows: p.rows };
}
