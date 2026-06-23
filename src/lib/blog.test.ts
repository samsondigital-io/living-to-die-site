import { describe, it, expect } from 'vitest';
import { normalizeTag, dedupeTags } from './blog';

describe('normalizeTag', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTag('  Book   Updates ')).toBe('book updates');
  });
  it('lowercases', () => {
    expect(normalizeTag('Newsletter')).toBe('newsletter');
  });
});

describe('dedupeTags', () => {
  it('dedupes case- and whitespace-insensitively, keeping first display label', () => {
    expect(dedupeTags(['Book Updates', 'book updates', ' Events '])).toEqual([
      'Book Updates',
      'Events',
    ]);
  });
  it('drops empty tags', () => {
    expect(dedupeTags(['', '  ', 'Events'])).toEqual(['Events']);
  });
});
