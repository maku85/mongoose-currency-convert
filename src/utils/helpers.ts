// Complete ISO 4217 active currency codes
const ISO_4217_CODES = [
  // A
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  // B
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BOV",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  // C
  "CAD",
  "CDF",
  "CHE",
  "CHF",
  "CHW",
  "CLF",
  "CLP",
  "CNY",
  "COP",
  "COU",
  "CRC",
  "CUC",
  "CUP",
  "CVE",
  "CZK",
  // D
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  // E
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  // F
  "FJD",
  "FKP",
  // G
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  // H
  "HKD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  // I
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  // J
  "JMD",
  "JOD",
  "JPY",
  // K
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  // L
  "LAK",
  "LBP",
  "LRD",
  "LSL",
  "LYD",
  // M
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MXV",
  "MYR",
  "MZN",
  // N
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  // O
  "OMR",
  // P
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  // Q
  "QAR",
  // R
  "RON",
  "RSD",
  "RUB",
  "RWF",
  // S
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  // T
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  // U
  "UAH",
  "UGX",
  "USD",
  "USN",
  "UYI",
  "UYU",
  "UZS",
  // V
  "VES",
  "VND",
  "VUV",
  // W
  "WST",
  // X (special / supra-national)
  "XAF",
  "XAG",
  "XAU",
  "XBA",
  "XBB",
  "XBC",
  "XBD",
  "XCD",
  "XDR",
  "XOF",
  "XPD",
  "XPF",
  "XPT",
  "XSU",
  "XTS",
  "XUA",
  "XXX",
  // Y
  "YER",
  // Z
  "ZAR",
  "ZMW",
  "ZWL",
];
const PATH_CACHE_MAX_SIZE = 500;
const pathCache = new Map<string, string[]>();

export function getPathArray(path: string): string[] {
  const cached = pathCache.get(path);
  if (cached) {
    // Refresh insertion order so least-recently-used entries are evicted first
    pathCache.delete(path);
    pathCache.set(path, cached);
    return cached;
  }

  const arr = path.split(".");
  if (pathCache.size >= PATH_CACHE_MAX_SIZE) {
    pathCache.delete(pathCache.keys().next().value as string);
  }
  pathCache.set(path, arr);
  return arr;
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
  if (typeof code !== "string") return false;
  const normalized = code.toUpperCase();
  return list.some((c) => c.toUpperCase() === normalized);
}
