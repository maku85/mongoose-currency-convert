import { describe, it, expect, vi } from 'vitest';
import { SimpleCache } from '../src/utils/cache';

describe('SimpleCache', () => {
  it('should set custom ttl from constructor', async () => {
    const cache = new SimpleCache<number>(0.001);
    cache.set('x', 99);

    await new Promise<void>(resolve => setTimeout(resolve, 70));
    expect(cache.get('x')).toBeUndefined();
  });

  it('should set and get a value', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 123);

    expect(cache.get('a')).to.equal(123);
  });

  it('should return undefined for missing key', () => {
    const cache = new SimpleCache<number>(1);

    expect(cache.get('missing')).toBeUndefined();
  });

  it('should expire values after ttl', async () => {
    const cache = new SimpleCache<number>(0.00001);
    cache.set('a', 42);

    await new Promise<void>(resolve => setTimeout(resolve, 5));
    expect(cache.get('a')).toBeUndefined();
  });

  it('should lazily evict an expired entry on get (before sweep fires)', () => {
    vi.useFakeTimers();
    const cache = new SimpleCache<number>(1);
    cache.set('a', 42);

    // Advance system clock past TTL without triggering the sweep interval
    vi.setSystemTime(Date.now() + 61_000);

    expect(cache.get('a')).toBeUndefined();
    vi.useRealTimers();
  });

  it('should delete a key', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 1);
    cache.delete('a');

    expect(cache.get('a')).toBeUndefined();
  });

  it('should clear all keys', () => {
    const cache = new SimpleCache<number>(1);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
