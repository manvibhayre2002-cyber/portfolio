// "Work with me" chat → email to Manvi.
//   POST /api/chat  { name, contact, text, hp }
// Sends the message through Resend (https://resend.com) using RESEND_API_KEY, set in the
// Vercel project's environment variables. If the visitor left an email, it becomes the
// Reply-To, so replying in Gmail goes straight to them. Nothing is stored on the site.
const TO = process.env.CONTACT_TO || 'mbdesignstudio02@gmail.com';
const FROM = process.env.CONTACT_FROM || 'Portfolio chat <onboarding@resend.dev>';

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v) => v.replace(/\D/g, '').length >= 7 && /^[+\d\s().-]+$/.test(v);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// light, per-instance rate limit: 8 messages / 10 min per network (kept in memory only, never stored)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 8;
}

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, { error: 'method' }); }
  if (!process.env.RESEND_API_KEY) return reply(res, 503, { error: 'email not set up' });

  const b = req.body || {};
  if (b.hp) return reply(res, 200, { ok: true });                      // hidden field filled = bot
  const name = String(b.name || '').trim().slice(0, 80);
  const contact = String(b.contact || '').trim().slice(0, 120);
  const text = String(b.text || '').trim().slice(0, 1500);
  if (name.length < 2 || !text || !(isEmail(contact) || isPhone(contact))) return reply(res, 400, { error: 'missing details' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return reply(res, 429, { error: 'slow down' });

  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const email = isEmail(contact) ? contact : null;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#212121;line-height:1.5">
    <p style="margin:0 0 4px"><b>${esc(name)}</b></p>
    <p style="margin:0 0 16px;color:#666">${email ? 'Email' : 'Phone'}: ${esc(contact)} · ${esc(when)}</p>
    <div style="padding:14px 16px;background:#f3f3f1;border-left:3px solid #e24000;white-space:pre-wrap">${esc(text)}</div>
    <p style="margin:16px 0 0;color:#999;font-size:12px">Sent from the "Work with me" chat on manvibhayre.com${email ? ' — just hit Reply to answer them.' : '.'}</p>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `New message from ${name}`,
        ...(email ? { reply_to: email } : {}),
        text: `${name}\n${email ? 'Email' : 'Phone'}: ${contact}\n${when}\n\n${text}`,
        html,
      }),
    });
    if (!r.ok) return reply(res, 502, { error: 'email failed' });
    return reply(res, 200, { ok: true });
  } catch (e) {
    return reply(res, 502, { error: 'email failed' });
  }
};
