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

export async function readFileWithEncoding(file: File): Promise<string> {
  // Try UTF-8 first
  const utf8Text = await file.text();
  // Check if UTF-8 produces garbled Chinese (common sign: lots of replacement chars or \uFFFD)
  const hasGarbled = /\uFFFD/.test(utf8Text) || /é|å|æ|ç|è|\x80-\x9f/.test(utf8Text.slice(0, 500));
  
  if (!hasGarbled) {
    // UTF-8 looks fine, check if it has Chinese characters
    const sample = utf8Text.slice(0, 2000);
    const hasChinese = /[\u4e00-\u9fff]/.test(sample);
    const hasGarbledChinese = /[\u00c0-\u00ff]{2,}/.test(sample) && !hasChinese;
    
    if (!hasGarbledChinese) return utf8Text;
  }
  
  // Try GBK
  try {
    const buffer = await file.arrayBuffer();
    const gbkText = new TextDecoder('gbk').decode(buffer);
    const gbkSample = gbkText.slice(0, 2000);
    const hasChinese = /[\u4e00-\u9fff]/.test(gbkSample);
    if (hasChinese) return gbkText;
  } catch {}
  
  // Try GB18030 (superset of GBK)
  try {
    const buffer = await file.arrayBuffer();
    const gbText = new TextDecoder('gb18030').decode(buffer);
    const gbSample = gbText.slice(0, 2000);
    const hasChinese = /[\u4e00-\u9fff]/.test(gbSample);
    if (hasChinese) return gbText;
  } catch {}
  
  return utf8Text; // fallback
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
