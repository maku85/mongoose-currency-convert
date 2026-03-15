import { expect } from 'chai';
import { Schema, model } from 'mongoose';

import type { CurrencyPluginErrorContext, CurrencyPluginOptions, CurrencyPluginSuccessContext, CurrencyRateCache } from '../src/types';
import { connectTestDB, disconnectTestDB, clearDatabase } from './setup';
import { currencyConversionPlugin } from '../src';
import { SimpleCache } from '../src/utils/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ────────────────────────────────────────────────────────────────

const RESULT_FIELD = { amount: Number, currency: String, date: Date };

let modelCount = 0;
function uniqueName() {
  return `TestModel_${++modelCount}`;
}

function buildSchema(extra: Record<string, unknown> = {}) {
  return new Schema({
    price: Number,
    currency: String,
    result: { ...RESULT_FIELD },
    ...extra,
  });
}

function addPlugin(
  schema: Schema,
  opts: Partial<CurrencyPluginOptions> & Record<string, unknown> = {},
) {
  schema.plugin(currencyConversionPlugin, {
    fields: [
      {
        sourcePath: 'price',
        currencyPath: 'currency',
        targetPath: 'result',
        toCurrency: 'EUR',
      },
    ],
    getRate: async () => 2,
    ...opts,
  });
  return model(uniqueName(), schema);
}

class MockCache implements CurrencyRateCache<number> {
  store = new Map<string, number>();
  async get(key: string) { return this.store.get(key); }
  async set(key: string, value: number) { this.store.set(key, value); }
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('currencyConversionPlugin', () => {
  before(connectTestDB);
  after(disconnectTestDB);
  afterEach(clearDatabase);

  // ── Initialization ───────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should throw if fields is undefined', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: undefined,
          getRate: async () => 1,
        } as unknown as CurrencyPluginOptions),
      ).to.throw('"fields" must be a non-empty array');
    });

    it('should throw if fields is not an array', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: 'not-an-array',
          getRate: async () => 1,
        } as unknown as CurrencyPluginOptions),
      ).to.throw('"fields" must be a non-empty array');
    });

    it('should throw if fields is an empty array', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, { fields: [], getRate: async () => 1 }),
      ).to.throw('"fields" must be a non-empty array');
    });

    it('should throw if getRate is not a function', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: [{ sourcePath: 'a', currencyPath: 'b', targetPath: 'c', toCurrency: 'EUR' }],
          getRate: 123 as never,
        }),
      ).to.throw('"getRate" must be a function');
    });

    it('should throw if rateValidation.min > rateValidation.max', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: [{ sourcePath: 'a', currencyPath: 'b', targetPath: 'c', toCurrency: 'EUR' }],
          getRate: async () => 1,
          rateValidation: { min: 100, max: 1 },
        }),
      ).to.throw('"rateValidation.min" must be <= "rateValidation.max"');
    });

    it('should throw if rateValidation.min is not a number', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: [{ sourcePath: 'a', currencyPath: 'b', targetPath: 'c', toCurrency: 'EUR' }],
          getRate: async () => 1,
          rateValidation: { min: 'low' as never },
        }),
      ).to.throw('"rateValidation.min" must be a number');
    });

    it('should throw if dateTransform is not a function', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: [{ sourcePath: 'a', currencyPath: 'b', targetPath: 'c', toCurrency: 'EUR' }],
          getRate: async () => 1,
          dateTransform: 'not-a-function' as never,
        }),
      ).to.throw('"dateTransform" must be a function');
    });

    it('should throw if toCurrency in a field config is invalid', () => {
      const schema = {} as Schema;
      expect(() =>
        currencyConversionPlugin(schema, {
          fields: [{ sourcePath: 'a', currencyPath: 'b', targetPath: 'c', toCurrency: 'FAKE' }],
          getRate: async () => 1,
        }),
      ).to.throw('invalid toCurrency "FAKE"');
    });
  });

  // ── SimpleCache ───────────────────────────────────────────────────────────

  describe('SimpleCache', () => {
    it('should throw when ttlMinutes is 0', () => {
      expect(() => new SimpleCache(0)).to.throw('ttlMinutes must be > 0');
    });

    it('should throw when ttlMinutes is negative', () => {
      expect(() => new SimpleCache(-1)).to.throw('ttlMinutes must be > 0');
    });

    it('should work normally with a positive ttlMinutes', () => {
      const cache = new SimpleCache(1);
      cache.set('key', 42);
      expect(cache.get('key')).to.equal(42);
      cache.destroy();
    });
  });

  // ── pre-save ─────────────────────────────────────────────────────────────

  describe('pre("save")', () => {
    it('should convert currency and store result on save', async () => {
      const Doc = addPlugin(buildSchema());
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(20);
      expect(saved?.result.currency).to.equal('EUR');
      expect(saved?.result.date).to.be.instanceOf(Date);
    });

    it('should skip conversion when amount is non-numeric', async () => {
      const schema = new Schema({ price: Schema.Types.Mixed, currency: String, result: { ...RESULT_FIELD } });
      addPlugin(schema);
      const Doc = model(uniqueName(), schema);

      for (const badValue of [{}, [], 'abc']) {
        const doc = await new Doc({ price: badValue, currency: 'USD' }).save();
        const saved = await Doc.findById(doc._id).lean() as AnyDoc;
        expect(saved?.result).to.be.undefined;
      }
    });

    it('should skip conversion if price is missing', async () => {
      const Doc = addPlugin(buildSchema());
      const doc = await new Doc({ currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should skip conversion if currency is missing', async () => {
      const Doc = addPlugin(buildSchema());
      const doc = await new Doc({ price: 10 }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should skip conversion when fromCurrency equals toCurrency', async () => {
      const Doc = addPlugin(buildSchema());
      // EUR → EUR: same currency, no conversion
      const doc = await new Doc({ price: 10, currency: 'EUR' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should skip conversion for invalid source currency code', async () => {
      const Doc = addPlugin(buildSchema());
      const doc = await new Doc({ price: 10, currency: 'FAKE' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should apply a custom round function', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => 1.555,
        round: (v: number) => Math.floor(v * 100) / 100,
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(15.55);
    });

    it('should use datePath when provided', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        txDate: Date,
        result: { ...RESULT_FIELD },
      });
      let capturedDate: Date | undefined;
      schema.plugin(currencyConversionPlugin, {
        fields: [
          {
            sourcePath: 'price',
            currencyPath: 'currency',
            datePath: 'txDate',
            targetPath: 'result',
            toCurrency: 'EUR',
          },
        ],
        getRate: async (_f, _t, date) => { capturedDate = date; return 2; },
      });
      const Doc = model(uniqueName(), schema);
      const txDate = new Date('2024-06-01');
      await new Doc({ price: 10, currency: 'USD', txDate }).save();

      expect(capturedDate?.toISOString().slice(0, 10)).to.equal('2024-06-01');
    });

    it('should use current date when datePath points to an invalid date string', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        txDate: String,
        result: { ...RESULT_FIELD },
      });
      let capturedDate: Date | undefined;
      schema.plugin(currencyConversionPlugin, {
        fields: [
          {
            sourcePath: 'price',
            currencyPath: 'currency',
            datePath: 'txDate',
            targetPath: 'result',
            toCurrency: 'EUR',
          },
        ],
        getRate: async (_f, _t, date) => { capturedDate = date; return 2; },
      });
      const Doc = model(uniqueName(), schema);
      const before = new Date();
      await new Doc({ price: 10, currency: 'USD', txDate: 'not-a-date' }).save();
      const after = new Date();

      expect(capturedDate).to.be.instanceOf(Date);
      expect(capturedDate?.getTime()).to.be.within(before.getTime() - 1000, after.getTime() + 1000);
    });

    it('should apply dateTransform to the conversion date', async () => {
      const fixedDate = new Date(Date.UTC(2000, 0, 1));
      let capturedDate: Date | undefined;
      const Doc = addPlugin(buildSchema(), {
        getRate: async (_f: string, _t: string, date?: Date) => { capturedDate = date; return 2; },
        dateTransform: () => fixedDate,
      });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(capturedDate?.toISOString()).to.equal(fixedDate.toISOString());
    });

    it('should skip conversion when $locals.skipCurrencyConversion is true', async () => {
      const Doc = addPlugin(buildSchema());
      const doc = new Doc({ price: 10, currency: 'USD' });
      doc.$locals.skipCurrencyConversion = true;
      await doc.save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should also reject fallbackRate when it is out of rateValidation bounds', async () => {
      let capturedError: unknown;
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('service down'); },
        rateValidation: { min: 0, max: 10 },
        fallbackRate: 999, // out of bounds
        onError: (ctx) => { capturedError = ctx.error; },
      });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(capturedError).to.be.instanceOf(Error);
      expect((capturedError as Error).message).to.include('out of bounds');
    });

    it('should use fallbackRate when it is within rateValidation bounds', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('service down'); },
        rateValidation: { min: 0, max: 10 },
        fallbackRate: 5, // within bounds
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(50);
    });

    it('should reject rate outside rateValidation bounds and call onError', async () => {
      let capturedError: unknown;
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => 999,
        rateValidation: { min: 0, max: 10 },
        onError: (ctx) => { capturedError = ctx.error; },
      });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(capturedError).to.be.instanceOf(Error);
      expect((capturedError as Error).message).to.include('out of bounds');
    });

    it('should call onSuccess after a successful conversion', async () => {
      const calls: CurrencyPluginSuccessContext[] = [];
      const Doc = addPlugin(buildSchema(), { onSuccess: (ctx) => { calls.push(ctx); } });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(calls).to.have.length(1);
      expect(calls[0]?.field).to.equal('price');
      expect(calls[0]?.fromCurrency).to.equal('USD');
      expect(calls[0]?.toCurrency).to.equal('EUR');
      expect(calls[0]?.originalAmount).to.equal(10);
      expect(calls[0]?.convertedAmount).to.equal(20);
      expect(calls[0]?.rate).to.equal(2);
      expect(calls[0]?.date).to.be.instanceOf(Date);
      expect(calls[0]?.usedFallback).to.equal(false);
    });

    it('should set usedFallback: true in onSuccess when fallbackRate is used', async () => {
      const calls: CurrencyPluginSuccessContext[] = [];
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('down'); },
        fallbackRate: 3,
        onSuccess: (ctx) => { calls.push(ctx); },
      });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(calls).to.have.length(1);
      expect(calls[0]?.usedFallback).to.equal(true);
      expect(calls[0]?.rate).to.equal(3);
    });

    it('should not fail save when cache.get() throws', async () => {
      const brokenCache: CurrencyRateCache<number> = {
        get: async () => { throw new Error('cache read unavailable'); },
        set: async () => undefined,
      };
      const Doc = addPlugin(buildSchema(), { cache: brokenCache });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      // cache miss fallback → getRate called → conversion succeeds
      expect(saved?.result.amount).to.equal(20);
    });

    it('should not fail save when cache.set() throws', async () => {
      const brokenCache: CurrencyRateCache<number> = {
        get: async () => undefined,
        set: async () => { throw new Error('cache unavailable'); },
      };
      const Doc = addPlugin(buildSchema(), { cache: brokenCache });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(20);
    });

    it('should use fallbackRate when getRate throws', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('service down'); },
        fallbackRate: 3,
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(30);
    });

    it('should use fallbackRate when getRate returns NaN', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => NaN,
        fallbackRate: 5,
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result.amount).to.equal(50);
    });

    it('should call onError when getRate throws', async () => {
      let ctx: CurrencyPluginErrorContext | undefined;
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('fail'); },
        onError: (c: CurrencyPluginErrorContext) => { ctx = c; },
      });
      await new Doc({ price: 10, currency: 'USD' }).save();

      expect(ctx).to.exist;
      expect(ctx?.field).to.equal('price');
      expect(ctx?.fromCurrency).to.equal('USD');
      expect(ctx?.toCurrency).to.equal('EUR');
      expect(ctx?.error).to.be.instanceOf(Error);
    });

    it('should log to console.error when getRate throws and onError is not set', async () => {
      const logged: string[] = [];
      const origError = console.error;
      console.error = (msg: string) => logged.push(msg);

      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('fail'); },
      });
      await new Doc({ price: 10, currency: 'USD' }).save();
      console.error = origError;

      expect(logged.some((m) => m.includes('Error converting'))).to.be.true;
    });

    it('should rollback already-converted fields when rollbackOnError is true', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f, to) => {
          if (to === 'GBP') throw new Error('fail GBP');
          return 2;
        },
        rollbackOnError: true,
      });
      const Doc = model(uniqueName(), schema);
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
      expect(saved?.result2).to.be.undefined;
    });

    it('should use cache and avoid duplicate getRate calls', async () => {
      let rateCalls = 0;
      const cache = new MockCache();
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { rateCalls++; return 2; },
        cache,
      });

      await new Doc({ price: 10, currency: 'USD' }).save();
      await new Doc({ price: 20, currency: 'USD' }).save();

      expect(rateCalls).to.equal(1);
    });

    it('should use cache hit and not call getRate', async () => {
      let rateCalls = 0;
      const cache: CurrencyRateCache<number> = {
        get: async () => 5,
        set: async () => {},
      };
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { rateCalls++; return 2; },
        cache,
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(rateCalls).to.equal(0);
      expect(saved?.result.amount).to.equal(50);
    });

    it('should restrict conversion to allowedCurrencyCodes', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => 2,
        allowedCurrencyCodes: ['EUR', 'GBP'],
      });
      // USD not in the allowed list → skip
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result).to.be.undefined;
    });

    it('should not throw if conversion fails without fallbackRate (no onError)', async () => {
      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('fail'); },
      });
      let threw = false;
      try { await new Doc({ price: 10, currency: 'USD' }).save(); } catch { threw = true; }
      expect(threw).to.be.false;
    });

    it('should use original date and complete conversion when dateTransform throws', async () => {
      const warnings: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: unknown[]) => warnings.push(String(args[0]));

      let capturedDate: Date | undefined;
      const before = new Date();
      const Doc = addPlugin(buildSchema(), {
        getRate: async (_f: string, _t: string, date?: Date) => { capturedDate = date; return 2; },
        dateTransform: () => { throw new Error('transform error'); },
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const after = new Date();
      console.warn = origWarn;

      const saved = await Doc.findById(doc._id).lean() as AnyDoc;
      // conversion still completes using original date
      expect(saved?.result.amount).to.equal(20);
      // captured date is the original (non-transformed) date
      expect(capturedDate?.getTime()).to.be.within(before.getTime() - 1000, after.getTime() + 1000);
      // warning was logged
      expect(warnings.some((w) => w.includes('dateTransform threw'))).to.be.true;
    });

    it('should not break save when onSuccess callback throws', async () => {
      const errors: unknown[] = [];
      const origError = console.error;
      console.error = (...args: unknown[]) => errors.push(args[0]);

      const Doc = addPlugin(buildSchema(), {
        onSuccess: () => { throw new Error('onSuccess boom'); },
      });
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      console.error = origError;

      const saved = await Doc.findById(doc._id).lean() as AnyDoc;
      expect(saved?.result.amount).to.equal(20);
      expect(errors.some((e) => String(e).includes('onSuccess callback threw'))).to.be.true;
    });

    it('should not break save when onError callback throws', async () => {
      const errors: unknown[] = [];
      const origError = console.error;
      console.error = (...args: unknown[]) => errors.push(args[0]);

      const Doc = addPlugin(buildSchema(), {
        getRate: async () => { throw new Error('rate fail'); },
        onError: () => { throw new Error('onError boom'); },
      });
      let threw = false;
      try { await new Doc({ price: 10, currency: 'USD' }).save(); } catch { threw = true; }
      console.error = origError;

      expect(threw).to.be.false;
      expect(errors.some((e) => String(e).includes('onError callback threw'))).to.be.true;
    });
  });

  // ── updateOne ────────────────────────────────────────────────────────────

  describe('pre("updateOne")', () => {
    it('should convert currency on updateOne with $set', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.updateOne({ _id: created._id }, { $set: { price: 10, currency: 'USD' } });
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      expect(updated?.result.amount).to.equal(20);
    });

    it('should convert currency on updateOne without $set', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.updateOne({ _id: created._id }, { price: 20, currency: 'USD' });
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      expect(updated?.result.amount).to.equal(40);
    });

    it('should rollback already-converted fields on updateOne when rollbackOnError is true', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f: string, to: string) => {
          if (to === 'GBP') throw new Error('fail GBP');
          return 2;
        },
        rollbackOnError: true,
      });
      const Doc = model(uniqueName(), schema);
      const created = await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.updateOne(
        { _id: created._id },
        { $set: { price: 10, currency: 'USD' } },
      );
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      // rollback: result should not have been set
      expect(updated?.result).to.be.undefined;
      expect(updated?.result2).to.be.undefined;
    });

    it('should skip conversion on updateOne when skipCurrencyConversion option is true', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();
      // first save: price 5 * rate 2 = result.amount 10

      await Doc.updateOne(
        { _id: created._id },
        { $set: { price: 100, currency: 'USD' } },
        { skipCurrencyConversion: true } as never,
      );
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      // conversion skipped → result.amount still 10, not 200
      expect(updated?.result.amount).to.equal(10);
    });
  });

  // ── findOneAndUpdate ─────────────────────────────────────────────────────

  describe('pre("findOneAndUpdate")', () => {
    it('should convert currency on findOneAndUpdate', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();

      const updated = await Doc.findOneAndUpdate(
        { _id: created._id },
        { $set: { price: 15, currency: 'USD' } },
        { new: true },
      );

      expect((updated as AnyDoc)?.result.amount).to.equal(30);
    });

    it('should rollback already-converted fields on findOneAndUpdate when rollbackOnError is true', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f: string, to: string) => {
          if (to === 'GBP') throw new Error('fail GBP');
          return 2;
        },
        rollbackOnError: true,
      });
      const Doc = model(uniqueName(), schema);
      const created = await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.findOneAndUpdate(
        { _id: created._id },
        { $set: { price: 10, currency: 'USD' } },
      );
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      expect(updated?.result).to.be.undefined;
      expect(updated?.result2).to.be.undefined;
    });

    it('should skip conversion on findOneAndUpdate when skipCurrencyConversion is true', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();
      // first save: result.amount = 10

      await Doc.findOneAndUpdate(
        { _id: created._id },
        { $set: { price: 100, currency: 'USD' } },
        { skipCurrencyConversion: true } as never,
      );
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      expect(updated?.result.amount).to.equal(10); // unchanged
    });
  });

  // ── updateMany ───────────────────────────────────────────────────────────

  describe('pre("updateMany")', () => {
    it('should convert currency on updateMany', async () => {
      const Doc = addPlugin(buildSchema());
      await new Doc({ price: 5, currency: 'USD' }).save();
      await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.updateMany({}, { $set: { price: 10, currency: 'USD' } });
      const docs = await Doc.find({}).lean() as AnyDoc[];

      for (const doc of docs) {
        expect(doc.result.amount).to.equal(20);
      }
    });

    it('should rollback already-converted fields on updateMany when rollbackOnError is true', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f: string, to: string) => {
          if (to === 'GBP') throw new Error('fail GBP');
          return 2;
        },
        rollbackOnError: true,
      });
      const Doc = model(uniqueName(), schema);
      await new Doc({ price: 5, currency: 'USD' }).save();

      await Doc.updateMany({}, { $set: { price: 10, currency: 'USD' } });
      const docs = await Doc.find({}).lean() as AnyDoc[];

      for (const doc of docs) {
        expect(doc.result).to.be.undefined;
        expect(doc.result2).to.be.undefined;
      }
    });

    it('should skip conversion on updateMany when skipCurrencyConversion is true', async () => {
      const Doc = addPlugin(buildSchema());
      const created = await new Doc({ price: 5, currency: 'USD' }).save();
      // first save: result.amount = 10

      await Doc.updateMany(
        { _id: created._id },
        { $set: { price: 100, currency: 'USD' } },
        { skipCurrencyConversion: true } as never,
      );
      const updated = await Doc.findById(created._id).lean() as AnyDoc;

      expect(updated?.result.amount).to.equal(10); // unchanged
    });
  });

  // ── $setOnInsert ─────────────────────────────────────────────────────────

  describe('$setOnInsert (upsert)', () => {
    it('should convert currency in $setOnInsert on upsert insert', async () => {
      const Doc = addPlugin(buildSchema());

      // Use a filter that won't match any document to force an insert
      await Doc.updateOne(
        { price: -999 },
        { $setOnInsert: { price: 10, currency: 'USD' } },
        { upsert: true },
      );
      const doc = await Doc.findOne({ price: 10 }).lean() as AnyDoc;

      expect(doc?.result.amount).to.equal(20);
    });
  });

  // ── nested paths ─────────────────────────────────────────────────────────

  describe('nested paths', () => {
    it('should read from nested sourcePath and write to nested targetPath', async () => {
      const schema = new Schema({
        price: {
          value: Number,
          currency: String,
          date: Date,
        },
        priceConverted: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          {
            sourcePath: 'price.value',
            currencyPath: 'price.currency',
            datePath: 'price.date',
            targetPath: 'priceConverted',
            toCurrency: 'EUR',
          },
        ],
        getRate: async () => 2,
      });
      const Doc = model(uniqueName(), schema);
      const doc = await new Doc({
        price: { value: 100, currency: 'USD', date: new Date('2025-01-01') },
      }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.priceConverted?.amount).to.equal(200);
      expect(saved?.priceConverted?.currency).to.equal('EUR');
    });

    it('should call onError before rollback and document should have reverted fields', async () => {
      const schema = new Schema({
        price: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      let errorCtxField: string | undefined;
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f, to) => {
          if (to === 'GBP') throw new Error('fail GBP');
          return 2;
        },
        rollbackOnError: true,
        onError: (ctx) => { errorCtxField = ctx.field; },
      });
      const Doc = model(uniqueName(), schema);
      const doc = await new Doc({ price: 10, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      // onError called with the failing field
      expect(errorCtxField).to.equal('price');
      // rollback: previously converted result also reverted
      expect(saved?.result).to.be.undefined;
      expect(saved?.result2).to.be.undefined;
    });

    it('should not let two schemas with the plugin interfere with each other', async () => {
      const schemaA = new Schema({ price: Number, currency: String, result: { ...RESULT_FIELD } });
      schemaA.plugin(currencyConversionPlugin, {
        fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
        getRate: async () => 3,
      });

      const schemaB = new Schema({ price: Number, currency: String, result: { ...RESULT_FIELD } });
      schemaB.plugin(currencyConversionPlugin, {
        fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'GBP' }],
        getRate: async () => 5,
      });

      const ModelA = model(uniqueName(), schemaA);
      const ModelB = model(uniqueName(), schemaB);

      const docA = await new ModelA({ price: 10, currency: 'USD' }).save();
      const docB = await new ModelB({ price: 10, currency: 'USD' }).save();
      const savedA = await ModelA.findById(docA._id).lean() as AnyDoc;
      const savedB = await ModelB.findById(docB._id).lean() as AnyDoc;

      // each model uses its own rate and toCurrency
      expect(savedA?.result.amount).to.equal(30);
      expect(savedA?.result.currency).to.equal('EUR');
      expect(savedB?.result.amount).to.equal(50);
      expect(savedB?.result.currency).to.equal('GBP');
    });

    it('should process fields sequentially with concurrency: 1', async () => {
      const callOrder: number[] = [];
      const schema = new Schema({
        price: Number,
        price2: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price2', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async (_f, to) => {
          callOrder.push(to === 'EUR' ? 1 : 2);
          return 2;
        },
        concurrency: 1,
      });
      const Doc = model(uniqueName(), schema);
      await new Doc({ price: 10, price2: 20, currency: 'USD' }).save();

      expect(callOrder).to.deep.equal([1, 2]); // called one at a time, in order
    });

    it('should handle multiple fields in parallel', async () => {
      const schema = new Schema({
        price: Number,
        price2: Number,
        currency: String,
        result: { ...RESULT_FIELD },
        result2: { ...RESULT_FIELD },
      });
      schema.plugin(currencyConversionPlugin, {
        fields: [
          { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
          { sourcePath: 'price2', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
        ],
        getRate: async () => 2,
      });
      const Doc = model(uniqueName(), schema);
      const doc = await new Doc({ price: 10, price2: 20, currency: 'USD' }).save();
      const saved = await Doc.findById(doc._id).lean() as AnyDoc;

      expect(saved?.result?.amount).to.equal(20);
      expect(saved?.result2?.amount).to.equal(40);
    });
  });
});
