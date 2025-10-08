import type { Schema, Document } from "mongoose";

import type { CurrencyPluginErrorContext, CurrencyPluginOptions, CurrencyRateCache } from "./types";
import { defaultRound, getNestedValue, isValidCurrencyCode, setNestedValue } from "./utils/helpers";

export function currencyConversionPlugin(
  schema: Schema,
  options: CurrencyPluginOptions & {
    allowedCurrencyCodes?: string[];
    onError?: (ctx: CurrencyPluginErrorContext) => void;
    fallbackRate?: number;
    rollbackOnError?: boolean;
    cache?: CurrencyRateCache<number>;
    dateTransform?: (date: Date) => Date;
  },
) {
  const {
    fields,
    getRate,
    round = defaultRound,
    allowedCurrencyCodes,
    onError,
    fallbackRate,
    rollbackOnError,
    cache,
    dateTransform,
  } = options;

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    throw new Error('[mongoose-currency-convert] option "fields" must be a non-empty array');
  }

  if (typeof getRate !== "function") {
    throw new Error('[mongoose-currency-convert] option "getRate" must be a function');
  }

  async function applyCurrencyConversion(doc: Record<string, unknown>) {
    const convertedFields: string[] = [];

    for (const field of fields) {
      const { sourcePath, currencyPath, datePath, targetPath, toCurrency } = field;

      if (!targetPath) {
        console.warn(
          `[mongoose-currency-convert] WARNING: 'targetPath' is required in field config`,
        );
        continue;
      }

      if (!schema.path(`${targetPath}.amount`)) {
        console.warn(
          `[mongoose-currency-convert] WARNING: targetPath '${targetPath}' does not exist in schema`,
        );
        continue;
      }

      const amount = getNestedValue(doc, sourcePath);
      if (amount == null) continue;

      const fromCurrency = getNestedValue(doc, currencyPath);
      if (typeof fromCurrency !== "string" || !fromCurrency) {
        console.warn(
          `[mongoose-currency-convert] Missing or invalid source currency at path: ${currencyPath}`,
        );
        continue;
      }

      if (!isValidCurrencyCode(fromCurrency, allowedCurrencyCodes)) {
        console.warn(`[mongoose-currency-convert] Invalid source currency code: ${fromCurrency}`);
        continue;
      }

      if (!isValidCurrencyCode(toCurrency, allowedCurrencyCodes)) {
        console.warn(`[mongoose-currency-convert] Invalid target currency code: ${toCurrency}`);
        continue;
      }

      const dateValue = datePath ? getNestedValue(doc, datePath) : undefined;
      let conversionDate =
        dateValue &&
        (typeof dateValue === "string" ||
          typeof dateValue === "number" ||
          dateValue instanceof Date)
          ? new Date(dateValue)
          : new Date();
      if (dateTransform) conversionDate = dateTransform(conversionDate);

      let rate: number | undefined;
      const cacheKey = `${fromCurrency}_${toCurrency}_${conversionDate.toISOString().slice(0, 10)}`;
      try {
        if (cache) rate = await cache.get(cacheKey);

        if (rate === undefined) {
          rate = await getRate(fromCurrency as string, toCurrency, conversionDate);
          if (cache && rate !== undefined && !Number.isNaN(rate)) {
            await cache.set(cacheKey, rate);
          }
        }

        if (!rate || Number.isNaN(rate)) {
          if (typeof fallbackRate === "number") {
            rate = fallbackRate;
          } else {
            throw new Error("Invalid rate");
          }
        }

        const convertedValue = {
          amount: round(Number(amount) * rate),
          currency: toCurrency,
          date: conversionDate,
        };
        setNestedValue(doc, targetPath, convertedValue);
        convertedFields.push(targetPath);
      } catch (err) {
        if (onError) {
          onError({
            field: sourcePath,
            fromCurrency: fromCurrency as string,
            toCurrency,
            date: conversionDate,
            error: err,
          });
        } else {
          console.error(`[mongoose-currency-convert] Error converting ${sourcePath}:`, err);
        }
        if (rollbackOnError) {
          for (const f of fields) {
            if (f.targetPath) setNestedValue(doc, f.targetPath, undefined);
          }
          break;
        }
      }
    }
  }

  schema.pre("save", async function (this: Document) {
    const doc = this.toObject({ depopulate: true });
    await applyCurrencyConversion(doc);
    Object.assign(this, doc);
  });

  async function handleUpdateMiddleware(
    this: import("mongoose").Query<unknown, unknown>,
    next: () => void,
  ) {
    const update = this.getUpdate();
    if (!update) return next();

    const updateAny = update as Record<string, unknown>;
    let doc: Record<string, unknown>;
    if (typeof updateAny.$set === "object" && updateAny.$set !== null) {
      doc = { ...updateAny.$set };
      await applyCurrencyConversion(doc);
      updateAny.$set = doc;
    } else {
      doc = { ...updateAny };
      await applyCurrencyConversion(doc);
      Object.assign(updateAny, doc);
    }
    next();
  }

  schema.pre("findOneAndUpdate", handleUpdateMiddleware);
  schema.pre("updateOne", handleUpdateMiddleware);
}
