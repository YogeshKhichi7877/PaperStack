const REVIEW_PATHS = Object.freeze({ paper: '/admin/contributions', resource: '/admin/moderation', solution: '/admin/question-solutions' });

async function notifyAdminUpload({ kind, title, contributor }) {
  const topic = String(process.env.NTFY_TOPIC || '').trim();
  if (!topic || (process.env.NOTIFICATION_PROVIDER && process.env.NOTIFICATION_PROVIDER !== 'ntfy')) return false;
  const server = String(process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, '');
  if (!/^https:\/\//.test(server)) throw new Error('NTFY_SERVER must use HTTPS');
  const reviewUrl = `${String(process.env.FRONTEND_URL || 'https://paper-stack-beryl.vercel.app').replace(/\/$/, '')}${REVIEW_PATHS[kind] || '/admin/contributions'}`;
  const plain = (value) => String(value || '').replace(/[\r\n\u0000-\u001f]/g, ' ').trim().slice(0, 120);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${server}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: { Title: `PaperStack ${kind} upload`, Priority: 'high', Click: reviewUrl, 'Content-Type': 'text/plain; charset=utf-8', ...(process.env.NTFY_TOKEN ? { Authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}) },
      body: `${plain(contributor)} submitted ${plain(kind)}: ${plain(title)}\nReview: ${reviewUrl}`,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Notification provider returned ${response.status}`);
    return true;
  } finally { clearTimeout(timeout); }
}

module.exports = { notifyAdminUpload };
