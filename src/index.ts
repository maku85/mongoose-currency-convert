import type { Schema, Document } from "mongoose";

import type { CurrencyPluginOptions } from "./types";
import { defaultRound, getNestedValue, isValidCurrencyCode, setNestedValue } from "./utils/helpers";

/**
 * Mongoose plugin that automatically converts currency fields on save and update operations.
 *
 * ## Error handling policy
 *
 * The plugin uses a three-tier strategy depending on when and where an error occurs:
 *
 * 1. **Initialization errors** (`throw`): Missing or invalid required options (`fields`, `getRate`)
 *    cause an immediate `Error` to be thrown when the plugin is registered. These are
 *    programmer errors and must be fixed before the application starts.
 *
 * 2. **Field validation warnings** (`console.warn` + skip): Invalid field configurations
 *    detected at conversion time (missing `targetPath`, invalid currency code, non-numeric
 *    `amount`, invalid date) are logged as warnings and the field is silently skipped.
 *    The document is still saved with the remaining conversions applied.
 *
 * 3. **Rate fetch errors** (`onError` callback or `console.error`): Errors thrown by `getRate`
 *    or invalid rates returned by it are passed to the `onError` callback if provided,
 *    otherwise logged via `console.error`. If `fallbackRate` is set it is used instead.
 *    If `rollbackOnError` is `true`, all previously converted fields in that document are
 *    reverted before the save continues.
 */
export function currencyConversionPlugin(schema: Schema, options: CurrencyPluginOptions) {
  const {
    fields,
    getRate,
    round = defaultRound,
    allowedCurrencyCodes,
    onError,
    onSuccess,
    fallbackRate,
    rollbackOnError,
    cache,
    dateTransform,
    concurrency = Infinity,
  } = options;

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    throw new Error('[mongoose-currency-convert] option "fields" must be a non-empty array');
  }

  if (typeof getRate !== "function") {
    throw new Error('[mongoose-currency-convert] option "getRate" must be a function');
  }

  if (options.round !== undefined && typeof options.round !== "function") {
    throw new Error('[mongoose-currency-convert] option "round" must be a function');
  }

  if (options.onError !== undefined && typeof options.onError !== "function") {
    throw new Error('[mongoose-currency-convert] option "onError" must be a function');
  }

  if (options.onSuccess !== undefined && typeof options.onSuccess !== "function") {
    throw new Error('[mongoose-currency-convert] option "onSuccess" must be a function');
  }

  if (
    options.fallbackRate !== undefined &&
    (typeof options.fallbackRate !== "number" || options.fallbackRate < 0)
  ) {
    throw new Error(
      '[mongoose-currency-convert] option "fallbackRate" must be a non-negative number',
    );
  }

  if (
    options.concurrency !== undefined &&
    (typeof options.concurrency !== "number" || options.concurrency < 1)
  ) {
    throw new Error('[mongoose-currency-convert] option "concurrency" must be a number >= 1');
  }

  async function applyCurrencyConversion(
    doc: Record<string, unknown>,
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    type WorkItem = {
      field: (typeof fields)[number];
      amount: number;
      fromCurrency: string;
      conversionDate: Date;
      cacheKey: string;
    };
    const workItems: WorkItem[] = [];

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
      if (typeof amount !== "number" || Number.isNaN(amount)) {
        console.warn(
          `[mongoose-currency-convert] WARNING: non-numeric amount at path '${sourcePath}': ${JSON.stringify(amount)}`,
        );
        continue;
      }

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

      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) continue;

      const dateValue = datePath ? getNestedValue(doc, datePath) : undefined;
      let conversionDate =
        dateValue &&
        (typeof dateValue === "string" ||
          typeof dateValue === "number" ||
          dateValue instanceof Date)
          ? new Date(dateValue)
          : new Date();
      if (Number.isNaN(conversionDate.getTime())) {
        console.warn(
          `[mongoose-currency-convert] Invalid date value at path '${datePath}', using current date`,
        );
        conversionDate = new Date();
      }

      if (dateTransform) conversionDate = dateTransform(conversionDate);

      const cacheKey = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}_${conversionDate.toISOString().slice(0, 10)}`;
      workItems.push({ field, amount, fromCurrency, conversionDate, cacheKey });
    }

    type RateResult = { success: true; rate: number } | { success: false; error: unknown };

    async function fetchRate({
      field,
      fromCurrency,
      conversionDate,
      cacheKey,
    }: WorkItem): Promise<RateResult> {
      try {
        let rate: number | undefined;
        if (cache) rate = await cache.get(cacheKey);

        if (rate === undefined) {
          rate = await getRate(fromCurrency, field.toCurrency, conversionDate);
          if (cache && rate !== undefined && !Number.isNaN(rate)) {
            try {
              await cache.set(cacheKey, rate);
            } catch (cacheErr) {
              console.warn("[mongoose-currency-convert] cache.set() failed:", cacheErr);
            }
          }
        }

        if (rate == null || Number.isNaN(rate)) {
          if (typeof fallbackRate === "number") {
            rate = fallbackRate;
          } else {
            throw new Error("Invalid rate");
          }
        }

        return { success: true, rate };
      } catch (error) {
        if (typeof fallbackRate === "number") {
          return { success: true, rate: fallbackRate };
        }
        return { success: false, error };
      }
    }

    const limit = Math.max(1, concurrency);
    const rateResults: RateResult[] = [];
    for (let i = 0; i < workItems.length; i += limit) {
      const batch = workItems.slice(i, i + limit);
      rateResults.push(...(await Promise.all(batch.map(fetchRate))));
    }

    const convertedFields: string[] = [];
    for (let i = 0; i < workItems.length; i++) {
      const { field, amount, fromCurrency, conversionDate } = workItems[i];
      const { sourcePath, targetPath, toCurrency } = field;
      const rateResult = rateResults[i];

      if (!rateResult.success) {
        if (onError) {
          onError({
            field: sourcePath,
            fromCurrency,
            toCurrency,
            date: conversionDate,
            error: rateResult.error,
          });
        } else {
          console.error(
            `[mongoose-currency-convert] Error converting ${sourcePath}:`,
            rateResult.error,
          );
        }
        if (rollbackOnError) {
          for (const convertedField of convertedFields) {
            setNestedValue(doc, convertedField, undefined);
            results.delete(convertedField);
          }
          break;
        }
        continue;
      }

      const convertedValue = {
        amount: round(Number(amount) * rateResult.rate),
        currency: toCurrency,
        date: conversionDate,
      };
      setNestedValue(doc, targetPath, convertedValue);
      results.set(targetPath, convertedValue);
      convertedFields.push(targetPath);
      if (onSuccess) {
        onSuccess({
          field: sourcePath,
          fromCurrency,
          toCurrency,
          originalAmount: amount,
          convertedAmount: convertedValue.amount,
          rate: rateResult.rate,
          date: conversionDate,
        });
      }
    }

    return results;
  }

  schema.pre("save", async function (this: Document) {
    const conversions = await applyCurrencyConversion(this as unknown as Record<string, unknown>);
    for (const [path, value] of conversions) {
      this.set(path, value);
    }
  });

  async function handleUpdateMiddleware(
    this: import("mongoose").Query<unknown, unknown>,
    next: (err?: Error) => void,
  ) {
    const update = this.getUpdate();
    if (!update) return next();

    const updateAny = update as Record<string, unknown>;
    let doc: Record<string, unknown>;
    try {
      if (typeof updateAny.$set === "object" && updateAny.$set !== null) {
        doc = { ...updateAny.$set };
        await applyCurrencyConversion(doc);
        updateAny.$set = doc;
      } else {
        doc = { ...updateAny };
        await applyCurrencyConversion(doc);
        Object.assign(updateAny, doc);
      }

      if (typeof updateAny.$setOnInsert === "object" && updateAny.$setOnInsert !== null) {
        const insertDoc = { ...updateAny.$setOnInsert } as Record<string, unknown>;
        await applyCurrencyConversion(insertDoc);
        updateAny.$setOnInsert = insertDoc;
      }
    } catch (err) {
      return next(err instanceof Error ? err : new Error(String(err)));
    }
    next();
  }

  schema.pre("findOneAndUpdate", handleUpdateMiddleware);
  schema.pre("updateOne", handleUpdateMiddleware);
  schema.pre("updateMany", handleUpdateMiddleware);
}
