/**
 * Best-effort admin email notifications (e.g., new comments).
 * Uses Resend (https://resend.com). If RESEND_API_KEY is not configured,
 * notifications are silently skipped so the comment flow is never blocked.
 */

function escapeHtml(s: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => entities[c] ?? c);
}

export async function notifyNewComment(comment: { name: string; body: string; postSlug: string }): Promise<void> {
  const key = import.meta.env.RESEND_API_KEY;
  const to = (import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

  if (!key || to.length === 0) {
    console.log('Comment email notification skipped (RESEND_API_KEY / ADMIN_EMAILS not configured).');
    return;
  }

  const from = import.meta.env.RESEND_FROM || 'Living to Die <onboarding@resend.dev>';
  const html = `
    <p>A new comment is awaiting your approval.</p>
    <p><strong>${escapeHtml(comment.name)}</strong> wrote on <em>${escapeHtml(comment.postSlug)}</em>:</p>
    <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f6f6f6;border-left:3px solid #d63384;">${escapeHtml(comment.body).replace(/\n/g, '<br>')}</blockquote>
    <p><a href="https://dianemelton.com/admin/comments" style="color:#d63384;">Review it in the admin &rarr;</a></p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: 'New comment awaiting approval — Living to Die',
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
