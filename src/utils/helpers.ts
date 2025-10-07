const ISO_4217_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
  "SEK",
  "NOK",
  "DKK",
  "RUB",
  "INR",
  "BRL",
  "ZAR",
  "SGD",
  "HKD",
  "MXN",
  "KRW",
  "TRY",
  "PLN",
  "CZK",
  "HUF",
  "ILS",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "TWD",
  "SAR",
  "AED",
  "COP",
  "CLP",
  "PEN",
  "ARS",
  "VND",
  "EGP",
  "UAH",
  "QAR",
  "KZT",
  "BGN",
  "RON",
  "HRK",
  "ISK",
  "LTL",
  "LVL",
  "EEK",
  "SKK",
  "YER",
  "OMR",
  "BHD",
  "JOD",
  "LBP",
  "KWD",
  "MAD",
  "DZD",
  "TND",
  "LYD",
  "SDG",
  "IQD",
  "SYP",
  "MRO",
  "CVE",
  "GMD",
  "GNF",
  "SLL",
  "XOF",
  "XAF",
  "XPF",
  "XCD",
  "XDR",
  "XUA",
  "XSU",
  "XTS",
  "XXX",
];
const pathCache = new Map<string, string[]>();

export function getPathArray(path: string): string[] {
  if (pathCache.has(path)) {
    const cached = pathCache.get(path);
    if (cached) return [...cached];
  }

  const arr = path.split(".");
  pathCache.set(path, arr);
  return [...arr];
}

export function getNestedValue(obj: unknown, path: string | string[]): unknown {
  const keys = Array.isArray(path) ? path : getPathArray(path);
  return keys.reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      if (!Number.isNaN(Number(key)) && Array.isArray(acc)) {
        return acc[Number(key)];
      }
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function setNestedValue(obj: unknown, path: string | string[], value: unknown): void {
  const parts = Array.isArray(path) ? [...path] : [...getPathArray(path)];
  const last = parts.pop();
  if (!last) return;

  let target = obj as Record<string, unknown>;
  for (const key of parts) {
    if (!Number.isNaN(Number(key)) && Array.isArray(target)) {
      if (!target[Number(key)]) target[Number(key)] = {};
      target = target[Number(key)] as Record<string, unknown>;
    } else {
      if (typeof target[key] !== "object" || target[key] === null) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }
  }
  if (!Number.isNaN(Number(last)) && Array.isArray(target)) {
    target[Number(last)] = value;
  } else {
    target[last] = value;
  }
}

export function defaultRound(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isValidCurrencyCode(code: string, allowedCodes?: string[]): boolean {
  const list = allowedCodes || ISO_4217_CODES;
  return typeof code === "string" && list.includes(code.toUpperCase());
}
