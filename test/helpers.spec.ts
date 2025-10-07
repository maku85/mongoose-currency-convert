import { expect } from 'chai';

import {
  getNestedValue,
  getPathArray,
  isValidCurrencyCode,
  setNestedValue,
  defaultRound
} from '../src/utils/helpers';

describe('helpers', () => {
  describe('#getPathArray', () => {
    it('should split path and cache result', () => {
      const path = 'a.b.c';

      const arr1 = getPathArray(path);
      expect(arr1).to.deep.equal(['a', 'b', 'c']);

      // Should be cached
      const arr2 = getPathArray(path);
      expect(arr2).to.deep.equal(arr1); // Same reference from cache
    });

    it('should handle empty string', () => {
      expect(getPathArray('')).to.deep.equal(['']);
    });
  });

  describe('#getNestedValue', () => {
    it('should get a nested value from an object', () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).to.equal(42);
    });

    it('should return undefined for missing path', () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.x')).to.be.undefined;
    });

    it('should work with root key', () => {
      expect(getNestedValue({ a: 1 }, 'a')).to.equal(1);
    });

    it('should return undefined for non-object', () => {
      expect(getNestedValue(42 as unknown as object, 'a')).to.be.undefined;
    });

    it('should return undefined for null object', () => {
      expect(getNestedValue(null, 'a.b')).to.be.undefined;
    });

    it('should return undefined for undefined object', () => {
      expect(getNestedValue(undefined, 'a.b')).to.be.undefined;
    });

    it('should return undefined for empty path', () => {
      expect(getNestedValue({ a: 1 }, '')).to.be.undefined;
    });

    it('should work with array path', () => {
      const obj = { a: { b: { c: 42 } } };

      expect(getNestedValue(obj, ['a', 'b', 'c'])).to.equal(42);
    });
  });

  describe('#setNestedValue', () => {
    it('should do nothing if path is empty', () => {
      const obj: Record<string, unknown> = {};

      setNestedValue(obj, '', 123);

      expect(obj).to.deep.equal({});
    });

    it('should do nothing if path is only dots', () => {
      const obj: Record<string, unknown> = {};

      setNestedValue(obj, '.', 123);

      expect(obj).to.deep.equal({});
    });

    it('should set a nested value in an object', () => {
      const obj: Record<string, unknown> = {};

      setNestedValue(obj, 'a.b.c', 99);

      expect(obj).to.deep.equal({ a: { b: { c: 99 } } });
    });

    it('should set a root value', () => {
      const obj: Record<string, unknown> = {};

      setNestedValue(obj, 'x', 5);

      expect(obj).to.deep.equal({ x: 5 });
    });

    it('should overwrite existing value', () => {
      const obj: Record<string, unknown> = { a: { b: { c: 1 } } };

      setNestedValue(obj, 'a.b.c', 2);

      expect(obj).to.deep.equal({ a: { b: { c: 2 } } });
    });
  });

  describe('#defaultRound', () => {
    it('should round to two decimals', () => {
      expect(defaultRound(1.234)).to.equal(1.23);
      expect(defaultRound(1.235)).to.equal(1.24);
    });

    it('should handle negative numbers', () => {
      expect(defaultRound(-2.567)).to.equal(-2.57);
    });

    it('should handle integers', () => {
      expect(defaultRound(5)).to.equal(5);
    });
  });

  describe('#isValidCurrencyCode', () => {
    it('should validate ISO 4217 codes', () => {
      expect(isValidCurrencyCode('USD')).to.be.true;
      expect(isValidCurrencyCode('eur')).to.be.true;
      expect(isValidCurrencyCode('XXX')).to.be.true;
      expect(isValidCurrencyCode('FAKE')).to.be.false;
      expect(isValidCurrencyCode('usd')).to.be.true;
      expect(isValidCurrencyCode('fake')).to.be.false;
    });

    it('should validate against allowedCodes', () => {
      expect(isValidCurrencyCode('USD', ['USD', 'EUR'])).to.be.true;
      expect(isValidCurrencyCode('EUR', ['USD', 'EUR'])).to.be.true;
      expect(isValidCurrencyCode('GBP', ['USD', 'EUR'])).to.be.false;
      expect(isValidCurrencyCode('USD', [])).to.be.false;
      expect(isValidCurrencyCode('FAKE', ['USD', 'EUR'])).to.be.false;
    });

    it('should return false for non-string input', () => {
      expect(isValidCurrencyCode(undefined as unknown as string)).to.be.false;
      expect(isValidCurrencyCode(null as unknown as string)).to.be.false;
      expect(isValidCurrencyCode(123 as unknown as string)).to.be.false;
      expect(isValidCurrencyCode(false as unknown as string)).to.be.false;
      expect(isValidCurrencyCode([] as unknown as string)).to.be.false;
      expect(isValidCurrencyCode({} as unknown as string)).to.be.false;
    });
  });
});
