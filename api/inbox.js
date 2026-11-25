// Manvi's private inbox. Every request needs the password in the "x-inbox-key" header
// (set INBOX_PASSWORD in the Vercel project's environment variables).
//   GET  /api/inbox               -> all conversations, latest first (preview + unread count)
//   GET  /api/inbox?cid=...       -> one conversation (marks it read)
//   POST /api/inbox { cid, text } -> reply; the visitor sees it in their chat window
//   POST /api/inbox { cid, del:1 }-> delete a conversation
const crypto = require('crypto');
const { configured, pipeline, CID, MAX_THREAD, clean, parse, send } = require('./_store');

function authorised(req) {
  const want = process.env.INBOX_PASSWORD || '';
  const got = String(req.headers['x-inbox-key'] || '');
  if (want.length < 8 || !got) return false;
  const a = crypto.createHash('sha256').update(want).digest();
  const b = crypto.createHash('sha256').update(got).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'storage not set up' });
  if (!process.env.INBOX_PASSWORD) return send(res, 503, { error: 'password not set' });
  if (!authorised(req)) { await new Promise((r) => setTimeout(r, 600)); return send(res, 401, { error: 'wrong password' }); }

  try {
    if (req.method === 'GET' && !req.query.cid) {
      const [ids, unread] = await pipeline([['ZREVRANGE', 'chats', '0', '199', 'WITHSCORES'], ['HGETALL', 'unread']]);
      const un = {};
      for (let i = 0; i < (unread || []).length; i += 2) un[unread[i]] = Number(unread[i + 1]) || 0;
      const rows = [];
      for (let i = 0; i < (ids || []).length; i += 2) rows.push({ cid: ids[i], at: Number(ids[i + 1]) });
      const last = rows.length ? await pipeline(rows.map((r) => ['LRANGE', `chat:${r.cid}`, '-1', '-1'])) : [];
      const counts = rows.length ? await pipeline(rows.map((r) => ['LLEN', `chat:${r.cid}`])) : [];
      return send(res, 200, {
        conversations: rows.map((r, i) => ({ ...r, last: parse(last[i])[0] || null, count: counts[i] || 0, unread: un[r.cid] || 0 })),
      });
    }

    const cid = String((req.method === 'GET' ? req.query.cid : req.body && req.body.cid) || '');
    if (!CID.test(cid)) return send(res, 400, { error: 'bad id' });
    const key = `chat:${cid}`;

    if (req.method === 'GET') {
      const [list] = await pipeline([['LRANGE', key, '0', '-1'], ['HDEL', 'unread', cid]]);
      return send(res, 200, { messages: parse(list) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.del) {
        await pipeline([['DEL', key], ['ZREM', 'chats', cid], ['HDEL', 'unread', cid]]);
        return send(res, 200, { ok: true });
      }
      const text = clean(body.text);
      if (!text.trim()) return send(res, 400, { error: 'empty' });
      const at = Date.now();
      await pipeline([
        ['RPUSH', key, JSON.stringify({ from: 'manvi', text, at })],
        ['LTRIM', key, String(-MAX_THREAD), '-1'],
        ['ZADD', 'chats', String(at), cid],
      ]);
      return send(res, 200, { ok: true, at });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, 500, { error: 'store error' });
  }
};
