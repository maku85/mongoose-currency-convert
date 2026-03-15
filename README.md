# mongoose-currency-convert

[![npm version](https://img.shields.io/npm/v/mongoose-currency-convert.svg)](https://www.npmjs.com/package/mongoose-currency-convert)
[![Release](https://github.com/maku85/mongoose-currency-convert/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/maku85/mongoose-currency-convert/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight Mongoose plugin for automatic currency conversion at save and update time — flexible, extensible, and service-agnostic.

## Features

- **Automatic currency conversion** on `save`, `updateOne`, `updateMany`, and `findOneAndUpdate`
- **Parallel rate fetching** with optional concurrency limit
- **Same-currency short-circuit** — no external call when source and target currency are equal
- **Customizable exchange rate logic** via a user-provided `getRate` function
- **Support for nested paths** in documents
- **Pluggable rounding function** (default: round to 2 decimal places)
- **Optional in-memory cache** with active TTL eviction, or bring your own (Redis, Memcached, …)
- **Fallback rate** when `getRate` fails or returns an invalid value
- **Error handling and rollback** on conversion failure (`onError`, `rollbackOnError`)
- **Success callback** for audit logging and monitoring (`onSuccess`)
- **Rate bounds validation** to reject out-of-range rates from the provider
- **Per-operation skip** via `$locals` or query option
- **Full ISO 4217 currency code validation** (170+ codes), with public `isValidCurrencyCode` utility
- **ESM and CommonJS** compatible, fully typed

## Installation

```sh
npm install mongoose-currency-convert
# or
pnpm add mongoose-currency-convert
```

## Quick start

```ts
import mongoose, { Schema } from 'mongoose';
import { currencyConversionPlugin } from 'mongoose-currency-convert';

const ProductSchema = new Schema({
  price: {
    amount: Number,
    currency: String,
    date: Date,
  },
  priceEur: {
    amount: Number,
    currency: String,
    date: Date,
  },
});

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [
    {
      sourcePath: 'price.amount',    // path of the amount to convert
      currencyPath: 'price.currency', // path of the source currency code
      datePath: 'price.date',        // (optional) path of the reference date
      targetPath: 'priceEur',        // where to write the converted result
      toCurrency: 'EUR',             // target currency code
    },
  ],
  getRate: async (from, to, date) => {
    // Fetch the exchange rate from any service you prefer
    return 0.85; // example: 1 USD = 0.85 EUR
  },
});

const Product = mongoose.model('Product', ProductSchema);

// Conversion happens automatically on save and updates
const p = await new Product({ price: { amount: 100, currency: 'USD' } }).save();
// p.priceEur → { amount: 85, currency: 'EUR', date: <Date> }
```

## Supported operations

Currency conversion is applied automatically for:

| Operation | Notes |
|-----------|-------|
| `save` | Applies on initial insert and subsequent saves |
| `updateOne` | Handles both `$set` and plain update objects |
| `updateMany` | Same behaviour as `updateOne` |
| `findOneAndUpdate` | Handles both `$set` and plain update objects |

`$setOnInsert` fields inside upsert operations are also converted.

## Plugin options

All options are defined in the `CurrencyPluginOptions` interface and can be imported from `mongoose-currency-convert/types`.

### Required

| Option | Type | Description |
|--------|------|-------------|
| `fields` | `CurrencyFieldConfig[]` | Array of field mappings (see below) |
| `getRate` | `(from, to, date?) => Promise<number>` | Returns the exchange rate for a currency pair |

### `CurrencyFieldConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `sourcePath` | `string` | ✓ | Dot-notation path of the amount to convert |
| `currencyPath` | `string` | ✓ | Dot-notation path of the source currency code |
| `targetPath` | `string` | ✓ | Dot-notation path where the result is written |
| `toCurrency` | `string` | ✓ | ISO 4217 target currency code |
| `datePath` | `string` | | Dot-notation path of the reference date for the rate |

The target path must point to a schema object with `amount`, `currency`, and `date` fields.

### Optional

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `round` | `(value: number) => number` | Round to 2 decimals | Custom rounding function |
| `cache` | `CurrencyRateCache<number>` | — | Cache for exchange rates |
| `allowedCurrencyCodes` | `string[]` | Full ISO 4217 list | Restrict accepted currency codes |
| `fallbackRate` | `number` | — | Rate to use when `getRate` throws or returns an invalid value |
| `onError` | `(ctx: CurrencyPluginErrorContext) => void` | `console.error` | Called on rate fetch failure |
| `onSuccess` | `(ctx: CurrencyPluginSuccessContext) => void` | — | Called after each successful conversion |
| `rollbackOnError` | `boolean` | `false` | If `true`, clears already-converted fields when a field fails |
| `dateTransform` | `(date: Date) => Date` | — | Transform the conversion date before passing it to `getRate` |
| `concurrency` | `number` | `Infinity` | Max parallel `getRate` calls per document |
| `rateValidation` | `{ min?: number; max?: number }` | — | Reject rates outside this range (throws, triggers `onError`/fallback) |

## Caching

### Built-in `SimpleCache`

An in-memory LRU cache with TTL-based eviction is included. The cache key is `{from}_{to}_{YYYY-MM-DD}`.

```ts
import { SimpleCache } from 'mongoose-currency-convert/cache';

const cache = new SimpleCache(60); // TTL in minutes, default 60

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* … */],
  getRate: async (from, to, date) => { /* … */ },
  cache,
});

// When shutting down, clear the sweep timer to avoid process hang
cache.destroy();
```

### Custom cache (e.g. Redis)

Implement the `CurrencyRateCache` interface:

```ts
import { createClient } from 'redis';
import type { CurrencyRateCache } from 'mongoose-currency-convert/types';

class RedisCache implements CurrencyRateCache<number> {
  private client = createClient({ url: 'redis://localhost:6379' });

  constructor() { this.client.connect(); }

  async get(key: string): Promise<number | undefined> {
    const v = await this.client.get(key);
    return v != null ? Number(v) : undefined;
  }

  async set(key: string, value: number): Promise<void> {
    await this.client.set(key, String(value), { EX: 86400 });
  }
}

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* … */],
  getRate: async (from, to, date) => { /* … */ },
  cache: new RedisCache(),
});
```

## Error handling

```ts
ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* … */],
  getRate: myGetRate,

  // Called when a conversion fails; receives details about the failure
  onError: (ctx) => {
    console.error(`Conversion failed: ${ctx.fromCurrency} → ${ctx.toCurrency}`, ctx.error);
  },

  // Use a static rate when getRate fails or returns an invalid value
  fallbackRate: 1,

  // Undo already-converted fields if any field in the document fails
  rollbackOnError: true,
});
```

The `CurrencyPluginErrorContext` object contains:

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | `sourcePath` of the failing field |
| `fromCurrency` | `string` | Source currency code |
| `toCurrency` | `string` | Target currency code |
| `date` | `Date` | Conversion date used |
| `error` | `unknown` | The original error |

## Multiple fields

Multiple fields are fetched **in parallel** and written sequentially. Use `concurrency` to cap simultaneous `getRate` calls (useful with rate-limited providers):

```ts
ProductSchema.plugin(currencyConversionPlugin, {
  fields: [
    { sourcePath: 'price.amount', currencyPath: 'price.currency', targetPath: 'priceEur', toCurrency: 'EUR' },
    { sourcePath: 'price.amount', currencyPath: 'price.currency', targetPath: 'priceGbp', toCurrency: 'GBP' },
  ],
  getRate: myGetRate,
  concurrency: 3, // at most 3 getRate calls at a time
});
```

## Success callback

Use `onSuccess` for audit logging, monitoring, or debugging in production:

```ts
ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* … */],
  getRate: myGetRate,
  onSuccess: (ctx) => {
    console.log(
      `Converted ${ctx.originalAmount} ${ctx.fromCurrency} → ${ctx.convertedAmount} ${ctx.toCurrency} at rate ${ctx.rate}`,
    );
  },
});
```

The `CurrencyPluginSuccessContext` object contains:

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | `sourcePath` of the converted field |
| `fromCurrency` | `string` | Source currency code |
| `toCurrency` | `string` | Target currency code |
| `originalAmount` | `number` | Amount before conversion |
| `convertedAmount` | `number` | Amount after conversion |
| `rate` | `number` | Exchange rate used |
| `date` | `Date` | Conversion date used |
| `usedFallback` | `boolean` | `true` when `fallbackRate` was used instead of the rate from `getRate` |

## Rate bounds validation

Protect against buggy providers that return nonsensical rates:

```ts
ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* … */],
  getRate: myGetRate,
  rateValidation: { min: 0.0001, max: 10000 },
  onError: (ctx) => console.error('Rate out of bounds:', ctx.error),
});
```

Rates outside the range are treated as errors and follow the same `onError` / `fallbackRate` / `rollbackOnError` flow.

## Skipping conversion

To skip conversion for a single operation (e.g. during data migration or seeding):

```ts
// On save — use $locals
const doc = new Product({ price: { amount: 100, currency: 'USD' } });
doc.$locals.skipCurrencyConversion = true;
await doc.save();

// On update queries — pass as a query option
await Product.updateOne(
  { _id: id },
  { $set: { 'price.amount': 200 } },
  { skipCurrencyConversion: true },
);
```

## Currency code validation

`isValidCurrencyCode` is exported as a standalone utility, useful for validating user input in forms or API handlers:

```ts
import { isValidCurrencyCode } from 'mongoose-currency-convert/validate';

isValidCurrencyCode('EUR'); // true
isValidCurrencyCode('XYZ'); // false
isValidCurrencyCode('usd'); // true — normalised to uppercase internally

// Restrict to a custom list
isValidCurrencyCode('EUR', ['USD', 'EUR', 'GBP']); // true
isValidCurrencyCode('JPY', ['USD', 'EUR', 'GBP']); // false
```

## TypeScript

All types are exported:

```ts
import type {
  CurrencyPluginOptions,
  CurrencyFieldConfig,
  CurrencyPluginErrorContext,
  CurrencyPluginSuccessContext,
  CurrencyRateCache,
  GetRateFn,
} from 'mongoose-currency-convert/types';
```

## Extension plugins

Ready-made `getRate` providers:

| Package | Description |
|---------|-------------|
| [`mongoose-currency-convert-ecb`](https://www.npmjs.com/package/mongoose-currency-convert-ecb) | European Central Bank exchange rates |

### Creating your own provider

```ts
import type { GetRateFn } from 'mongoose-currency-convert/types';

export function createMyProvider(): GetRateFn {
  return async (from, to, date) => {
    // fetch rate from your service
    return rate;
  };
}
```

> The cache is managed by the base plugin. Providers only need to return a rate — they should not interact with the cache directly.

## Limitations

- Only `$set` and plain update objects are converted in update operations. Other MongoDB operators (`$inc`, `$push`, etc.) are not automatically converted.
- Deep array update paths (e.g. `items.$.price`) may require manual handling.

## Compatibility

- Node.js ≥ 18
- Mongoose ≥ 7
- TypeScript ≥ 5 (optional)

## Contributing

Contributions are welcome. Please open an issue first for major changes.
See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
