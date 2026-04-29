/**
 * Simple IndexedDB wrapper for GamePulse project storage.
 * Replaces localStorage to support larger datasets (50MB+ vs 5MB).
 */

const DB_NAME = "gamepulse";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";
const STORE_DATA = "project-data";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Projects ──

export interface Project {
  id: string;
  name: string;
  filename: string;
  rows: number;
  columns: string[];
  createdAt: string;
}

export async function getProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_DATA], "readwrite");
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.objectStore(STORE_DATA).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Project Data ──

export interface ProjectData {
  id: string;
  headers: string[];
  rows: Record<string, string>[];
}

export async function getProjectData(projectId: string): Promise<ProjectData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, "readonly");
    const store = tx.objectStore(STORE_DATA);
    const req = store.get(projectId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectData(data: ProjectData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, "readwrite");
    const store = tx.objectStore(STORE_DATA);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Encoding detection ──

/**
 * Check if text looks like garbled Chinese (UTF-8 bytes decoded as wrong encoding).
 * Scans for common patterns: consecutive Latin-extended chars, replacement chars,
 * or CJK chars that don't form meaningful Chinese text.
 */
function isGarbledText(text: string): boolean {
  const sample = text.slice(0, 3000);
  // Replacement character = clear sign of encoding mismatch
  if (/\uFFFD/.test(sample)) return true;
  // Consecutive Latin-extended chars (Ã©, Ã¤, etc.) = classic GBK-as-UTF-8 pattern
  if (/[\u00c0-\u00ff]{3,}/.test(sample)) return true;
  // Check for common garbled CJK-from-GBK patterns:
  // GBK high bytes often produce U+00C0-U+00FF followed by U+0080-U+00BF
  if (/[\u0080-\u00bf][\u00c0-\u00ff]|[\u00c0-\u00ff][\u0080-\u00bf]/.test(sample)) return true;
  return false;
}

/**
 * Score how "Chinese" a text looks by counting common Chinese characters.
 * Higher score = more likely correct encoding.
 */
function chineseScore(text: string): number {
  const sample = text.slice(0, 5000);
  const cjkMatches = sample.match(/[\u4e00-\u9fff]/g);
  return cjkMatches ? cjkMatches.length : 0;
}

export async function readFileWithEncoding(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  
  // Decode with all three encodings
  const utf8Text = new TextDecoder('utf-8').decode(buffer);
  let gbkText = "";
  let gb18030Text = "";
  
  try { gbkText = new TextDecoder('gbk').decode(buffer); } catch {}
  try { gb18030Text = new TextDecoder('gb18030').decode(buffer); } catch {}
  
  // Score each decoding
  const utf8Score = chineseScore(utf8Text);
  const gbkScore = chineseScore(gbkText);
  const gb18030Score = chineseScore(gb18030Text);
  
  // Check for garbled indicators in UTF-8
  const utf8Garbled = isGarbledText(utf8Text);
  
  // Pick the best encoding:
  // 1. If UTF-8 is garbled, prefer GBK/GB18030
  // 2. Otherwise, pick whichever has the most Chinese characters
  // 3. Require a significant margin to avoid false switches on pure ASCII files
  if (gbkScore > utf8Score + 3 && gbkScore > 5) {
    return gbkText;
  }
  if (gb18030Score > utf8Score + 3 && gb18030Score > 5) {
    return gb18030Text;
  }
  if (utf8Garbled && gbkScore > 5) {
    return gbkText;
  }
  if (utf8Garbled && gb18030Score > 5) {
    return gb18030Text;
  }
  
  return utf8Text;
}

// ── Excel Parser ──

export async function parseExcel(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (json.length === 0) return { headers: [], rows: [] };
  
  const headers = Object.keys(json[0]);
  const rows = json.map(row => {
    const r: Record<string, string> = {};
    headers.forEach(h => {
      const v = row[h];
      r[h] = v == null ? "" : String(v);
    });
    return r;
  });
  
  return { headers, rows };
}

// ── File Reader (auto-detect encoding for CSV, parse Excel directly) ──

export async function readFileData(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  
  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer);
  }
  
  // CSV: auto-detect encoding
  const text = await readFileWithEncoding(file);
  return parseCSV(text);
}

// ── CSV Parser ──

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  // Handle quoted fields with newlines
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        result.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
    result.push(field.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = vals[i] || "");
    return row;
  });

  return { headers, rows };
}
