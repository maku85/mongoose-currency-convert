export interface CurrencyFieldConfig {
  sourcePath: string;
  currencyPath: string;
  datePath?: string;
  targetPath: string;
  toCurrency: string;
}

export interface CurrencyPluginOptions {
  fields: CurrencyFieldConfig[];
  getRate: (from: string, to: string, date?: Date) => Promise<number>;
  round?: (value: number) => number;
  cache?: CurrencyRateCache<number>;
  allowedCurrencyCodes?: string[];
  onError?: (ctx: CurrencyPluginErrorContext) => void;
  onSuccess?: (ctx: CurrencyPluginSuccessContext) => void;
  fallbackRate?: number;
  rollbackOnError?: boolean;
  dateTransform?: (date: Date) => Date;
  concurrency?: number;
  rateValidation?: { min?: number; max?: number };
}

export interface CurrencyPluginSuccessContext {
  field: string;
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  date: Date;
  /** `true` when `fallbackRate` was used instead of the rate returned by `getRate` */
  usedFallback: boolean;
}

export interface CurrencyPluginErrorContext {
  field: string;
  fromCurrency: string;
  toCurrency: string;
  date: Date;
  error: unknown;
}

/**
 * Interface for a cache backend used to store exchange rates.
 *
 * Both synchronous and asynchronous implementations are accepted — the plugin
 * always uses `await` internally, so a sync method returning `T` directly works
 * exactly like one returning `Promise<T>`.
 *
 * @example Sync implementation (e.g. in-memory Map):
 * ```ts
 * class MyCache implements CurrencyRateCache<number> {
 *   private store = new Map<string, number>();
 *   get(key: string) { return this.store.get(key); }
 *   set(key: string, value: number) { this.store.set(key, value); }
 * }
 * ```
 *
 * @example Async implementation (e.g. Redis):
 * ```ts
 * class RedisCache implements CurrencyRateCache<number> {
 *   async get(key: string) { const v = await redis.get(key); return v ? Number(v) : undefined; }
 *   async set(key: string, value: number) { await redis.set(key, String(value)); }
 * }
 * ```
 */
export interface CurrencyRateCache<T = unknown> {
  get(key: string): Promise<T | undefined> | T | undefined;
  set(key: string, value: T): Promise<void> | void;
  delete?(key: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export type GetRateFn = (from: string, to: string, date?: Date) => Promise<number>;
