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
let currentOccasion = 'general'; // 'general' 或 CORPUS.occasions 的 key
let currentLength = 'medium';    // 'short' | 'medium' | 'long'
let currentMode = 'post';   // 'post' | 'reply'
let currentLang = 'zh-TW';  // 'zh-TW' | 'en'（只影響介面外殼，產出恆為中文）
let lastAction = null;      // 「換一篇」重骰用
let lastResult = null;      // 複製／分享／存紀錄用
let lastLabel = null;       // 切語言時重畫輸出標題用
const recentOutputs = {};   // 各 style+type 近期輸出，防連按重複

const STYLE_ORDER = ['basic', 'slogan', 'debate', 'academic', 'ironic', 'daily', 'interpellation', 'crisis', 'warmth', 'thread'];
const OCCASION_ORDER = ['general', 'policy', 'rebuttal', 'apology', 'holiday', 'rally',
  'meeting', 'wedding', 'yearend', 'graduation', 'interview', 'family'];
const LENGTHS = ['short', 'medium', 'long'];
const THREADS_LIMIT = 500; // Threads 單則字數上限，長文超過時提示

/* ---------- 介面語言 ----------
 * 只翻譯介面外殼；產生出來的內容一律是繁體中文（笑點建立在中文上）。 */
const LANG_KEY = 'byt_lang_v1';

function t(key, vars) {
  const pack = I18N[currentLang] || I18N['zh-TW'];
  let s = pack[key] !== undefined ? pack[key] : (I18N['zh-TW'][key] !== undefined ? I18N['zh-TW'][key] : key);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}

/* 英文模式下用語言包裡的風格名，否則用語料庫原名 */
function styleName(key) {
  const map = (I18N[currentLang] || {}).styles;
  return (map && map[key]) || CORPUS.styles[key].name;
}

// 場合名稱：中文取 CORPUS.occasions[key].name，英文取 I18N.en.occasions；「一般貼文」不是場合，走語言包
function occasionName(key) {
  if (key === 'general') return t('occasion.general');
  const map = (I18N[currentLang] || {}).occasions;
  return (map && map[key]) || CORPUS.occasions[key].name;
}

function applyLang(lang) {
  currentLang = I18N[lang] ? lang : 'zh-TW';
  try { localStorage.setItem(LANG_KEY, currentLang); } catch { /* 隱私模式可能失敗，忽略 */ }

  document.documentElement.lang = currentLang;
  document.title = t('meta.title');

  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  // data-i18n-html 僅供語言包內的靜態標記使用，不接受任何使用者輸入
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-content]').forEach(el => { el.setAttribute('content', t(el.dataset.i18nContent)); });

  const note = $('lang-note');
  note.hidden = !t('note.zhOnly');

  const btn = document.querySelector('[data-lang-toggle]');
  if (btn) btn.textContent = t('next');

  initTabs();
  updateDensityHint();
  renderHistory();
  if (lastLabel) $('output-label').textContent = labelText(lastLabel);
  if (lastStats) showStats(lastStats);
}

function labelText(l) {
  if (typeof l === 'string') return l; // 早期版本的歷史紀錄存的是字串，相容處理
  if (l.type === 'reply') return t('out.reply');
  if (l.type === 'checklist') return t('chk.label');
  if (l.type === 'rewrite') return t('out.rewrite');
  const bits = [styleName(l.style)];
  if (l.occasion && l.occasion !== 'general') bits.push(occasionName(l.occasion));
  if (l.length && l.length !== 'medium') bits.push(t('length.' + l.length));
  if (l.topic) bits.push(l.topic);
  else if (l.type === 'quick') bits.push(t('out.quick'));
  return bits.join(t('out.sep'));
}

function updateDensityHint() {
  $('density-hint').textContent = t('density.' + $('density').value);
}

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
    holiday: pick(W.holidays),
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
  if (opts.topic && !opts.noOpener) {
    // 使用者給了主題：一律用主題開場白，不受濃度與機率影響，保證題目出現在第一句
    parts.push(fill(pick(CORPUS.topicOpeners), vals));
  } else if (!opts.noOpener && density >= 1 && Math.random() < (density === 2 ? 0.9 : 0.5)) {
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

function makePost(useFields, opts = {}) {
  const style = CORPUS.styles[currentStyle];
  const density = +$('density').value;
  const length = opts.length || currentLength;
  const occasion = opts.occasion || currentOccasion;
  // 主題欄是首要輸入，一鍵貼文也吃它；首屏示範刻意忽略，維持隨機
  const topic = opts.ignoreTopic ? '' : $('topic').value.trim();
  const fieldVals = useFields ? getFieldVals() : (topic ? { topic } : null);
  const hasTopic = !!(fieldVals && fieldVals.topic);
  const vals = drawVals(fieldVals);
  const ctx = {
    style, vals, density, hasTopic, topic: hasTopic ? fieldVals.topic : '',
    pool: bodyPool(style, useFields, fieldVals, hasTopic),
    closers: style.closers
  };

  // 場合優先：骨架決定段落，本文仍取自目前的風格（§13.2）
  if (occasion !== 'general') {
    const occ = CORPUS.occasions[occasion];
    return { text: assemble(pick(occ[length]), occ.parts, ctx), tags: drawTags(vals, tagCount(length)) };
  }
  if (style.threadSets) return makeThread(style, vals, hasTopic, length);
  if (style.day) return makeDay(style.day, vals, density, hasTopic, length);
  if (length === 'short') return makeShort(ctx);
  if (length === 'long') return { text: assemble(pick(CORPUS.longform.skeletons), null, ctx), tags: drawTags(vals, tagCount(length)) };

  // 中篇：本站原本的貼文
  const body = fill(pick(ctx.pool), vals);
  let text = compose(body, vals, density, { noOpener: style.noOpener, closers: style.closers, topic: hasTopic });
  // 一鍵貼文目標 100–300 字（不含空白）；低濃度=點到為止，不硬補
  if (!useFields && density >= 1) {
    let guard = 0;
    while (text.replace(/\s/g, '').length < 100 && guard++ < 4) {
      const closerIdx = text.lastIndexOf('\n\n');
      text = text.slice(0, closerIdx) + '\n\n' + fill(pick(CORPUS.fillers), vals) + text.slice(closerIdx);
    }
  }
  return { text, tags: drawTags(vals, tagCount(length)) };
}

const tagCount = length => length === 'short' ? 1 : length === 'long' ? 3 + rand(3) : 2 + rand(3);

/* 本文模板池：串文與生活應用版沒有單則模板，場合／篇幅需要本文時退回基礎版 */
function bodyPool(style, useFields, fieldVals, hasTopic) {
  let pool = style.templates || CORPUS.styles.basic.templates;
  if (!useFields && hasTopic) {
    // 一鍵貼文有主題時只做軟性偏好：含 {topic} 的模板很少（順起來版只有 2/18），
    // 硬收窄會一直重複同幾則。題目出現與否改由開場白保證；
    // 沒有開場白的風格（質詢版）才全押在含 {topic} 的模板上。
    const withTopic = pool.filter(tpl => tpl.includes('{topic}'));
    if (withTopic.length && (style.noOpener || Math.random() < 0.5)) pool = withTopic;
  } else if (fieldVals) {
    // 使用者有填欄位時，優先抽「用到最多已填欄位」的模板，填的值才會進輸出
    const filledKeys = Object.entries(fieldVals).filter(([, v]) => v).map(([k]) => k);
    if (filledKeys.length) {
      const scored = pool.map(t => ({ t, s: filledKeys.filter(k => t.includes('{' + k + '}')).length }));
      const best = Math.max(...scored.map(o => o.s));
      pool = scored.filter(o => o.s === best).map(o => o.t);
    }
  }
  return pool;
}

/* 短篇：一則留言的長度，只留本文，不加開場、填充、收尾（§13.1） */
const QUOTE_SHORT = 0.3; // 一般短篇改用經典語錄的機率
const SHORT_MAX = 60; // 模板本身（佔位符以兩字估）不含空白的字數上限
const roughLen = tpl => tpl.replace(/\{\w+\}/g, 'xx').replace(/\s/g, '').length;

function makeShort(ctx) {
  const { pool, vals, hasTopic, topic, style } = ctx;
  let short = pool.filter(t => roughLen(t) <= SHORT_MAX);
  if (!short.length) short = [...pool].sort((x, y) => roughLen(x) - roughLen(y)).slice(0, 5);
  if (hasTopic) {
    const withTopic = short.filter(t => t.includes('{topic}'));
    if (withTopic.length && (style.noOpener || Math.random() < 0.5)) short = withTopic;
  }
  // 三成機率直接甩一句經典語錄（§14）：短篇最適合原封不動地引用
  let text = Math.random() < QUOTE_SHORT ? pick(CORPUS.quotes.lines) : fill(pick(short), vals);
  if (hasTopic && !text.includes(topic)) text = fill(pick(CORPUS.topicOpeners), vals) + '\n' + text;
  return { text, tags: drawTags(vals, 1) };
}

/* 骨架組裝：依序把段落名換成文字（段落名的規則見 corpus.js「篇幅與場合」） */
function assemble(skeleton, parts, ctx) {
  const { vals, density, hasTopic, topic, style } = ctx;
  const seen = {};
  const draw = (key, list) => {
    const used = seen[key] || (seen[key] = new Set());
    const fresh = list.filter(x => !used.has(x));
    const x = pick(fresh.length ? fresh : list);
    used.add(x);
    return fill(x, vals);
  };
  const out = [];
  let glue = false; // 小標和下一段黏在一起
  let bodies = 0;
  const push = text => {
    if (glue) out[out.length - 1] += '\n' + text;
    else out.push(text);
    glue = false;
  };
  const filler = () => (density === 2 && Math.random() < 0.5 ? pick(CORPUS.transitions) : '') + draw('fillers', CORPUS.fillers);

  for (const key of skeleton) {
    if (key === 'topic') { if (hasTopic) push(draw('topicOpeners', CORPUS.topicOpeners)); continue; }
    if (key === 'opener') { if (!style.noOpener) push(draw('openers', CORPUS.openers)); continue; }
    if (key === 'filler') { push(filler()); continue; }
    if (key === 'quote') { push(pick(CORPUS.quotes.leads) + draw('quotes', CORPUS.quotes.lines)); continue; }
    if (key === 'fillers') { for (let i = 0; i < density; i++) push(filler()); continue; }
    if (key === 'body') {
      const lead = bodies++ && density === 2 && Math.random() < 0.5 ? pick(CORPUS.transitions) : '';
      push(lead + draw('body', ctx.pool));
      continue;
    }
    if (key === 'closer') {
      let closer = draw('closers', ctx.closers || CORPUS.closers);
      if (density === 2 && Math.random() < 0.6) closer += ' ' + pick(CORPUS.emojis);
      push(closer);
      continue;
    }
    const list = (parts && parts[key]) || CORPUS.longform.parts[key];
    // 拼錯的段落名照原樣輸出成 {key}，讓冒煙測試抓得到，不默默吞掉
    push(list ? draw(key, list) : '{' + key + '}');
    if (/^h\d$/.test(key)) glue = true;
  }
  let text = out.join('\n\n');
  if (hasTopic && !text.includes(topic)) text = fill(pick(CORPUS.topicOpeners), vals) + '\n\n' + text;
  return text;
}

/* 串文：短 3 則（頭、一則中段、尾）／中 5 則／長 7 則（多插兩則別組的中段） */
function makeThread(style, vals, hasTopic, length) {
  let sets = style.threadSets;
  if (hasTopic) {
    const withTopic = sets.filter(set => set.some(p => p.text.includes('{topic}')));
    if (withTopic.length) sets = withTopic;
  }
  const set = pick(sets);
  let posts = set;
  if (length === 'short') {
    const mids = set.slice(1, -1);
    const topicMids = mids.filter(p => p.text.includes('{topic}'));
    const ends = [set[0], set[set.length - 1]];
    const needTopic = hasTopic && !ends.some(p => p.text.includes('{topic}'));
    posts = [set[0], pick(needTopic && topicMids.length ? topicMids : mids), set[set.length - 1]];
  } else if (length === 'long') {
    const others = style.threadSets.filter(x => x !== set).flatMap(x => x.slice(1, -1));
    posts = [...set.slice(0, -1), ...pickN(others, 2), set[set.length - 1]];
  }
  const filled = posts.map(p => ({ text: fill(p.text, vals), tags: p.tags.map(t => fill(t, vals)) }));
  return { thread: filled, text: filled.map(p => p.text).join('\n\n'), tags: [] };
}

/* 生活應用版：開場 → 依時間排序的時段 → 可選收尾（style-guide §12）
 * 濃度決定時段數；有主題時用一段主題情境取代其中一個時段，保證主題出現。 */
const DAY_SCENES = [3, 4, 5]; // 中篇依濃度
const DAY_SHORT = 2;
const DAY_LONG = 7;

function makeDay(day, vals, density, hasTopic, length = 'medium') {
  const n = length === 'short' ? DAY_SHORT : length === 'long' ? DAY_LONG : DAY_SCENES[density];
  // 從全部時段挑 n 個，維持原本的時間順序
  const idx = pickN(day.scenes.map((_, i) => i), n).sort((x, y) => x - y);
  const scenes = idx.map(i => day.scenes[i]);
  const topicAt = hasTopic ? 1 + rand(n - 1) : -1;
  if (hasTopic) scenes[topicAt] = pick(day.topicScenes);

  // 同一篇不重複同一招（m），否則每段都是「最重要的是陪伴」，笑點就沒了。
  // 主題情境的招式最多，所以放到時段之後才挑；收尾池裡有 plain，一定挑得到。
  const used = new Set();
  const pickFresh = lines => {
    const fresh = lines.filter(l => l.m === 'plain' || !used.has(l.m));
    const line = pick(fresh.length ? fresh : lines);
    used.add(line.m);
    return fill(line.t, vals);
  };
  const intro = pickFresh(day.intros);
  const order = scenes.map((_, i) => i).filter(i => i !== topicAt);
  if (hasTopic) order.push(topicAt);
  const bodies = [];
  for (const i of order) bodies[i] = pickFresh(scenes[i].lines);

  const parts = [intro, ...scenes.map((sc, i) => fill(sc.slot, vals) + '：\n' + bodies[i])];
  const outro = length === 'long' || (length === 'medium' && (density === 2 || (density === 1 && Math.random() < 0.5)));
  if (outro) parts.push(pickFresh(day.outros));
  return { text: parts.join('\n\n'), tags: drawTags(vals, tagCount(length)) };
}

/* ---------- 改文引擎（style-guide §15） ----------
 * 一篇具體的文章 → 伯洋體：拿掉具體元素、換掉具體動詞、每句接上遞進。
 * 只刪除不新增：替代詞全是抽象詞，結果最後一行固定附自我標示。 */
const REWRITE_SENTENCES = [3, 5, 8]; // 依濃度改寫前幾句
const REWRITE_INFLATE = [0.5, 0.8, 1]; // 每句接上遞進的機率

function splitSentences(text) {
  return (text.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [])
    .map(x => x.trim())
    .filter(x => /[一-鿿]/.test(x));
}

function deconcretize(sentence, removed) {
  const R = CORPUS.rewrite;
  // 先換成私用區字元當記號（不能含數字，否則會被後面的「裸數字」規則吃掉），
  // 相鄰的同類記號合併成一個（「《條例》第3條」只換一次）
  const mark = i => String.fromCharCode(0xE000 + i);
  let x = sentence;
  R.swaps.forEach((sw, i) => {
    x = x.replace(sw.re, () => { removed[sw.key] = (removed[sw.key] || 0) + 1; return mark(i); });
  });
  x = x.replace(/([\uE000-\uE0FF])(?:\s*\1)+/g, '$1');
  x = x.replace(/[\uE000-\uE0FF]/g, ch => pick(R.swaps[ch.charCodeAt(0) - 0xE000].to));
  for (const [from, to] of R.verbs) x = x.split(from).join(to);
  return /[。！？!?；;]$/.test(x) ? x : x + '。';
}

/* 膨脹用的關鍵詞：先把具體元素整段挖掉再斷詞，只留 2–4 字的詞，避免抓到「年前投入」這種碎片 */
const KW_NUMERAL = /[\d一二兩三四五六七八九十百千萬億]/;
// 政策文章常見的動詞與虛詞：在這些地方再切一刀，名詞才會從「大安區增設」裡分出來
const KW_SPLIT = /宣布|表示|編列|增設|新增|投入|辦理|可讓|受惠|今日|預計|推動|提高|提升|降低|減少|增加|擴大|興建|完成|開放|縮短|執行|改善|規劃|評估|實施|公告|相關|預計|目前|透過|進行|針對|包括|以及|並|依|將|已|達|讓|於|此/g;
function rewriteKeywords(text) {
  let stripped = text;
  for (const sw of CORPUS.rewrite.swaps) stripped = stripped.replace(sw.re, '，');
  const segs = [];
  for (const run of stripped.replace(KW_SPLIT, '，').match(/[一-鿿]+/g) || []) {
    for (const seg of run.split(STOP_RE)) if (seg.length >= 2 && seg.length <= 4 && !KW_NUMERAL.test(seg)) segs.push(seg);
  }
  // 長的優先（四字詞通常是完整名詞），再保留一點隨機性
  const uniq = [...new Set(segs)].sort((x, y) => y.length - x.length);
  return pickN(uniq.slice(0, 4), Math.min(uniq.length, 3));
}

function makeRewrite(inputText) {
  const R = CORPUS.rewrite;
  const density = +$('density').value;
  const vals = drawVals();
  const removed = {};
  const sentences = splitSentences(inputText).slice(0, REWRITE_SENTENCES[density]);
  const docKws = rewriteKeywords(inputText);
  const usedInflate = new Set();
  const inflate = () => {
    const fresh = R.inflate.filter(t => !usedInflate.has(t));
    const t = pick(fresh.length ? fresh : R.inflate);
    usedInflate.add(t);
    return t;
  };

  const paras = sentences.map(sen => {
    const kw = rewriteKeywords(sen)[0] || docKws[0] || '這件事';
    let p = deconcretize(sen, removed);
    if (Math.random() < REWRITE_INFLATE[density]) p += '\n' + fill(inflate(), { ...vals, keyword: kw });
    return p;
  });

  const keyword = docKws[0] || '這件事';
  const parts = [pick(R.openers), ...paras];
  if (density >= 1 && paras.length) parts.splice(Math.min(3, parts.length), 0, fill(pick(R.ladders), { ...vals, keyword }));
  if (density === 2) parts.push(pick(CORPUS.quotes.leads) + pick(CORPUS.quotes.lines));
  parts.push(fill(pick(CORPUS.closers), vals));
  parts.push(R.signoff);

  const total = Object.values(removed).reduce((a, b) => a + b, 0);
  return {
    text: parts.join('\n\n'),
    tags: drawTags({ ...vals, topic: keyword }, 2),
    rewrite: { removed, total, sentences: sentences.length }
  };
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

/* ---------- 拆解：把口號變成該問的問題 ----------
 * 這裡只做兩件事：機械比對文本裡有什麼、輸出固定的問責提問。
 * 絕不推測「這句話想說什麼」，也絕不生成任何答案。 */

/* 這句話落在邏輯模型的哪幾層——純關鍵詞比對，僅供參考 */
function ladderHits(text) {
  return CHECKLIST.ladder.map(rung => {
    // 影響層併入語料庫的終極目標詞池：同一份詞庫反過來用就是偵測器
    const extra = rung.key === 'impact' ? CORPUS.words.c.concat(CORPUS.words.a) : [];
    const found = rung.markers.concat(extra).filter(m => text.includes(m));
    return { rung, found: [...new Set(found)].slice(0, 4) };
  });
}

/* 修辭標記：找出抽象詞與連接詞的位置。長詞優先、互不重疊 */
function rhetoricHits(text) {
  const R = CHECKLIST.rhetoric;
  const impact = (CHECKLIST.ladder.find(r => r.key === 'impact') || { markers: [] }).markers;
  const abstractWords = [...new Set(R.abstract.concat(CORPUS.words.a, CORPUS.words.c, impact))]
    .filter(w => w.length >= 2 && !(R.abstractExclude || []).includes(w));
  const cands = [];
  for (const [kind, words] of [['abs', abstractWords], ['con', R.connectors]]) {
    for (const w of words) {
      for (let i = text.indexOf(w); i !== -1; i = text.indexOf(w, i + 1)) cands.push({ start: i, end: i + w.length, kind, w });
    }
  }
  cands.sort((x, y) => x.start - y.start || (y.end - y.start) - (x.end - x.start));
  const spans = [];
  let cursor = 0;
  for (const c of cands) if (c.start >= cursor) { spans.push(c); cursor = c.end; }
  const uniq = kind => [...new Set(spans.filter(s => s.kind === kind).map(s => s.w))];
  return { spans, abstract: uniq('abs'), connectors: uniq('con') };
}

function detectConcrete(text) {
  return CHECKLIST.detectors.map(d => ({ d, hit: d.re.test(text) }));
}

function makeChecklist(input) {
  const text = input.trim();
  const kws = extractKeywords(text);
  // 抽不到關鍵詞就退回通用寫法，不硬塞
  const vals = { keyword: kws[0] || t('chk.thisClaim'), keyword2: kws[1] || kws[0] || t('chk.thisClaim') };
  const detected = detectConcrete(text);
  const missing = detected.filter(x => !x.hit).length;

  const groups = CHECKLIST.groups.map(g => {
    const pack = g[currentLang] || g['zh-TW'];
    const det = g.detector ? detected.find(x => x.d.key === g.detector) : null;
    return {
      key: g.key,
      icon: g.icon,
      title: pack.title,
      lead: pack.lead,
      // 輸入若已提供該面向，標示出來——它就不是這句話迴避掉的問題
      answered: det ? det.hit : false,
      questions: pack.questions.map(q => fill(q, vals))
    };
  });

  const rhetoric = rhetoricHits(text);
  return { checklist: true, input: text, keywords: kws, ladder: ladderHits(text), detected, missing, groups, rhetoric,
           text: checklistText(text, groups, rhetoric) };
}

/* 純文字版，給複製與分享用 */
function checklistText(input, groups, rhetoric) {
  const lines = [t('chk.copyHead'), '「' + input + '」', ''];
  if (rhetoric.abstract.length) lines.push(t('chk.rhetAbs') + '：' + rhetoric.abstract.join('、'));
  if (rhetoric.connectors.length) lines.push(t('chk.rhetCon') + '：' + rhetoric.connectors.join('、'));
  if (rhetoric.abstract.length || rhetoric.connectors.length) lines.push('');
  groups.forEach(g => {
    lines.push(`${g.icon} ${g.title}`);
    g.questions.forEach(q => lines.push('  - ' + q));
    lines.push('');
  });
  lines.push(t('chk.copyFoot'));
  return lines.join('\n');
}

/* ---------- 輸出渲染（Threads 卡片） ---------- */
/* 改寫報告：這次拿掉了什麼（textContent，不碰 innerHTML） */
function rewriteReport(rw) {
  const p = document.createElement('p');
  p.className = 'rewrite-report';
  if (!rw.total) {
    p.textContent = t('rw.none');
    return p;
  }
  const bits = CORPUS.rewrite.swaps
    .filter(sw => rw.removed[sw.key])
    .map(sw => t('rw.item', { n: rw.removed[sw.key], what: t('rw.cat.' + sw.key) }));
  p.textContent = t('rw.report', { n: rw.sentences, list: bits.join(t('rw.sep')) });
  return p;
}

function postCard(post, numLabel) {
  const art = document.createElement('article');
  art.className = 'post';

  if (numLabel) {
    const n = document.createElement('div');
    n.className = 'post-num';
    n.textContent = numLabel;
    art.appendChild(n);
  }

  const body = document.createElement('div');
  body.className = 'post-text';
  body.textContent = post.text; // textContent 防 XSS（回覆模式會夾帶使用者輸入）
  art.appendChild(body);

  if (post.tags && post.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'post-tags';
    post.tags.forEach(tag => {
      const s = document.createElement('span');
      s.textContent = tag;
      tags.appendChild(s);
    });
    art.appendChild(tags);
  }

  return art;
}

/* 拆解結果的渲染。全程 textContent——這裡會把使用者輸入回填到畫面上 */
function checklistCard(result) {
  const wrap = document.createElement('div');
  wrap.className = 'chk';

  const el = (tag, cls, txt, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    if (parent) parent.appendChild(n);
    return n;
  };
  const section = (headText) => {
    const sec = el('section', 'chk-sec', undefined, wrap);
    el('div', 'chk-sec-head', headText, sec);
    return sec;
  };

  // 被拆解的原句，標上修辭位置。逐段用 textContent 組，不碰 innerHTML（這是使用者輸入）
  const quote = el('blockquote', 'chk-quote', undefined, wrap);
  quote.setAttribute('lang', 'zh-TW');
  let pos = 0;
  for (const sp of result.rhetoric.spans) {
    if (sp.start > pos) quote.appendChild(document.createTextNode(result.input.slice(pos, sp.start)));
    el('mark', 'rh-' + sp.kind, result.input.slice(sp.start, sp.end), quote);
    pos = sp.end;
  }
  if (pos < result.input.length) quote.appendChild(document.createTextNode(result.input.slice(pos)));

  // 修辭標記：用了什麼（下一節的盤點是缺了什麼）
  const rh = result.rhetoric;
  const rhSec = section(t('chk.rhetHead', { a: rh.abstract.length, c: rh.connectors.length }));
  if (rh.abstract.length || rh.connectors.length) {
    for (const [kind, words, key] of [['abs', rh.abstract, 'chk.rhetAbs'], ['con', rh.connectors, 'chk.rhetCon']]) {
      if (!words.length) continue;
      const row = el('div', 'chk-rhet', undefined, rhSec);
      el('mark', 'rh-' + kind, t(key), row);
      el('span', 'chk-rhet-words', words.join('、'), row);
    }
  } else {
    el('p', 'chk-note', t('chk.rhetNone'), rhSec);
  }
  el('p', 'chk-note', t('chk.rhetNote'), rhSec);

  // 具體元素盤點：只陳述文本裡找不找得到，不做評價
  const scan = section(t('chk.scanHead', { n: result.missing, total: result.detected.length }));
  const list = el('div', 'chk-scan', undefined, scan);
  result.detected.forEach(({ d, hit }) => {
    const pack = d[currentLang] || d['zh-TW'];
    const row = el('div', 'chk-item' + (hit ? ' hit' : ''), undefined, list);
    el('span', 'chk-flag', hit ? '✓' : '✗', row);
    el('span', 'chk-text', hit ? pack.has : pack.none, row);
  });

  // 邏輯模型落點。五層全空也要照常顯示——那本身就是最有資訊量的結果
  const lad = section(t('chk.ladderHead'));
  result.ladder.forEach(({ rung, found }) => {
    const pack = rung[currentLang] || rung['zh-TW'];
    const row = el('div', 'chk-rung' + (found.length ? ' on' : ''), undefined, lad);
    el('span', 'chk-rung-name', pack.name, row);
    el('span', 'chk-bar', undefined, row);
    el('span', 'chk-rung-hit', found.length ? found.join('、') : pack.desc, row);
  });
  if (!result.ladder.some(l => l.found.length)) el('p', 'chk-none', t('chk.ladderNone'), lad);
  el('p', 'chk-note', t('chk.ladderNote'), lad);

  // 問責提問：編號的連續文件
  const qs = section(t('chk.count', { n: result.groups.reduce((a, g) => a + g.questions.length, 0) }));
  result.groups.forEach((g, i) => {
    const sec = el('div', 'chk-group' + (g.answered ? ' answered' : ''), undefined, qs);
    el('span', 'chk-no', String(i + 1), sec);
    const col = el('div', undefined, undefined, sec);
    const head = el('div', undefined, undefined, col);
    el('h3', undefined, g.title, head);
    if (g.answered) el('span', 'chk-tag', t('chk.answered'), head);
    el('p', 'chk-lead', g.lead, col);
    const ul = el('ul', 'chk-q', undefined, col);
    g.questions.forEach(q => el('li', undefined, q, ul));
  });

  el('p', 'chk-note chk-foot', t('chk.foot'), wrap);
  return wrap;
}

function shareText(result) {
  if (result.checklist) return result.text;
  if (result.thread) {
    return result.thread.map(p => p.text + (p.tags.length ? '\n' + p.tags.join(' ') : '')).join('\n\n———\n\n');
  }
  return result.text + (result.tags.length ? '\n\n' + result.tags.join(' ') : '');
}

function render(result, label) {
  lastResult = result;
  lastLabel = label;
  const bodyEl = $('output-body');
  bodyEl.innerHTML = '';
  if (result.checklist) {
    bodyEl.appendChild(checklistCard(result));
  } else {
    const posts = result.thread || [{ text: result.text, tags: result.tags }];
    posts.forEach((p, i) => bodyEl.appendChild(
      postCard(p, result.thread ? t('out.thread', { i: i + 1, n: posts.length }) : null)));
    if (result.rewrite) bodyEl.appendChild(rewriteReport(result.rewrite));
  }

  // 拆解結果是固定的，重骰沒有意義；分享用的是問題清單而非戲仿貼文
  $('btn-again').hidden = !!result.checklist;
  $('output-label').textContent = labelText(label);
  $('char-count').textContent = result.checklist
    ? ''
    : `${result.text.replace(/\s/g, '').length} ${t('out.chars')}`;
  // 單則貼文超過 Threads 上限時提醒（串文每則各自計算，不提示）
  const tooLong = !result.checklist && !result.thread && [...shareText(result)].length > THREADS_LIMIT;
  $('share-note').hidden = !tooLong;
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
    meta.textContent = `${labelText(item.label)} · ${new Date(item.ts).toLocaleString(t('locale'), { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const preview = document.createElement('div');
    preview.className = 'history-preview';
    preview.textContent = item.text.replace(/\s+/g, ' ').slice(0, 60) + (item.text.length > 60 ? '…' : '');
    const btn = document.createElement('button');
    btn.className = 'btn btn-line';
    btn.textContent = t('history.copy');
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
    btn.textContent = t('btn.copied');
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
/* ---------- 使用統計（自架 Cloudflare Worker，見 worker/） ----------
 * 只送模式名稱與一組隨機代號，絕不送使用者輸入的文字。
 * <meta name="byt-stats"> 留空 = 完全關閉：不發任何請求、頁尾不顯示。 */
const STATS_URL = ((document.querySelector('meta[name="byt-stats"]') || {}).content || '').trim().replace(/\/+$/, '');
const VID_KEY = 'byt_vid_v1';
const STAT_KIND = { quick: 'post', fields: 'post', reply: 'reply', rewrite: 'rewrite', checklist: 'checklist' };
let sessionVid = null;
let lastStats = null;

function visitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(VID_KEY, v); }
    return v;
  } catch {
    // 隱私模式存不了：這次瀏覽用一組暫時代號（會被當成新訪客，可以接受）
    return sessionVid || (sessionVid = crypto.randomUUID());
  }
}

function sendStat(kind) {
  if (!STATS_URL) return;
  const body = JSON.stringify(kind ? { vid: visitorId(), kind } : { vid: visitorId() });
  // text/plain 是「簡單請求」，不會觸發 CORS 預檢
  fetch(STATS_URL + '/hit', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })
    .then(r => (r.ok ? r.json() : null))
    .then(s => { if (s) showStats(s); })
    .catch(() => { /* 統計失敗不影響使用 */ });
}

function showStats(s) {
  if (!s || typeof s.visitors !== 'number' || typeof s.generated !== 'number') return;
  lastStats = s;
  const el = $('usage-stats');
  const fmt = n => n.toLocaleString(currentLang === 'en' ? 'en-US' : 'zh-TW');
  el.textContent = t('stats.line', { v: fmt(s.visitors), g: fmt(s.generated) });
  el.hidden = false;
}

function initStats() {
  if (!STATS_URL) return;
  $('usage-privacy').hidden = false;
  sendStat(null); // 記一次造訪，回傳的數字直接顯示在頁尾
}

function runAction(action) {
  lastAction = action;
  const topic = $('topic').value.trim();
  const post = { style: currentStyle, topic, occasion: currentOccasion, length: currentLength };
  const key = [currentStyle, currentOccasion, currentLength].join(':');
  if (action.type === 'quick') {
    render(generateUnique('quick:' + key, () => makePost(false)), { type: 'quick', ...post });
  } else if (action.type === 'fields') {
    render(generateUnique('fields:' + key, () => makePost(true)), { type: 'fields', ...post });
  } else if (action.type === 'reply') {
    render(generateUnique('reply', () => makeReply(action.input)), { type: 'reply' });
  } else if (action.type === 'rewrite') {
    render(generateUnique('rewrite', () => makeRewrite(action.input)), { type: 'rewrite' });
  } else if (action.type === 'checklist') {
    // 同樣輸入應得到同樣的問題清單，故不重骰
    render(makeChecklist(action.input), { type: 'checklist' });
  }
  sendStat(STAT_KIND[action.type]);
}

function setMode(mode) {
  currentMode = mode;
  document.documentElement.setAttribute('data-mode', mode);
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('post-panel').hidden = mode !== 'post';
  $('reply-panel').hidden = mode !== 'reply';
  $('checklist-panel').hidden = mode !== 'checklist';
  $('rewrite-panel').hidden = mode !== 'rewrite';
  $('style-block').hidden = mode !== 'post';
  $('occasion-row').hidden = mode !== 'post';
  $('length-row').hidden = mode !== 'post';
  // 濃度只影響戲仿產出，拆解模式用不到
  $('density-row').hidden = mode === 'checklist';
}

/* 一排可選的按鈕（風格／場合／篇幅共用）；切語言時清空重建 */
function initChips(containerId, keys, nameOf, getCurrent, setCurrent) {
  const box = $(containerId);
  box.innerHTML = '';
  keys.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (key === getCurrent() ? ' active' : '');
    btn.textContent = nameOf(key);
    btn.addEventListener('click', () => {
      setCurrent(key);
      box.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      if (containerId === 'length-tabs') updateLengthHint();
    });
    box.appendChild(btn);
  });
}

function initTabs() {
  initChips('style-tabs', STYLE_ORDER, styleName, () => currentStyle, k => { currentStyle = k; });
  initChips('occasion-tabs', OCCASION_ORDER, occasionName, () => currentOccasion, k => { currentOccasion = k; });
  initChips('length-tabs', LENGTHS, k => t('length.' + k), () => currentLength, k => { currentLength = k; });
  updateLengthHint();
}

function updateLengthHint() {
  $('length-hint').textContent = t('length.hint.' + currentLength);
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

/* 預設明亮版；使用者切換過就記住他的選擇（首次繪製由 index.html 的行內腳本先行套用） */
const THEME_KEY = 'byt_theme_v1';

function initTheme() {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* 隱私模式可能失敗，忽略 */ }
  let d = saved || r.getAttribute('data-theme') || 'light';
  r.setAttribute('data-theme', d);
  const sun = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const updateIcon = () => { t.innerHTML = d === 'dark' ? sun : moon; };
  updateIcon();
  t.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    try { localStorage.setItem(THEME_KEY, d); } catch { /* 隱私模式可能失敗，忽略 */ }
    updateIcon();
  });
}

/* ---------- 首屏：讓產品自己示範 ----------
 * 載入時產一篇順起來版（低濃度＝短而銳利），逐字打出來。
 * 這是全站唯一一個非使用者觸發的動畫，且尊重 prefers-reduced-motion。 */
let heroText = '';
let heroTimer = null;

function heroSpecimen() {
  const prevStyle = currentStyle;
  const slider = $('density');
  const prevDensity = slider.value;
  currentStyle = 'slogan';   // 最具代表性的公式
  slider.value = '0';        // 點到為止：沒有開場白、沒有填充句
  // 首屏要在折線以上講完，太長的模板重抽；抽不到就取最短的那篇
  let best = null;
  for (let i = 0; i < 12; i++) {
    const text = makePost(false, { ignoreTopic: true, length: 'medium', occasion: 'general' }).text;
    const len = text.replace(/\s/g, '').length;
    if (!best || len < best.len) best = { text, len };
    if (len <= 85) break;
  }
  slider.value = prevDensity;
  currentStyle = prevStyle;
  return best.text;
}

function typeHero(text) {
  const box = $('hero-specimen');
  heroText = text;
  clearInterval(heroTimer);
  box.classList.remove('done');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.textContent = text;
    box.classList.add('done');
    return;
  }
  box.textContent = '';
  let i = 0;
  heroTimer = setInterval(() => {
    box.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(heroTimer);
      box.classList.add('done');
    }
  }, 18);
}

function initHero() {
  typeHero(heroSpecimen());

  $('hero-regen').addEventListener('click', () => typeHero(heroSpecimen()));

  // 把剛剛示範的那句話，餵給拆解模式——網站當場拆自己
  $('hero-unpack').addEventListener('click', () => {
    clearInterval(heroTimer);
    $('hero-specimen').textContent = heroText;
    $('hero-specimen').classList.add('done');
    setMode('checklist');
    $('checklist-input').value = heroText;
    $('checklist-warn').hidden = true;
    runAction({ type: 'checklist', input: heroText });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  let saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch { /* 隱私模式可能失敗，忽略 */ }
  // 一律預設中文；使用者按過切換鈕才改，並記住他的選擇
  applyLang(saved || 'zh-TW');
  document.querySelector('[data-lang-toggle]')
    .addEventListener('click', () => applyLang(currentLang === 'zh-TW' ? 'en' : 'zh-TW'));

  initHero();
  initStats();

  document.querySelectorAll('.mode').forEach(b =>
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

  $('btn-checklist').addEventListener('click', () => {
    const input = $('checklist-input').value.trim();
    const warn = $('checklist-warn');
    if (!input) {
      warn.hidden = false;
      $('checklist-input').focus();
      return;
    }
    warn.hidden = true;
    runAction({ type: 'checklist', input });
  });
  $('checklist-input').addEventListener('input', () => { $('checklist-warn').hidden = true; });

  $('btn-rewrite').addEventListener('click', () => {
    const input = $('rewrite-input').value.trim();
    const warn = $('rewrite-warn');
    if (!splitSentences(input).length) {
      warn.hidden = false;
      $('rewrite-input').focus();
      return;
    }
    warn.hidden = true;
    runAction({ type: 'rewrite', input });
  });
  $('rewrite-input').addEventListener('input', () => { $('rewrite-warn').hidden = true; });

  $('btn-again').addEventListener('click', () => { if (lastAction) runAction(lastAction); });
  $('btn-copy').addEventListener('click', e => { if (lastResult) copyText(shareText(lastResult), e.currentTarget); });
  $('btn-share').addEventListener('click', () => {
    if (!lastResult) return;
    const text = lastResult.thread ? lastResult.thread[0].text + '\n' + lastResult.thread[0].tags.join(' ') : shareText(lastResult);
    window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  $('density').addEventListener('input', updateDensityHint);
});
