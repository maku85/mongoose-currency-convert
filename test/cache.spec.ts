import { expect } from 'chai';

import { SimpleCache } from '../src/utils/cache';

describe('SimpleCache', () => {
  it('should set custom ttl from constructor', (done) => {
    const cache = new SimpleCache<number>(0.001);
    cache.set('x', 99);

    setTimeout(() => {
      expect(cache.get('x')).to.be.undefined;
      done();
    }, 70);
  });
  
  it('should set and get a value', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 123);

    expect(cache.get('a')).to.equal(123);
  });

  it('should return undefined for missing key', () => {
    const cache = new SimpleCache<number>(1);

    expect(cache.get('missing')).to.be.undefined;
  });

  it('should expire values after ttl', (done) => {
    const cache = new SimpleCache<number>(0.00001);
    cache.set('a', 42);

    setTimeout(() => {
      expect(cache.get('a')).to.be.undefined;
      done();
    }, 5);
  });

  it('should delete a key', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 1);
    cache.delete('a');

    expect(cache.get('a')).to.be.undefined;
  });

  it('should clear all keys', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.get('a')).to.be.undefined;
    expect(cache.get('b')).to.be.undefined;
  });
});
