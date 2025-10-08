import { expect } from 'chai';
import { Schema, model } from 'mongoose';

import type { CurrencyPluginErrorContext, CurrencyPluginOptions, CurrencyRateCache } from '../src/types';
import {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
} from './setup';
import { currencyConversionPlugin } from '../src';

interface ConversionResult {
  amount?: number;
  currency?: string;
  date?: string;
}
interface RollbackDoc {
  price?: number;
  currency?: string;
  result?: ConversionResult;
  result2?: ConversionResult;
  [key: string]: ConversionResult | number | string | undefined;
}

class MockCache implements CurrencyRateCache<number> {
  private store = new Map<string, number>();
  async get(key: string): Promise<number | undefined> {
    return this.store.get(key);
  }
  async set(key: string, value: number): Promise<void> {
    this.store.set(key, value);
  }
}

describe('currencyConversionPlugin', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it('should throw if fields is missing', () => {
    const schema = {} as Schema;

    expect(() => currencyConversionPlugin(schema, {
      getRate: () => 1, fields: undefined
    } as unknown as CurrencyPluginOptions)).to.throw('option "fields" must be a non-empty array');
  });

  it('should throw if fields is not an array', () => {
    const schema = {} as Schema;
    expect(() => currencyConversionPlugin(schema, { fields: 'not-an-array', getRate: () => 1 } as unknown as CurrencyPluginOptions)).to.throw('option "fields" must be a non-empty array');
  });

  it('should throw if fields is an empty array', () => {
    const schema = {} as Schema;
    expect(() => currencyConversionPlugin(schema, { fields: [], getRate: () => 1 } as unknown as CurrencyPluginOptions)).to.throw('option "fields" must be a non-empty array');
  });

  it('should throw if getRate is not a function', () => {
    const schema = {} as Schema;
    expect(() => currencyConversionPlugin(schema, { fields: [{}], getRate: 123 } as unknown as CurrencyPluginOptions)).to.throw('option "getRate" must be a function');
  });

  it('should catch error thrown by getRate', async () => {
    const getRate = async () => { throw new Error('rate error'); };
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate,
    });
    const Model = model('CatchError', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save(); // Should not throw

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result).to.be.undefined;
  });

  it('should call onError callback if conversion fails', async () => {
    let errorCalled = false;
    const getRate = async () => { throw new Error('rate error'); };
  const onError = (ctx: CurrencyPluginErrorContext) => {
      errorCalled = true;
      expect(ctx).to.have.property('field', 'price');
      expect(ctx).to.have.property('fromCurrency', 'USD');
      expect(ctx).to.have.property('toCurrency', 'EUR');
      expect(ctx).to.have.property('error');
    };
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate,
      onError,
    });
    const Model = model('CatchErrorOnError', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save();

    expect(errorCalled).to.be.true;
  });

  it('should convert a simple field correctly', async () => {
    const getRate = async () => 0.85; // USD → EUR

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
      }
    });

    const options: CurrencyPluginOptions = {
      fields: [
        {
          sourcePath: 'price.amount',
          currencyPath: 'price.currency',
          datePath: 'price.date',
          targetPath: 'priceConversion',
          toCurrency: 'EUR',
        },
      ],
      getRate,
    };

    ProductSchema.plugin(currencyConversionPlugin, options);
    const Product = model('Product', ProductSchema);

    const product = new Product({
      price: { amount: 100, currency: 'USD', date: new Date('2025-10-01') },
    });
    await product.save();

    const saved = await Product.findById(product._id).lean();
    expect(saved?.priceConversion).to.have.property('amount', 85);
    expect(saved?.priceConversion).to.have.property('currency', 'EUR');
    expect(saved?.priceConversion?.date).to.not.be.undefined;
    expect(saved?.priceConversion?.date).to.not.be.undefined;
    if (saved?.priceConversion?.date) {
      expect(new Date(saved.priceConversion.date).toISOString()).to.equal(
        new Date('2025-10-01').toISOString()
      );
    }
  });

  it('should handle nested paths correctly', async () => {
    const getRate = async () => 2; // fake multiplier

    const TestSchema = new Schema({
      meta: {
        data: {
          value: Number,
          currency: String,
        },
      },
      conversion: Object,
    });

    TestSchema.plugin(currencyConversionPlugin, {
      fields: [
        {
          sourcePath: 'meta.data.value',
          currencyPath: 'meta.data.currency',
          targetPath: 'conversion',
          toCurrency: 'EUR',
        },
      ],
      getRate,
    });

    const TestModel = model('Nested', TestSchema);
    const doc = new TestModel({
      meta: { data: { value: 50, currency: 'USD' } },
    });
    await doc.save();

    const saved = await TestModel.findById(doc._id).lean();
    expect(saved?.conversion.amount).to.equal(100);
    expect(saved?.conversion.currency).to.equal('EUR');
    expect(saved?.conversion.date).to.be.a('date');
  });

  it('should skip conversion if amount or currency are missing', async () => {
    const getRate = async () => 2;

    const TestSchema = new Schema({
      price: { amount: Number, currency: String },
      conversion: Object,
    });

    TestSchema.plugin(currencyConversionPlugin, {
      fields: [
        {
          sourcePath: 'price.amount',
          currencyPath: 'price.currency',
          targetPath: 'conversion',
          toCurrency: 'EUR',
        },
      ],
      getRate,
    });

    const TestModel = model('Incomplete', TestSchema);

    // Missing currency
    const doc1 = new TestModel({ price: { amount: 100 } });
    await doc1.save();
    const saved1 = await TestModel.findById(doc1._id).lean();
    expect(saved1).to.not.have.property('conversion');

    // Missing amount
    const doc2 = new TestModel({ price: { currency: 'USD' } });
    await doc2.save();
    const saved2 = await TestModel.findById(doc2._id).lean();
    expect(saved2).to.not.have.property('conversion');
  });

  it('should use current date if datePath is not defined', async () => {
    const getRate = async () => 1.5;

    const TestSchema = new Schema({
      value: { amount: Number, currency: String },
      result: Object,
    });

    TestSchema.plugin(currencyConversionPlugin, {
      fields: [
        {
          sourcePath: 'value.amount',
          currencyPath: 'value.currency',
          targetPath: 'result',
          toCurrency: 'EUR',
        },
      ],
      getRate,
    });

    const TestModel = model('DefaultDate', TestSchema);

    const now = new Date();
    const doc = new TestModel({ value: { amount: 10, currency: 'USD' } });
    await doc.save();

    const saved = await TestModel.findById(doc._id).lean();
    expect(saved?.result.amount).to.equal(15);
    expect(saved?.result.currency).to.equal('EUR');
    const savedDate = new Date(saved?.result.date);
    expect(savedDate.getTime()).to.be.closeTo(now.getTime(), 5000); // ±5s
  });

  it('should skip conversion if getRate returns invalid value', async () => {
    const getRate = async () => NaN;

    const TestSchema = new Schema({
      price: { amount: Number, currency: String },
      conv: Object,
    });

    TestSchema.plugin(currencyConversionPlugin, {
      fields: [
        {
          sourcePath: 'price.amount',
          currencyPath: 'price.currency',
          targetPath: 'conv',
          toCurrency: 'EUR',
        },
      ],
      getRate,
    });

    const TestModel = model('InvalidRate', TestSchema);

    const doc = new TestModel({ price: { amount: 100, currency: 'USD' } });
    await doc.save();

    const saved = await TestModel.findById(doc._id).lean();
    expect(saved).to.not.have.property('conv');
  });

  it('should use fallbackRate if getRate returns NaN', async () => {
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => NaN,
      fallbackRate: 2,
    });
    const Model = model('FallbackRate', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save();

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result.amount).to.equal(20);
    expect(saved?.result.currency).to.equal('EUR');
  });

  it('should call onError callback on conversion error', async () => {
    let errorCalled = false;
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => { throw new Error('rate error'); },
      onError: (ctx) => {
        errorCalled = true;
        expect(ctx.error).to.be.instanceOf(Error);
        expect(ctx.field).to.equal('price');
      },
    });
    const Model = model('OnError', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save();

    expect(errorCalled).to.be.true;
  });

  it('should rollback on error if rollbackOnError is true', async () => {
    const schema = new Schema({
      price: Number,
      currency: String,
      result: Object,
      result2: Object,
    });
    schema.plugin(currencyConversionPlugin, {
      fields: [
        { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' },
        { sourcePath: 'price', currencyPath: 'currency', targetPath: 'result2', toCurrency: 'GBP' },
      ],
      getRate: async (_from, to) => {
        if (to === 'GBP') throw new Error('fail GBP');
        return 2;
      },
      rollbackOnError: true,
    });
    const Model = model('RollbackError', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save();

    const saved = await Model.findById(doc._id).lean() as RollbackDoc | null;
    expect(saved?.result).to.be.undefined;
    expect(saved?.result2).to.be.undefined;
  });

  it('should use cache if provided', async () => {
    const cache = new MockCache();
    let rateCalls = 0;
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => { rateCalls++; return 3; },
      cache,
    });
    const Model = model('CacheTest', schema);

    const doc1 = new Model({ price: 10, currency: 'USD' });
    await doc1.save();

    const doc2 = new Model({ price: 20, currency: 'USD' });
    await doc2.save();

    expect(rateCalls).to.equal(1); // Second call uses cache
  });

  it('should transform date with dateTransform', async () => {
    const schema = new Schema({
      price: Number,
      currency: String,
      result: Object,
      date: String
    });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', datePath: 'date', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async (_from, _to, date) => {
        expect(date?.getUTCFullYear()).to.equal(2000);
        return 1;
      },
      dateTransform: (_date) => new Date(Date.UTC(2000, 0, 1)),
    });
    const Model = model('DateTransform', schema);

    const doc = new Model({ price: 10, currency: 'USD', date: '2025-10-06' });
    await doc.save();

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result.date).to.exist;
  });

  it('should skip conversion and warn for invalid source currency', async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    const schema = new Schema({
      price: Number,
      currency: String,
      result: Object
    });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => 1,
      allowedCurrencyCodes: ['EUR'], // USD not allowed
    });
    const Model = model('InvalidSource', schema);

    const doc = new Model({ price: 10, currency: 'USD' });
    await doc.save();

    expect(warnings.some(w => w.includes('Invalid source currency code'))).to.be.true;

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result).to.be.undefined;
    console.warn = origWarn;
  });

  it('should skip conversion and warn for invalid target currency', async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    const schema = new Schema({
      price: Number,
      currency: String,
      result: Object,
    });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'USD' }],
      getRate: async () => 1,
      allowedCurrencyCodes: ['EUR'], // USD not allowed
    });
    const Model = model('InvalidTarget', schema);

    const doc = new Model({ price: 10, currency: 'EUR' });
    await doc.save();

    expect(warnings.some(w => w.includes('Invalid target currency code'))).to.be.true;

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result).to.be.undefined;
    console.warn = origWarn;
  });

  it('should use cache if available and set cache on miss', async () => {
    let getCalled = 0, setCalled = 0;
    class TestCache implements CurrencyRateCache<number> {
      private store = new Map<string, number>();
      async get(key: string) { getCalled++; void key; return undefined; }
      async set(key: string, value: number) { setCalled++; this.store.set(key, value); }
    }
    const cache = new TestCache();
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => 2,
      cache,
    });
    const Model = model('CacheSet', schema);

    const doc = new Model({ price: 5, currency: 'EUR' });
    await doc.save();

    expect(getCalled).to.equal(1);
    expect(setCalled).to.equal(1);

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result.amount).to.equal(10);
  });

  it('should use cache hit and not call getRate', async () => {
    let getRateCalled = 0;
    class HitCache implements CurrencyRateCache<number> {
      async get(_key: string) { return 3; }
      async set(_key: string, _value: number) { }
    }
    const cache = new HitCache();
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => { getRateCalled++; return 2; },
      cache,
    });
    const Model = model('CacheHit', schema);

    const doc = new Model({ price: 7, currency: 'EUR' });
    await doc.save();

    expect(getRateCalled).to.equal(0);

    const saved = await Model.findById(doc._id).lean();
    expect(saved?.result.amount).to.equal(21);
  });

  it('should log error if onError is not provided', async () => {
    let errorLogged = '';
    const origError = console.error;
    console.error = (msg: string) => { errorLogged += msg; };
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate: async () => { throw new Error('fail'); },
    });
    const Model = model('LogError', schema);

    const doc = new Model({ price: 1, currency: 'EUR' });
    await doc.save();

    expect(errorLogged).to.include('Error converting');
    console.error = origError;
  });

  it('should convert on updateOne and findOneAndUpdate', async () => {
    const getRate = async () => 2;
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate,
    });
    const Model = model('UpdateTest', schema);

    const doc = new Model({ price: 5, currency: 'EUR' });
    await doc.save();

    await Model.updateOne({ _id: doc._id }, { $set: { price: 10, currency: 'EUR' } });
    const updated = await Model.findById(doc._id).lean();
    expect(updated?.result.amount).to.equal(20);

    await Model.findOneAndUpdate({ _id: doc._id }, { $set: { price: 15, currency: 'EUR' } });
    const updated2 = await Model.findById(doc._id).lean();
    expect(updated2?.result.amount).to.equal(30);
  });

  it('should convert on updateOne without $set', async () => {
    const getRate = async () => 2;
    const schema = new Schema({ price: Number, currency: String, result: Object });
    schema.plugin(currencyConversionPlugin, {
      fields: [{ sourcePath: 'price', currencyPath: 'currency', targetPath: 'result', toCurrency: 'EUR' }],
      getRate,
    });
    const Model = model('UpdateNoSetTest', schema);

    const doc = new Model({ price: 5, currency: 'EUR' });
    await doc.save();

    await Model.updateOne({ _id: doc._id }, { price: 10, currency: 'EUR' });
    const updated = await Model.findById(doc._id).lean();
    expect(updated?.result.amount).to.equal(20);
  });
});
