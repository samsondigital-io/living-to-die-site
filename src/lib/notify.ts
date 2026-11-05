/**
 * Best-effort admin email notifications (new comments, contact messages).
 * Uses Resend (https://resend.com). If RESEND_API_KEY or ADMIN_EMAILS is not
 * configured, notifications are skipped; the comment or message is still
 * saved and shows up in the admin.
 */

function escapeHtml(s: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => entities[c] ?? c);
}

async function sendAdminEmail(email: { subject: string; html: string; replyTo?: string }): Promise<void> {
  const key = import.meta.env.RESEND_API_KEY;
  const to = (import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

  if (!key || to.length === 0) {
    console.log(`Email notification skipped (RESEND_API_KEY / ADMIN_EMAILS not configured): ${email.subject}`);
    return;
  }

  const from = import.meta.env.RESEND_FROM || 'Living to Die <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: email.subject,
      html: email.html,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

const quote = (text: string) =>
  `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#f6f6f6;border-left:3px solid #d63384;">${escapeHtml(text).replace(/\n/g, '<br>')}</blockquote>`;

export async function notifyNewComment(comment: { name: string; body: string; postSlug: string }): Promise<void> {
  await sendAdminEmail({
    subject: 'New comment awaiting approval — Living to Die',
    html: `
      <p>A new comment is awaiting your approval.</p>
      <p><strong>${escapeHtml(comment.name)}</strong> wrote on <em>${escapeHtml(comment.postSlug)}</em>:</p>
      ${quote(comment.body)}
      <p><a href="https://dianemelton.com/admin/comments" style="color:#d63384;">Review it in the admin &rarr;</a></p>
    `,
  });
}

export async function notifyNewMessage(msg: { name: string; email: string; subject: string; message: string }): Promise<void> {
  await sendAdminEmail({
    subject: `${msg.subject} from ${msg.name} — dianemelton.com`,
    // Replying to the notification goes straight to the sender.
    replyTo: msg.email,
    html: `
      <p><strong>${escapeHtml(msg.name)}</strong> (${escapeHtml(msg.email)}) sent a message through your website:</p>
      <p style="color:#666;">${escapeHtml(msg.subject)}</p>
      ${quote(msg.message)}
      <p>Reply to this email to answer ${escapeHtml(msg.name)} directly, or see all messages
      <a href="https://dianemelton.com/admin/messages" style="color:#d63384;">in the admin</a>.</p>
    `,
  });
}
