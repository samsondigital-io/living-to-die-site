/**
 * Where a newsletter subscriber came from.
 *
 * The browser remembers how a visitor arrived (see attribution-client.ts) and
 * sends it along with the signup; this module cleans that untrusted input and
 * turns it into the custom fields stored on the MailerLite subscriber.
 *
 * Pure (no I/O) so it can be unit-tested.
 */

/** MailerLite custom field keys (created once in the MailerLite account). */
export const SIGNUP_FIELDS = {
  source: 'signup_source',
  form: 'signup_form',
  referrer: 'signup_referrer',
  landing: 'signup_landing_page',
} as const;

export interface SignupFields {
  signup_source: string;
  signup_form: string;
  signup_referrer: string;
  signup_landing_page: string;
}

const FORMS: Record<string, string> = {
  homepage: 'Homepage',
  popup: 'Pop-up',
  footer: 'Footer',
  resources: 'Resources page',
};

/** Known sites, matched against a referrer's hostname or a utm_source value. */
const KNOWN: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$|^google$/, 'Google'],
  [/(^|\.)bing\.com$|^bing$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$|^duckduckgo$/, 'DuckDuckGo'],
  [/(^|\.)yahoo\.[a-z.]+$|^yahoo$/, 'Yahoo'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^(facebook|fb)$/, 'Facebook'],
  [/(^|\.)instagram\.com$|^(instagram|ig)$/, 'Instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^linkedin$/, 'LinkedIn'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$|^(twitter|x)$/, 'X / Twitter'],
  [/(^|\.)pinterest\.[a-z.]+$|^pinterest$/, 'Pinterest'],
  [/(^|\.)goodreads\.com$|^goodreads$/, 'Goodreads'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|^chatgpt$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$|^perplexity$/, 'Perplexity'],
  [/mailerlite|mlsend|^(newsletter|email)$/, 'Newsletter email'],
];

/** Trim, drop control characters, and cap length. Non-strings become ''. */
function clean(value: unknown, max = 200): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

/** An http(s) URL reduced to host + path (no query string, which can carry personal data). */
function cleanUrl(value: unknown): string {
  const raw = clean(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 200);
  } catch {
    return '';
  }
}

/** A site-relative path such as "/blog/to-speak-the-truth". */
function cleanPath(value: unknown): string {
  const raw = clean(value);
  return raw.startsWith('/') && !raw.startsWith('//') ? raw.split(/[?#]/)[0] : '';
}

function known(value: string): string | null {
  const v = value.toLowerCase();
  for (const [re, label] of KNOWN) if (re.test(v)) return label;
  return null;
}

/** A readable "where they came from" label. */
export function classifySource(input: { referrer: string; utmSource: string; utmCampaign: string }): string {
  let label: string;
  if (input.utmSource) {
    label = known(input.utmSource) ?? input.utmSource;
  } else if (input.referrer) {
    const host = input.referrer.split('/')[0];
    label = known(host) ?? host;
  } else {
    label = 'Direct / unknown';
  }
  return input.utmCampaign ? `${label} (${input.utmCampaign})` : label;
}

/**
 * Turn the raw signup context sent by the browser into MailerLite fields.
 * Every value is untrusted: unknown forms, bad URLs and odd types are dropped.
 */
export function buildSignupFields(raw: unknown): SignupFields {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const referrer = cleanUrl(r.referrer);
  const utmSource = clean(r.utm_source, 80);
  const utmCampaign = clean(r.utm_campaign, 80);
  const form = clean(r.form, 40);
  return {
    signup_source: classifySource({ referrer, utmSource, utmCampaign }),
    signup_form: FORMS[form] ?? '',
    signup_referrer: referrer,
    signup_landing_page: cleanPath(r.landing),
  };
}
