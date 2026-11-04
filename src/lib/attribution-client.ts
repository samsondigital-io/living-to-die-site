/**
 * Browser-side: remember how a visitor arrived, so a later newsletter signup
 * can say where they came from (Google, Facebook, a tagged link…).
 *
 * The referrer is only visible on the first page of a visit, so we note it on
 * arrival and keep it for 30 days. A later visit from somewhere new (another
 * site or a tagged link) replaces it; browsing between our own pages and
 * coming back directly don't. Storage failures (private mode etc.) are ignored.
 */

const KEY = 'ltd_signup_origin';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface Origin {
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  landing: string;
  at: number;
}

function read(): Origin | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return value && typeof value.at === 'number' ? (value as Origin) : null;
  } catch {
    return null;
  }
}

/** Call on every page load. */
export function rememberVisitOrigin(): void {
  try {
    const params = new URLSearchParams(location.search);
    let referrer = '';
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.host !== location.host) referrer = `${ref.origin}${ref.pathname}`;
    }
    const visit: Origin = {
      referrer,
      utm_source: params.get('utm_source') ?? '',
      utm_medium: params.get('utm_medium') ?? '',
      utm_campaign: params.get('utm_campaign') ?? '',
      landing: location.pathname,
      at: Date.now(),
    };
    const existing = read();
    const isNewSource = Boolean(visit.referrer || visit.utm_source);
    const expired = !existing || Date.now() - existing.at > MAX_AGE_MS;
    if (expired || isNewSource) localStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    // Attribution is best-effort; never break the page.
  }
}

/** What to send with a signup from the given form ('homepage', 'popup', 'footer', 'resources'). */
export function signupContext(form: string): Record<string, string> {
  const origin = read();
  return {
    form,
    referrer: origin?.referrer ?? '',
    utm_source: origin?.utm_source ?? '',
    utm_medium: origin?.utm_medium ?? '',
    utm_campaign: origin?.utm_campaign ?? '',
    landing: origin?.landing ?? location.pathname,
  };
}
