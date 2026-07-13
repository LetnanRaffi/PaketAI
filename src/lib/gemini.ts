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
