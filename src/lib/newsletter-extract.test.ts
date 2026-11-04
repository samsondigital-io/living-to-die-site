import { describe, it, expect } from 'vitest';
import { extractNewsletterArticle } from './newsletter-extract';

// Shaped like a MailerLite builder email: masthead, article, footer sections.
const section = (inner: string) => `<!-- {% if true %} --><table class="ml-default"><tr><td>${inner}</td></tr></table><!-- {% endif %} -->`;

const masthead = section('<h1 style="color:red">Living To Die</h1><h4>A newsletter from Diane Melton</h4>');
const footer = section(
  '<h5>Diane F Melton LLC</h5><p>123 Main St</p><img src="https://assets.mlcdn.com/ml/images/icons/facebook.png" width="18">' +
    '<p>You received this email because you signed up.</p><p><a href="{$unsubscribe}">Unsubscribe</a></p>'
);

function email(article: string) {
  return `<html><head><style>p{color:red}</style></head><body>${masthead}${section(article)}${footer}</body></html>`;
}

const button =
  '<table class="ml-btn-container"><tr><td><table class="ml-btn ml-btn-primary"><tr><td>' +
  '<a href="https://dianemelton.com" style="color:#fff">Pre-order Living To Die</a></td></tr></table></td></tr></table>';

describe('extractNewsletterArticle', () => {
  const html = email(
    '<img src="https://storage.mlcdn.com/account_image/1/hero.jpg" width="540" alt="">' +
      '<h1>To Speak the Truth</h1><h2>The Privilege of a Jury</h2>' +
      '<p style="font-family:Montserrat"><strong>On the season premiere</strong> of a show,\n   something happened.</p>' +
      '<p>Watch <a href="https://www.youtube.com/watch?v=abc" data-link-id="9">this clip</a> and read <a href="https://dianemelton.com/resources">my resources</a>.</p>' +
      '<p><strong></strong></p>' +
      '<p>Warmly,</p><p>Diane</p>' +
      button
  );
  const a = extractNewsletterArticle(html, { subject: 'Subject line', preheader: 'Preheader text' });

  it('uses the first heading as the title and a following heading as the standfirst', () => {
    expect(a.title).toBe('To Speak the Truth');
    expect(a.description).toBe('The Privilege of a Jury');
    expect(a.bodyHtml).not.toContain('To Speak the Truth');
    expect(a.bodyHtml).not.toContain('Privilege of a Jury');
  });

  it('uses the first content image as the hero image and drops MailerLite icons', () => {
    expect(a.heroImage).toBe('https://storage.mlcdn.com/account_image/1/hero.jpg');
    expect(a.bodyHtml).not.toContain('<img');
  });

  it('drops the masthead, footer and builder buttons', () => {
    expect(a.bodyHtml).not.toMatch(/A newsletter from|Diane F Melton LLC|Unsubscribe|You received this email|Pre-order/);
  });

  it('keeps links written into the text, including ones to her own site', () => {
    expect(a.bodyHtml).toContain('<a href="https://www.youtube.com/watch?v=abc" target="_blank" rel="noopener">this clip</a>');
    expect(a.bodyHtml).toContain('<a href="https://dianemelton.com/resources" target="_blank" rel="noopener">my resources</a>');
  });

  it('strips styles and empty paragraphs and collapses whitespace', () => {
    expect(a.bodyHtml).not.toMatch(/style=|data-link-id|<p><\/p>|<strong><\/strong>/);
    expect(a.bodyHtml).toContain('<p><strong>On the season premiere</strong> of a show, something happened.</p>');
    expect(a.bodyHtml).toContain('<p>Warmly,</p>\n<p>Diane</p>');
  });

  it('falls back to the preheader when there is no subtitle, and drops it from the body if repeated', () => {
    const b = extractNewsletterArticle(
      email('<h1>Give Yourself This Gift</h1><p><strong>In support of Awareness Month</strong></p><p>Hi Everyone!</p>'),
      { subject: 'Gift', preheader: 'In Support of Awareness Month' }
    );
    expect(b.description).toBe('In Support of Awareness Month');
    expect(b.bodyHtml).toBe('<p>Hi Everyone!</p>');
  });

  it('summarises the opening when the preheader just repeats the title', () => {
    const c = extractNewsletterArticle(
      email('<h2>Why I Wrote This (and a little about me)</h2><p>Hi everyone!</p><p>Here is the story.</p>'),
      { subject: 'Why I Wrote This', preheader: '(and a little about me)' }
    );
    expect(c.title).toBe('Why I Wrote This (and a little about me)');
    expect(c.description).toBe('Hi everyone! Here is the story.');
  });

  it('falls back to the subject when the article has no heading', () => {
    const d = extractNewsletterArticle(email('<p>Just a note.</p>'), { subject: 'A quick note' });
    expect(d.title).toBe('A quick note');
    expect(d.bodyHtml).toBe('<p>Just a note.</p>');
  });
});
