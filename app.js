/* =========================================================
 * 伯洋體產生器 — 產生引擎
 * 依賴：data/corpus.js（全域 CORPUS）
 * ========================================================= */
'use strict';

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);
const rand = n => Math.floor(Math.random() * n);
const pick = arr => arr[rand(arr.length)];

function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(rand(copy.length), 1)[0]);
  return out;
}

/* ---------- 狀態 ---------- */
let currentStyle = 'basic';
let currentMode = 'post';   // 'post' | 'reply'
let lastAction = null;      // 「換一篇」重骰用
let lastResult = null;      // 複製／分享／存紀錄用
const recentOutputs = {};   // 各 style+type 近期輸出，防連按重複

const STYLE_ORDER = ['basic', 'slogan', 'academic', 'ironic', 'interpellation', 'crisis', 'warmth', 'thread'];

/* ---------- 模板填充 ---------- */
function fill(tpl, vals) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vals[k] !== undefined ? vals[k] : m));
}

function drawVals(fieldVals) {
  const W = CORPUS.words;
  const [a, a2] = pickN(W.a, 2);
  const [b, b2] = pickN(W.b, 2);
  const [c, c2] = pickN(W.c, 2);
  const [buzzword, buzzword2] = pickN(W.buzzwords, 2);
  const [jargon, jargon2, jargon3] = pickN(W.jargon, 3);
  const [stuck, stuck2] = pickN(W.stuck, 2);
  const vals = {
    subject: pick(W.subjects),
    a, a2, b, b2, c, c2, buzzword, buzzword2,
    jargon, jargon2, jargon3,
    stuck, stuck2,
    topic: pick(W.topics),
    // 非回覆模式也可能抽到含 {keyword} 的模板（海巡型），給隨機預設值
    keyword: pick(W.a),
    keyword2: pick(W.c)
  };
  if (fieldVals) {
    for (const [k, v] of Object.entries(fieldVals)) {
      if (v) vals[k] = v;
    }
  }
  return vals;
}

/* 依廢話濃度組裝：開場白 + 本文 + 填充句 + 收尾金句 */
function compose(body, vals, density, opts = {}) {
  const parts = [];
  if (!opts.noOpener && density >= 1 && Math.random() < (density === 2 ? 0.9 : 0.5)) {
    parts.push(fill(pick(CORPUS.openers), vals));
  }
  parts.push(body);
  const fillerCount = density === 0 ? 0 : density === 1 ? 1 : 3 + rand(2);
  for (const f of pickN(CORPUS.fillers, fillerCount)) {
    // 高濃度時一半機率在填充句前接轉折句，空轉得更順
    const lead = density === 2 && Math.random() < 0.5 ? pick(CORPUS.transitions) : '';
    parts.push(lead + fill(f, vals));
  }
  // 風格可自備收尾池（順起來版用來確保競選標語每篇都落地）
  let closer = fill(pick(opts.closers || CORPUS.closers), vals);
  if (density === 2 && Math.random() < 0.6) closer += ' ' + pick(CORPUS.emojis);
  parts.push(closer);
  return parts.join('\n\n');
}

function drawTags(vals, n) {
  return pickN(CORPUS.hashtags, n).map(t => fill(t, vals));
}

/* 防重複：同一 key 連續產生不得與近期輸出相同 */
function generateUnique(key, makeFn) {
  const seen = recentOutputs[key] || (recentOutputs[key] = []);
  let result = makeFn();
  for (let i = 0; i < 15 && seen.includes(result.text); i++) result = makeFn();
  seen.push(result.text);
  if (seen.length > 20) seen.shift();
  return result;
}

/* ---------- 產生：貼文 ---------- */
function getFieldVals() {
  return {
    subject: $('subject').value.trim(),
    a: $('noun_a').value.trim(),
    b: $('noun_b').value.trim(),
    c: $('noun_c').value.trim(),
    buzzword: $('buzzword').value.trim(),
    topic: $('topic').value.trim()
  };
}

function makePost(useFields) {
  const style = CORPUS.styles[currentStyle];
  const density = +$('density').value;
  const fieldVals = useFields ? getFieldVals() : null;
  const vals = drawVals(fieldVals);

  if (currentStyle === 'thread') {
    const set = pick(style.threadSets);
    const posts = set.map(p => ({
      text: fill(p.text, vals),
      tags: p.tags.map(t => fill(t, vals))
    }));
    return { thread: posts, text: posts.map(p => p.text).join('\n\n'), tags: [] };
  }

  // 使用者有填欄位時，優先抽「用到最多已填欄位」的模板，填的值才會進輸出
  let pool = style.templates;
  if (fieldVals) {
    const filledKeys = Object.entries(fieldVals).filter(([, v]) => v).map(([k]) => k);
    if (filledKeys.length) {
      const scored = pool.map(t => ({ t, s: filledKeys.filter(k => t.includes('{' + k + '}')).length }));
      const best = Math.max(...scored.map(o => o.s));
      pool = scored.filter(o => o.s === best).map(o => o.t);
    }
  }

  const body = fill(pick(pool), vals);
  let text = compose(body, vals, density, { noOpener: style.noOpener, closers: style.closers });
  // 一鍵貼文目標 100–300 字（不含空白）；低濃度=點到為止，不硬補
  if (!useFields && density >= 1) {
    let guard = 0;
    while (text.replace(/\s/g, '').length < 100 && guard++ < 4) {
      const closerIdx = text.lastIndexOf('\n\n');
      text = text.slice(0, closerIdx) + '\n\n' + fill(pick(CORPUS.fillers), vals) + text.slice(closerIdx);
    }
  }
  return { text, tags: drawTags(vals, 2 + rand(3)) };
}

/* ---------- 產生：回覆 ---------- */
const STOP_CHARS = '的了嗎嘛吧呢啊喔哦欸是在就都而與跟和或也很還又才只沒不你我他她它們個為對到底把被讓有無除等要會能可過再更最從及以喊、，。！？：；「」（）()!?.,~ 　';
const STOP_RE = new RegExp('[' + STOP_CHARS.replace(/[()[\]]/g, '\\$&') + ']+');

function extractKeywords(text) {
  const chunks = [];
  const cjkRuns = text.match(/[一-鿿]+/g) || [];
  for (const run of cjkRuns) {
    for (const seg of run.split(STOP_RE)) {
      if (seg.length >= 2) chunks.push(seg.slice(0, 6));
    }
  }
  for (const w of text.match(/[A-Za-z][A-Za-z0-9]{2,}/g) || []) chunks.push(w);
  const uniq = [...new Set(chunks)];
  uniq.sort((x, y) => y.length - x.length);
  // 長度優先＋去掉被更長關鍵詞包含的碎片，再保留一點隨機性
  const kept = [];
  for (const w of uniq) {
    if (!kept.some(k => k.includes(w))) kept.push(w);
  }
  const top = kept.slice(0, 4);
  return pickN(top, Math.min(top.length, 3));
}

function makeReply(inputText) {
  const kws = extractKeywords(inputText);
  const vals = drawVals();
  vals.keyword = kws[0] || inputText.slice(0, 6) || '這件事';
  vals.keyword2 = kws[1] || vals.keyword;
  const density = +$('density').value;
  const body = fill(pick(CORPUS.replies), vals);
  const text = compose(body, vals, density, { noOpener: true });
  return { text, tags: drawTags(vals, 2) };
}

/* ---------- 輸出渲染（Threads 卡片） ---------- */
function threadsCard(post, numLabel) {
  const card = document.createElement('article');
  card.className = 'threads-card';

  const head = document.createElement('div');
  head.className = 'tc-head';
  head.innerHTML =
    '<div class="tc-avatar">🗣</div>' +
    '<div class="tc-id"><span class="tc-name">伯洋體產生器</span>' +
    '<span class="tc-handle">@boyangti_parody · 剛剛</span></div>' +
    '<span class="tc-badge">戲仿</span>';
  card.appendChild(head);

  if (numLabel) {
    const num = document.createElement('div');
    num.className = 'tc-num';
    num.textContent = numLabel;
    card.appendChild(num);
  }

  const body = document.createElement('div');
  body.className = 'tc-text';
  body.textContent = post.text; // textContent 防 XSS（回覆模式會夾帶使用者輸入）
  card.appendChild(body);

  if (post.tags && post.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'tc-tags';
    post.tags.forEach(t => {
      const s = document.createElement('span');
      s.className = 'hashtag';
      s.textContent = t;
      tags.appendChild(s);
    });
    card.appendChild(tags);
  }

  const foot = document.createElement('div');
  foot.className = 'tc-foot';
  foot.innerHTML = `<span>♡ ${17 + rand(983)}</span><span>💬 ${3 + rand(97)}</span><span>🔁 ${1 + rand(49)}</span><span>↗</span>`;
  card.appendChild(foot);

  return card;
}

function shareText(result) {
  if (result.thread) {
    return result.thread.map(p => p.text + (p.tags.length ? '\n' + p.tags.join(' ') : '')).join('\n\n———\n\n');
  }
  return result.text + (result.tags.length ? '\n\n' + result.tags.join(' ') : '');
}

function render(result, label) {
  lastResult = result;
  const bodyEl = $('output-body');
  bodyEl.innerHTML = '';
  const group = document.createElement('div');
  group.className = 'thread-group';
  const posts = result.thread || [{ text: result.text, tags: result.tags }];
  posts.forEach((p, i) => group.appendChild(threadsCard(p, result.thread ? `串文 ${i + 1}／${posts.length}` : null)));
  bodyEl.appendChild(group);

  $('output-label').textContent = label;
  $('char-count').textContent = `${result.text.replace(/\s/g, '').length} 字`;
  const out = $('output');
  out.classList.remove('visible');
  void out.offsetWidth; // 重觸發動畫
  out.classList.add('visible');
  out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveHistory(shareText(result), label);
}

/* ---------- 歷史紀錄（localStorage，最近 5 筆） ---------- */
const HISTORY_KEY = 'byt_history_v1';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveHistory(text, label) {
  const list = loadHistory();
  list.unshift({ text, label, ts: Date.now() });
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* 隱私模式可能失敗，忽略 */ }
  renderHistory();
}

function renderHistory() {
  const list = loadHistory();
  const section = $('history-section');
  const container = $('history-list');
  if (!list.length) { section.hidden = true; return; }
  section.hidden = false;
  container.innerHTML = '';
  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${item.label} · ${new Date(item.ts).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const preview = document.createElement('div');
    preview.className = 'history-preview';
    preview.textContent = item.text.replace(/\s+/g, ' ').slice(0, 60) + (item.text.length > 60 ? '…' : '');
    const btn = document.createElement('button');
    btn.className = 'btn-ghost btn-small';
    btn.textContent = '複製';
    btn.addEventListener('click', () => copyText(item.text, btn));
    const info = document.createElement('div');
    info.className = 'history-info';
    info.appendChild(meta);
    info.appendChild(preview);
    row.appendChild(info);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

/* ---------- 複製與分享 ---------- */
function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ 已複製';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch { /* 無能為力 */ }
  document.body.removeChild(ta);
}

/* ---------- 事件綁定 ---------- */
function runAction(action) {
  lastAction = action;
  const styleName = CORPUS.styles[currentStyle].name;
  if (action.type === 'quick') {
    render(generateUnique('quick:' + currentStyle, () => makePost(false)), `${styleName}・一鍵貼文`);
  } else if (action.type === 'fields') {
    render(generateUnique('fields:' + currentStyle, () => makePost(true)), styleName);
  } else if (action.type === 'reply') {
    render(generateUnique('reply', () => makeReply(action.input)), '廢話回覆');
  }
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('post-panel').hidden = mode !== 'post';
  $('reply-panel').hidden = mode !== 'reply';
  $('style-block').hidden = mode !== 'post';
}

function initTabs() {
  const tabs = $('style-tabs');
  STYLE_ORDER.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (key === currentStyle ? ' active' : '');
    btn.textContent = CORPUS.styles[key].name;
    btn.addEventListener('click', () => {
      currentStyle = key;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    });
    tabs.appendChild(btn);
  });
}

function randomize() {
  const W = CORPUS.words;
  $('subject').value = pick(W.subjects);
  $('noun_a').value = pick(W.a);
  $('noun_b').value = pick(W.b);
  $('noun_c').value = pick(W.c);
  $('buzzword').value = pick(W.buzzwords);
  $('topic').value = pick(W.topics);
}

function initTheme() {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = r.getAttribute('data-theme') || 'dark';
  const sun = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const updateIcon = () => { t.innerHTML = d === 'dark' ? sun : moon; };
  updateIcon();
  t.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    updateIcon();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  renderHistory();

  document.querySelectorAll('.mode-btn').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));

  $('btn-quick').addEventListener('click', () => runAction({ type: 'quick' }));
  $('btn-generate').addEventListener('click', () => runAction({ type: 'fields' }));
  $('btn-random').addEventListener('click', randomize);

  $('btn-reply').addEventListener('click', () => {
    const input = $('reply-input').value.trim();
    const warn = $('reply-warn');
    if (!input) {
      warn.hidden = false;
      $('reply-input').focus();
      return;
    }
    warn.hidden = true;
    runAction({ type: 'reply', input });
  });
  $('reply-input').addEventListener('input', () => { $('reply-warn').hidden = true; });

  $('btn-again').addEventListener('click', () => { if (lastAction) runAction(lastAction); });
  $('btn-copy').addEventListener('click', e => { if (lastResult) copyText(shareText(lastResult), e.currentTarget); });
  $('btn-share').addEventListener('click', () => {
    if (!lastResult) return;
    const text = lastResult.thread ? lastResult.thread[0].text + '\n' + lastResult.thread[0].tags.join(' ') : shareText(lastResult);
    window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  // 濃度滑桿文字提示
  const densityLabels = ['低・點到為止', '中・恰到好處的空泛', '高・資訊量趨近於零'];
  const updateDensity = () => { $('density-hint').textContent = densityLabels[+$('density').value]; };
  $('density').addEventListener('input', updateDensity);
  updateDensity();
});
