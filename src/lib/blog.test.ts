import { describe, it, expect } from 'vitest';
import {
  normalizeTag,
  dedupeTags,
  sortPostsByDateDesc,
  aggregateTags,
  type BlogPost,
} from './blog';

function post(partial: Partial<BlogPost>): BlogPost {
  return {
    slug: 's',
    title: 't',
    description: 'd',
    pubDate: new Date('2026-01-01'),
    tags: [],
    author: 'Diane Melton',
    featured: false,
    source: 'repo',
    bodyHtml: '',
    ...partial,
  };
}

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

describe('sortPostsByDateDesc', () => {
  it('sorts newest first', () => {
    const a = post({ slug: 'old', pubDate: new Date('2026-01-01') });
    const b = post({ slug: 'new', pubDate: new Date('2026-06-01') });
    expect(sortPostsByDateDesc([a, b]).map((p) => p.slug)).toEqual(['new', 'old']);
  });
});

describe('aggregateTags', () => {
  it('counts tags case-insensitively with display label + count', () => {
    const posts = [
      post({ tags: ['Newsletter', 'Events'] }),
      post({ tags: ['newsletter'] }),
    ];
    const tags = aggregateTags(posts);
    const newsletter = tags.find((t) => t.key === 'newsletter');
    expect(newsletter?.count).toBe(2);
    expect(newsletter?.label).toBe('Newsletter');
    expect(tags.find((t) => t.key === 'events')?.count).toBe(1);
  });
});
