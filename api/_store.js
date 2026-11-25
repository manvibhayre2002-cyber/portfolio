// Tiny Redis client over the Upstash REST API (no npm packages needed).
// Vercel's "Upstash for Redis" storage adds these env vars to the project.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = () => Boolean(URL_ && TOKEN);

// run several commands in one round trip: pipeline([['RPUSH', 'k', 'v'], ['EXPIRE', 'k', 60]])
async function pipeline(cmds) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`store ${r.status}`);
  const out = await r.json();
  return out.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

const CID = /^[a-z0-9]{16,40}$/i;          // visitor conversation id (random, made in their browser)
const MAX_LEN = 600;                        // characters per message
const MAX_THREAD = 300;                     // messages kept per conversation

const clean = (t) => String(t || '').replace(/\s+$/g, '').slice(0, MAX_LEN);
const parse = (list) => (list || []).map((s) => { try { return JSON.parse(s); } catch (_) { return null; } }).filter(Boolean);

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

module.exports = { configured, pipeline, CID, MAX_LEN, MAX_THREAD, clean, parse, send };
