const ALLOWED_ORIGINS = new Set([
  'https://kirielah.github.io',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
]);
const EXPECTED_HOSTNAME = 'kirielah.github.io';
const MAX_SCORE = 10000000;
const MAX_BODY_BYTES = 2048;

function jsonResponse(data, status, origin) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
    headers.append('Vary', 'Origin');
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return null;

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

async function getScores(db) {
  const result = await db.prepare(
    'SELECT level, player_name AS name, score, created_at FROM scores ORDER BY level, score DESC, created_at, id LIMIT 15',
  ).all();

  const scores = { 1: [], 2: [], 3: [] };
  for (const row of result.results) scores[row.level].push(row);
  return scores;
}

async function verifyTurnstile(token, remoteIp, secret) {
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!response.ok) throw new Error('Turnstile verification service returned an error');

  const result = await response.json();
  return result.success === true
    && result.hostname === EXPECTED_HOSTNAME
    && result.action === 'score_submit';
}

async function handleRequest(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  const url = new URL(request.url);
  if (url.pathname !== '/api/scores') return jsonResponse({ error: 'Not found' }, 404, origin);

  if (request.method === 'GET') {
    return jsonResponse({ scores: await getScores(env.DB) }, 200, origin);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const remoteIp = request.headers.get('CF-Connecting-IP');
  const rateLimit = await env.SUBMISSION_LIMITER.limit({ key: remoteIp || 'unknown' });
  if (!rateLimit.success) {
    return jsonResponse({ error: 'Too many score submissions. Please try again later.' }, 429, origin);
  }

  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return jsonResponse({ error: 'Content-Type must be application/json' }, 415, origin);
  }

  const body = await readJsonBody(request);
  if (!body || !Number.isInteger(body.level) || body.level < 1 || body.level > 3
    || !Number.isInteger(body.score) || body.score < 1 || body.score > MAX_SCORE
    || typeof body.name !== 'string' || !/^[A-Za-z0-9 _-]{1,16}$/.test(body.name.trim())
    || typeof body.turnstileToken !== 'string' || body.turnstileToken.length > 2048) {
    return jsonResponse({ error: 'Invalid score submission' }, 400, origin);
  }

  if (!env.TURNSTILE_SECRET) {
    return jsonResponse({ error: 'Score submission is not configured' }, 503, origin);
  }

  const verified = await verifyTurnstile(body.turnstileToken, remoteIp, env.TURNSTILE_SECRET);
  if (!verified) return jsonResponse({ error: 'Human verification failed. Please try again.' }, 403, origin);

  const level = body.level;
  const score = body.score;
  const name = body.name.trim();
  const insert = env.DB.prepare(
    `INSERT INTO scores (level, player_name, score)
     SELECT ?, ?, ?
     WHERE (SELECT COUNT(*) FROM scores WHERE level = ?) < 5
        OR ? > (SELECT MIN(score) FROM scores WHERE level = ?)`,
  ).bind(level, name, score, level, score, level);
  const prune = env.DB.prepare(
    `DELETE FROM scores
     WHERE id IN (
       SELECT id FROM (
         SELECT id, ROW_NUMBER() OVER (
           PARTITION BY level ORDER BY score DESC, created_at, id
         ) AS rank
         FROM scores
       ) WHERE rank > 5
     )`,
  );
  const [insertResult] = await env.DB.batch([insert, prune]);
  const scores = await getScores(env.DB);
  const submitted = insertResult.meta.changes > 0;

  return jsonResponse({
    submitted,
    message: submitted ? 'Score added to the leaderboard.' : 'That score did not make the top five.',
    scores,
  }, submitted ? 201 : 409, origin);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Leaderboard request failed:', error);
      const origin = request.headers.get('Origin');
      return jsonResponse({ error: 'Leaderboard service temporarily unavailable' }, 500, origin);
    }
  },
};
