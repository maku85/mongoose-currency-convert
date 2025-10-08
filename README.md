# mongoose-currency-convert

[![npm version](https://img.shields.io/npm/v/mongoose-currency-convert.svg)](https://www.npmjs.com/package/mongoose-currency-convert)
[![Release](https://github.com/maku85/mongoose-currency-convert/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/maku85/mongoose-currency-convert/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight Mongoose plugin for automatic currency conversion at save time - flexible, extensible, and service-agnostic.

## Features

- **Automatic currency conversion** for specified fields when saving documents or updating them.
- **Customizable exchange rate logic** via a user-provided function or extension plugin.
- **Support for nested paths** in documents.
- **Pluggable rounding function** (default: round to 2 decimals).
- **Simple in-memory cache** for exchange rates (optional).
- **Error handling and rollback** on conversion failure.
- **Fully tested** with high code coverage.
- **Compatible with ESM and CommonJS**.

## Installation

```sh
npm install mongoose-currency-convert
# or
pnpm add mongoose-currency-convert
```

## Usage

```ts
import mongoose, { Schema } from 'mongoose';
import { currencyConversionPlugin } from 'mongoose-currency-convert';

const ProductSchema = new Schema({
  price: {
    amount: Number,
    currency: String,
    date: Date,
  },
  priceConversion: {
    amount: Number,
    currency: String,
    date: Date,
  },
});

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [
    {
      sourcePath: 'price.amount',
      currencyPath: 'price.currency',
      datePath: 'price.date',
      targetPath: 'priceConversion',
      toCurrency: 'EUR',
    },
  ],
  getRate: async (from, to, date) => {
    // Implement your logic to fetch the exchange rate
    return 0.85; // Example: USD → EUR
  },
  // Optional: custom rounding function
  round: (value) => Math.round(value * 100) / 100,
});

const Product = mongoose.model('Product', ProductSchema);
```

## Supported Mongoose Operations

- `save`
- `updateOne`
- `findOneAndUpdate`

Currency conversion is automatically applied when saving or updating documents using these operations.

## Plugin Options

- `fields`: Array of field mapping objects:
  - `sourcePath`: Path to the source amount (supports nested and array paths).
  - `currencyPath`: Path to the source currency.
  - `datePath` (optional): Path to the date for conversion.
  - `targetPath`: Path to write the converted value.
  - `toCurrency`: Target currency code.
- `getRate(from: string, to: string, date: Date)`: Async function returning the exchange rate.
- `round(value: number)`: Optional rounding function.
- `allowedCurrencyCodes`: Optional array of allowed currency codes (ISO 4217).
- `onError(ctx)`: Optional callback called when a conversion error occurs. Receives an object with details.
- `fallbackRate`: Optional fallback rate if the conversion rate is invalid or missing.
- `rollbackOnError`: Optional boolean. If true, revokes all conversions made if there's an error.
- `cache`: Optional cache object for exchange rates (see `SimpleCache`).
- `dateTransform(date: Date)`: Optional function to transform the conversion date.

## Caching Exchange Rates

You can use the built-in in-memory cache (`SimpleCache` in `src/utils/cache.ts`) or provide your own cache implementation (e.g. backed by Redis, Memcached, etc.).

### Using the Internal SimpleCache
```ts
import { SimpleCache } from 'mongoose-currency-convert/cache';

const cache = new SimpleCache<number>();

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* ... */],
  getRate: async (from, to, date) => { /* ... */ },
  cache,
});
```

### Using an External Cache (e.g. Redis)
You can implement the `CurrencyRateCache` interface to use any external service:

```ts
import { createClient } from 'redis';
import type { CurrencyRateCache } from 'mongoose-currency-convert/types';

class RedisCache implements CurrencyRateCache<number> {
  private client = createClient({ url: 'redis://localhost:6379' });
  constructor() { this.client.connect(); }

  async get(key: string): Promise<number | undefined> {
    const value = await this.client.get(key);
    return value ? Number(value) : undefined;
  }
  async set(key: string, value: number): Promise<void> {
    await this.client.set(key, value.toString(), { EX: 86400 }); // 1 day expiry
  }
}

const cache = new RedisCache();

ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* ... */],
  getRate: async (from, to, date) => { /* ... */ },
  cache,
});
```

## Error Handling Example

You can handle conversion errors using the `onError` callback:

```ts
ProductSchema.plugin(currencyConversionPlugin, {
  fields: [/* ... */],
  getRate: async () => { throw new Error('rate error'); },
  onError: (ctx) => {
    console.error('Conversion error:', ctx);
  },
  rollbackOnError: true,
});
```

## TypeScript Support

- Fully typed, with exported types for plugin options and error context.
- Example:

```ts
import type { CurrencyPluginOptions, CurrencyPluginErrorContext } from 'mongoose-currency-convert/types';
```

## Extension Plugins (e.g. ECB)

You can use or create extension plugins that provide a ready-to-use `getRate` function for external services (e.g. European Central Bank, exchangerate.host, etc.).

| Package | Description |
|---------|-------------|
| [`mongoose-currency-converter-ecb`](https://www.npmjs.com/package/mongoose-currency-convert-ecb) | ECB provider for automatic exchange rate lookup. |

### How to Create Your Own Extension Plugin

1. Import the types from the base plugin:
   ```ts
   import type { GetRateFn } from 'mongoose-currency-convert';
   ```
2. Implement a factory function that returns a `getRate` function:
   ```ts
   export function createMyGetRate(): GetRateFn {
     return async function getRate(from, to, date) {
       // Fetch rate from your service
       // Return the rate
     };
   }
   ```
3. Use your plugin in the base plugin configuration:
   ```ts
   ProductSchema.plugin(currencyConversionPlugin, {
     fields: [/* ... */],
     getRate: createMyGetRate(),
     cache,
   });
   ```

> **Note:** The cache is managed by the base plugin. Extension plugins should not read or write to the cache directly; they only fetch rates from external services.

## Limitations & Known Issues

- Only `save`, `updateOne`, and `findOneAndUpdate` are supported for automatic conversion.
- Array paths are supported, but deep array updates (e.g. `items.$.price`) may require manual handling.
- Only `$set` and direct field updates are converted in update operations; other MongoDB operators (`$inc`, `$push`, etc.) are not automatically converted.
- The list of supported currency codes is static (ISO 4217).
- If you use custom cache, ensure it implements the required interface.

## Compatibility

- Node.js >= 18.x
- Mongoose >= 7.x
- TypeScript >= 5.x (optional)

## Contributing

Contributions are welcome! To contribute:
- Fork the repository and create a new branch.
- Submit a pull request with a clear description of your changes.
- Follow the coding style and add tests for new features or bug fixes.
- For major changes, open an issue first to discuss your idea.

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details (if available).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and release history.

## License

MIT
