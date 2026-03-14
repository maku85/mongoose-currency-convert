import type { CacheEntry } from "../types.js";

export class SimpleCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private sweepTimer: ReturnType<typeof setInterval>;

  constructor(ttlMinutes: number = 60) {
    this.ttl = ttlMinutes * 60 * 1000;
    this.sweepTimer = setInterval(() => this.sweep(), this.ttl);
    this.sweepTimer.unref();
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private sweep(): void {
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) this.store.delete(key);
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    clearInterval(this.sweepTimer);
    this.store.clear();
  }
}
