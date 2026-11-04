/* =========================================================
 * 伯洋體產生器 — 使用統計 Worker（Cloudflare Workers + D1）
 *
 *   POST /hit   body: {"vid":"<隨機代號>"}                 → 記一次造訪
 *               body: {"vid":"<隨機代號>","kind":"post"}   → 記一篇產出
 *   GET  /stats                                           → 目前累計數字
 *
 * 收什麼：模式名稱（post／reply／rewrite／checklist）與一組瀏覽器產生的隨機代號。
 * 不收什麼：使用者輸入的任何文字、IP、User-Agent。代號只存 SHA-256 雜湊。
 * ========================================================= */

const KINDS = ['post', 'reply', 'rewrite', 'checklist'];
const VID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_BODY = 256;     // 請求內容上限（位元組）
const RATE_WINDOW = 60;   // 秒
const RATE_LIMIT = 30;    // 每個代號每分鐘最多計幾次

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/stats' && request.method === 'GET') {
        return json(await readStats(env.DB), cors, 200, 'public, max-age=30');
      }
      if (pathname === '/hit' && request.method === 'POST') {
        if (!originAllowed(request, env)) return json({ error: 'origin' }, cors, 403);
        const body = await readBody(request);
        if (!body || !VID_RE.test(body.vid || '')) return json({ error: 'bad request' }, cors, 400);
        if (body.kind !== undefined && !KINDS.includes(body.kind)) return json({ error: 'bad kind' }, cors, 400);
        await record(env, body.vid, body.kind);
        return json(await readStats(env.DB), cors);
      }
      return json({ error: 'not found' }, cors, 404);
    } catch (e) {
      return json({ error: 'server' }, cors, 500);
    }
  }
};

/* ---------- 計數 ---------- */
async function record(env, vid, kind) {
  const db = env.DB;
  const id = await hashId(vid, env.SALT || '');
  const now = Math.floor(Date.now() / 1000);

  // 第一次看到這個代號 → 不重複訪客 +1
  const inserted = await db.prepare(
    'INSERT OR IGNORE INTO visitors (id, first_seen, win_start, win_count) VALUES (?, ?, ?, 0)'
  ).bind(id, now, now).run();
  if (inserted.meta && inserted.meta.changes === 1) await bump(db, 'visitors');

  if (!kind) return;

  // 每個代號每分鐘最多計 RATE_LIMIT 篇；超過就不計（不回錯誤，前端照常運作）
  const row = await db.prepare('SELECT win_start, win_count FROM visitors WHERE id = ?').bind(id).first();
  const inWindow = row && now - row.win_start < RATE_WINDOW;
  if (inWindow && row.win_count >= RATE_LIMIT) return;
  await db.prepare(
    inWindow
      ? 'UPDATE visitors SET win_count = win_count + 1 WHERE id = ?'
      : 'UPDATE visitors SET win_start = ' + now + ', win_count = 1 WHERE id = ?'
  ).bind(id).run();

  await bump(db, 'generated');
  await bump(db, 'kind:' + kind);
}

function bump(db, name) {
  return db.prepare(
    'INSERT INTO counters (name, n) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET n = n + 1'
  ).bind(name).run();
}

async function readStats(db) {
  const { results } = await db.prepare('SELECT name, n FROM counters').all();
  const map = Object.fromEntries((results || []).map(r => [r.name, r.n]));
  const byKind = Object.fromEntries(KINDS.map(k => [k, map['kind:' + k] || 0]));
  return { visitors: map.visitors || 0, generated: map.generated || 0, byKind };
}

/* ---------- 工具 ---------- */
async function hashId(vid, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + vid));
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readBody(request) {
  const len = +(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function allowedList(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
}

function originAllowed(request, env) {
  const list = allowedList(env);
  return !list.length || list.includes(request.headers.get('Origin') || '');
}

function corsHeaders(request, env) {
  const list = allowedList(env);
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': !list.length ? '*' : (list.includes(origin) ? origin : list[0]),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(obj, headers, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache }
  });
}
