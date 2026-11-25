// Visitor side of the "Work with me" chat.
//   POST /api/chat  { cid, text, hp }  -> saves the message for Manvi
//   GET  /api/chat?cid=...              -> this visitor's own thread (with Manvi's replies)
// Each visitor only ever reads their own conversation; the id is random and lives in their browser.
const crypto = require('crypto');
const { configured, pipeline, CID, MAX_THREAD, clean, parse, send } = require('./_store');

module.exports = async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'not set up' });
  const cid = String((req.method === 'GET' ? req.query.cid : req.body && req.body.cid) || '');
  if (!CID.test(cid)) return send(res, 400, { error: 'bad id' });
  const key = `chat:${cid}`;

  try {
    if (req.method === 'GET') {
      const [list] = await pipeline([['LRANGE', key, '0', '-1']]);
      return send(res, 200, { messages: parse(list) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.hp) return send(res, 200, { ok: true });            // honeypot field filled = bot
      const text = clean(body.text);
      if (!text.trim()) return send(res, 400, { error: 'empty' });

      // light rate limits: 20 messages / hour per conversation, 40 / hour per network (hashed, never stored raw)
      const hour = Math.floor(Date.now() / 3.6e6);
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const ipKey = `rl:ip:${crypto.createHash('sha256').update(ip + hour).digest('hex').slice(0, 16)}`;
      const cidKey = `rl:c:${cid}:${hour}`;
      const [nC, , nI] = await pipeline([['INCR', cidKey], ['EXPIRE', cidKey, '3700'], ['INCR', ipKey], ['EXPIRE', ipKey, '3700']]);
      if (nC > 20 || nI > 40) return send(res, 429, { error: 'slow down' });

      const at = Date.now();
      const msg = JSON.stringify({ from: 'visitor', text, at });
      await pipeline([
        ['RPUSH', key, msg],
        ['LTRIM', key, String(-MAX_THREAD), '-1'],
        ['ZADD', 'chats', String(at), cid],                       // inbox order: latest activity first
        ['HINCRBY', 'unread', cid, '1'],
      ]);
      return send(res, 200, { ok: true, at });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, 500, { error: 'store error' });
  }
};
