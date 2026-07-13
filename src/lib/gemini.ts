import { GoogleGenAI } from '@google/genai';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface KeyEntry {
  key: string;
  rateLimitedAt: number | null;
}

function parseKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

class GeminiKeyPool {
  private keys: KeyEntry[];
  private nextIndex = 0;

  constructor() {
    const parsed = parseKeys();
    if (parsed.length === 0) {
      throw new Error('No Gemini API keys found in GEMINI_API_KEY env var');
    }
    this.keys = parsed.map(key => ({ key, rateLimitedAt: null }));
    console.log(`[GeminiKeyPool] Initialized with ${this.keys.length} API key(s)`);
  }

  private isAvailable(entry: KeyEntry): boolean {
    if (!entry.rateLimitedAt) return true;
    return Date.now() - entry.rateLimitedAt > COOLDOWN_MS;
  }

  getWorkingClient(): { client: GoogleGenAI; keyIndex: number } {
    // First pass: find any available key starting from nextIndex
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.nextIndex + i) % this.keys.length;
      if (this.isAvailable(this.keys[idx])) {
        this.nextIndex = (idx + 1) % this.keys.length;
        return { client: new GoogleGenAI({ apiKey: this.keys[idx].key }), keyIndex: idx };
      }
    }

    // Second pass: force reset the oldest rate-limited key
    let oldestIdx = 0;
    let oldestTime = this.keys[0].rateLimitedAt ?? 0;
    for (let i = 1; i < this.keys.length; i++) {
      const t = this.keys[i].rateLimitedAt ?? 0;
      if (t < oldestTime) {
        oldestTime = t;
        oldestIdx = i;
      }
    }
    console.warn(`[GeminiKeyPool] All keys rate-limited. Force-resetting key #${oldestIdx}`);
    this.keys[oldestIdx].rateLimitedAt = null;
    this.nextIndex = (oldestIdx + 1) % this.keys.length;
    return { client: new GoogleGenAI({ apiKey: this.keys[oldestIdx].key }), keyIndex: oldestIdx };
  }

  markRateLimited(keyIndex: number): void {
    this.keys[keyIndex].rateLimitedAt = Date.now();
    const available = this.keys.filter(k => this.isAvailable(k)).length;
    console.warn(`[GeminiKeyPool] Key #${keyIndex} rate-limited. ${available}/${this.keys.length} keys available`);
  }

  getStatus(): { total: number; available: number; rateLimited: number } {
    const available = this.keys.filter(k => this.isAvailable(k)).length;
    return { total: this.keys.length, available, rateLimited: this.keys.length - available };
  }
}

// Singleton — persists across requests within same serverless instance
let pool: GeminiKeyPool | null = null;

export function getKeyPool(): GeminiKeyPool {
  if (!pool) {
    pool = new GeminiKeyPool();
  }
  return pool;
}

// --- Shared scan utilities ---

const HONORIFICS = /^(mba|mrs?|bp|bapak|ibu|pak|sdr|sdra|saudara|saudari|dr|prof|ir|mh)\.?\s+/i;

function stripHonorific(name: string): string {
  return name.replace(HONORIFICS, '').trim();
}

function firstName(name: string): string {
  return stripHonorific(name).split(/\s+/)[0]?.toLowerCase() || '';
}

function similarity(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.85;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 1;
  let matches = 0;
  for (const ch of la) {
    if (lb.includes(ch)) matches++;
  }
  return (matches / maxLen) * 0.6;
}

export function matchEmployee(
  ocrName: string,
  aiMatchedName: string | null,
  employees: { id: string; full_name: string }[]
): { id: string; name: string; confidence: number } | null {
  if (!ocrName) return null;
  const ocrFirst = firstName(ocrName);

  if (aiMatchedName) {
    const exact = employees.find(
      e => e.full_name.toLowerCase() === aiMatchedName.toLowerCase()
    );
    if (exact) return { id: exact.id, name: exact.full_name, confidence: 1.0 };

    const aiFirst = firstName(aiMatchedName);
    const byAiFirst = employees.filter(e => firstName(e.full_name) === aiFirst);
    if (byAiFirst.length === 1) {
      return { id: byAiFirst[0].id, name: byAiFirst[0].full_name, confidence: 0.85 };
    }
    if (byAiFirst.length > 1) {
      // Multiple matches on first name — prefer the one whose full name
      // starts with the AI-suggested name (handles partial matches like "Budi" vs "Budi Santoso")
      const aiLower = aiMatchedName.toLowerCase();
      const best = byAiFirst.find(e => e.full_name.toLowerCase().startsWith(aiLower));
      if (best) return { id: best.id, name: best.full_name, confidence: 0.80 };
      return { id: byAiFirst[0].id, name: byAiFirst[0].full_name, confidence: 0.70 };
    }
  }

  let best: { id: string; name: string; confidence: number } | null = null;
  let bestCount = 0;
  for (const emp of employees) {
    const empFirst = firstName(emp.full_name);
    const score = similarity(ocrFirst, empFirst);
    if (score >= 0.6 && (!best || score > best.confidence)) {
      best = { id: emp.id, name: emp.full_name, confidence: score };
      bestCount = 1;
    } else if (score >= 0.6 && best && score === best.confidence) {
      bestCount++;
    }
  }

  // If there's a tie (multiple employees with same similarity score), prefer
  // the one whose full name is closest in length to the OCR name
  if (best && bestCount > 1) {
    let closest = best;
    let closestDist = Math.abs(ocrFirst.length - firstName(best.name).length);
    for (const emp of employees) {
      const empFirst = firstName(emp.full_name);
      const score = similarity(ocrFirst, empFirst);
      if (score === best.confidence) {
        const dist = Math.abs(ocrFirst.length - empFirst.length);
        if (dist < closestDist) {
          closest = { id: emp.id, name: emp.full_name, confidence: score };
          closestDist = dist;
        }
      }
    }
    return closest;
  }

  return best;
}

export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('UNAVAILABLE');
}

export function buildPrompt(employeeNames: string[]): string {
  return `Kamu adalah asisten mailroom cerdas. Tugasmu mengekstrak data dari resi paket dan mencocokkannya dengan database karyawan.

Daftar Karyawan:
${employeeNames.join('\n')}

ATURAN PENTING PENCOCOKAN NAMA:
- Nama di resi sering menggunakan sebutan/panggilan seperti "Mba", "Mas", "Bp", "Pak", "Ibu", "Sdr", "Sdri", dll.
- CONTOH: Jika resi tertulis "Mba Diva" dan di daftar ada "Diva Amanda", maka matched_employee_name = "Diva Amanda".
- CONTOH: Jika resi tertulis "Bp Budi" dan di daftar ada "Budi Santoso", maka matched_employee_name = "Budi Santoso".
- Selalu HAPUS sebutan/panggilan tersebut lalu cocokkan berdasarkan NAMA PERTAMA.
- Jika ada beberapa karyawan dengan nama pertama yang SAMA, lihat departemen/ konteks tambahan dari resi untuk memilih yang paling tepat. Jika tidak bisa dipastikan, pilih yang paling umum / pertama dari daftar.

Tugas:
1. Ekstrak nama penerima (raw), nomor resi, dan ekspedisi (courier) dari gambar resi.
2. Cocokkan nama penerima dengan daftar karyawan di atas menggunakan aturan di atas.
3. Kembalikan data HANYA dalam format JSON. JANGAN BERIKAN TEKS LAIN SELAIN JSON.

Format JSON yang diharapkan:
{
  "recipient_name_raw": "string",
  "tracking_number": "string",
  "courier": "string",
  "matched_employee_name": "string nama lengkap dari daftar (atau null jika tidak ada yang mirip)",
  "match_confidence": 0.0 (0 sampai 1.0)
}`;
}

export function buildBatchPrompt(employeeNames: string[], count: number): string {
  return `Kamu adalah asisten mailroom cerdas. Tugasmu mengekstrak data dari ${count} gambar resi paket dan mencocokkannya dengan database karyawan.

Daftar Karyawan:
${employeeNames.join('\n')}

ATURAN PENTING PENCOCOKAN NAMA:
- Nama di resi sering menggunakan sebutan/panggilan seperti "Mba", "Mas", "Bp", "Pak", "Ibu", "Sdr", "Sdri", dll.
- CONTOH: Jika resi tertulis "Mba Diva" dan di daftar ada "Diva Amanda", maka matched_employee_name = "Diva Amanda".
- Selalu HAPUS sebutan/panggilan tersebut lalu cocokkan berdasarkan NAMA PERTAMA.
- Jika ada beberapa karyawan dengan nama pertama yang SAMA, lihat departemen/ konteks tambahan dari resi untuk memilih yang paling tepat. Jika tidak bisa dipastikan, pilih yang paling umum / pertama dari daftar.

Tugas:
Kamu akan menerima ${count} gambar resi. Untuk SETIAP gambar, ekstrak dan cocokkan.
Kembalikan data HANYA dalam format JSON array dengan tepat ${count} elemen. JANGAN BERIKAN TEKS LAIN SELAIN JSON.

Format JSON yang diharapkan (array):
[
  {
    "recipient_name_raw": "string",
    "tracking_number": "string",
    "courier": "string",
    "matched_employee_name": "string nama lengkap dari daftar (atau null)",
    "match_confidence": 0.0
  },
  ...
]`;
}
