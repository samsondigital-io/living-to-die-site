import { describe, it, expect } from 'vitest';
import { buildSignupFields, classifySource } from './signup-source';

describe('classifySource', () => {
  const none = { referrer: '', utmSource: '', utmCampaign: '' };

  it('names well-known referrers', () => {
    expect(classifySource({ ...none, referrer: 'google.com' })).toBe('Google');
    expect(classifySource({ ...none, referrer: 'google.co.uk/search' })).toBe('Google');
    expect(classifySource({ ...none, referrer: 'm.facebook.com/story' })).toBe('Facebook');
    expect(classifySource({ ...none, referrer: 't.co/abc' })).toBe('X / Twitter');
    expect(classifySource({ ...none, referrer: 'chatgpt.com' })).toBe('ChatGPT');
  });

  it('falls back to the referring site for anything else', () => {
    expect(classifySource({ ...none, referrer: 'someblog.org/post' })).toBe('someblog.org');
  });

  it('prefers utm tags and appends the campaign', () => {
    expect(classifySource({ referrer: 'google.com', utmSource: 'facebook', utmCampaign: '' })).toBe('Facebook');
    expect(classifySource({ ...none, utmSource: 'bookstore-flyer', utmCampaign: 'spring-event' })).toBe('bookstore-flyer (spring-event)');
    expect(classifySource({ ...none, utmSource: 'newsletter' })).toBe('Newsletter email');
  });

  it('reports direct visits', () => {
    expect(classifySource(none)).toBe('Direct / unknown');
  });
});

describe('buildSignupFields', () => {
  it('maps a full browser context to MailerLite fields', () => {
    expect(
      buildSignupFields({
        form: 'popup',
        referrer: 'https://www.google.com/search?q=private+stuff',
        utm_source: '',
        utm_campaign: '',
        landing: '/blog/to-speak-the-truth?x=1',
      })
    ).toEqual({
      signup_source: 'Google',
      signup_form: 'Pop-up',
      signup_referrer: 'google.com/search', // query string dropped
      signup_landing_page: '/blog/to-speak-the-truth',
    });
  });

  it('treats everything as untrusted', () => {
    const f = buildSignupFields({
      form: 'something-else',
      referrer: 'javascript:alert(1)',
      utm_source: { evil: true },
      landing: '//evil.example/path',
    });
    expect(f).toEqual({ signup_source: 'Direct / unknown', signup_form: '', signup_referrer: '', signup_landing_page: '' });
  });

  it('caps length and strips control characters', () => {
    const f = buildSignupFields({ utm_source: 'a\u0000b'.padEnd(500, 'x') });
    expect(f.signup_source.startsWith('ab')).toBe(true);
    expect(f.signup_source.length).toBeLessThanOrEqual(80);
  });

  it('handles a missing body', () => {
    expect(buildSignupFields(undefined).signup_source).toBe('Direct / unknown');
  });
});
