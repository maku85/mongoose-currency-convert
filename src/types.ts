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
}

export interface CurrencyPluginErrorContext {
  field: string;
  fromCurrency: string;
  toCurrency: string;
  date: Date;
  error: unknown;
}

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
