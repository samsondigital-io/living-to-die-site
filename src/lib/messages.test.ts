import { describe, it, expect } from 'vitest';
import { validateMessage } from './messages';

const good = { name: 'Jane Reader', email: 'jane@example.com', subject: 'bookclub', message: 'Would you visit our club?' };

describe('validateMessage', () => {
  it('accepts a normal message and labels the subject', () => {
    expect(validateMessage(good)).toEqual({
      ok: true,
      value: { name: 'Jane Reader', email: 'jane@example.com', subject: 'Book club visit', message: 'Would you visit our club?' },
    });
  });

  it('requires a name, a valid email and a message', () => {
    expect(validateMessage({ ...good, name: '  ' })).toMatchObject({ ok: false });
    expect(validateMessage({ ...good, email: 'not-an-email' })).toMatchObject({ ok: false });
    expect(validateMessage({ ...good, message: '' })).toMatchObject({ ok: false });
    expect(validateMessage(undefined)).toMatchObject({ ok: false });
  });

  it('rejects overly long messages', () => {
    expect(validateMessage({ ...good, message: 'x'.repeat(5001) })).toMatchObject({ ok: false });
    expect(validateMessage({ ...good, message: 'x'.repeat(5000) })).toMatchObject({ ok: true });
  });

  it('strips tags and control characters but keeps line breaks and links', () => {
    const r = validateMessage({
      ...good,
      name: '<b>Jane</b>\u0000',
      message: 'Hello<script>x</script>\nSee https://example.com',
    });
    expect(r).toMatchObject({ ok: true, value: { name: 'Jane', message: 'Hellox\nSee https://example.com' } });
  });

  it('falls back to a general subject for unknown values', () => {
    expect(validateMessage({ ...good, subject: 'whatever' })).toMatchObject({ value: { subject: 'General message' } });
    expect(validateMessage({ ...good, subject: { evil: true } })).toMatchObject({ value: { subject: 'General message' } });
  });
});
