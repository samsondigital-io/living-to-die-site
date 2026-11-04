import { describe, it, expect } from 'vitest';
import {
  normalizeTag,
  dedupeTags,
  sortPostsByDateDesc,
  aggregateTags,
  slugify,
  htmlToText,
  excerptText,
  isOpeningSummary,
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
    excerpt: '',
    subtitle: '',
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

describe('slugify', () => {
  it('lowercases, hyphenates, strips punctuation', () => {
    expect(slugify('A Reflection on Mortality!')).toBe('a-reflection-on-mortality');
  });
});

describe('htmlToText', () => {
  it('strips tags, decodes entities, and keeps words apart across blocks', () => {
    expect(htmlToText('<p><strong>On the</strong> show &amp; more</p><p>Next&nbsp;one&#8217;s</p>')).toBe('On the show & more Next one\u2019s');
  });
});

describe('excerptText', () => {
  it('leaves short text alone', () => {
    expect(excerptText('Short text.', 50)).toBe('Short text.');
  });
  it('cuts at a word boundary and adds an ellipsis', () => {
    expect(excerptText('The quick brown fox jumps over the lazy dog, again and again', 30)).toBe('The quick brown fox jumps over\u2026');
  });
  it('drops trailing punctuation before the ellipsis', () => {
    expect(excerptText('Hello there, friend of mine', 13)).toBe('Hello there\u2026');
  });
});

describe('isOpeningSummary', () => {
  const body = 'Hi everyone, and welcome to my first newsletter! Did you know that books are published daily.';
  it('detects a summary that is just the opening (even truncated)', () => {
    expect(isOpeningSummary('Hi everyone, and welcome to my first newsletter! Did you know\u2026', body)).toBe(true);
  });
  it('treats a different line as a real subtitle', () => {
    expect(isOpeningSummary('The Privilege of a Jury', body)).toBe(false);
    expect(isOpeningSummary('', body)).toBe(false);
  });
});
