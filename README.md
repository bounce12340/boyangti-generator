# Boyangti Generator 🎤

**繁體中文版 → [README.zh-TW.md](README.zh-TW.md)**

> A parody generator for Taiwanese political-speak. One click produces a complete, ready-to-post
> piece of social media writing that sounds profound and says nothing. Or paste someone's comment
> and get a reply that responds thoroughly without answering anything.

**[Live demo →](https://bounce12340.github.io/boyangti-generator/)**

---

## What is "Boyangti"?

**伯洋體** (*Boyangti*, "the Boyang style") is a nickname coined by Taiwanese internet users during
the 2026 Taipei mayoral race for the speaking style of DPP candidate 沈伯洋 (Shen Bo-yang).

The style is characterized — by the online commentary that named it — as **stating beautiful goals
without stating concrete methods**: abstract nouns chained through layer upon layer of causal
inference, escalating from something small all the way up to democracy, civilization, or "aligning
with the world," and closing with a modest "it really is that simple."

Every link in the chain sounds reasonable. The chain as a whole carries approximately zero
information. That gap is the joke this project automates.

> This generator imitates **sentence structure only**. It makes no factual claims about any real
> person. See [Disclaimer](#disclaimer).

### The classic formula

```
Give 【SUBJECT】 back the 【A】 they have lost
→ with A, 【B】 naturally follows
→ and what B brings is the very foundation of 【C】
→ it really is that simple.
```

### The 2026 formula ("順起來" style)

Derived from the campaign slogan 「台北順起來」 ("let Taipei flow"), announced August 2026:

```
【BLOCKAGE A】 is stuck, 【BLOCKAGE B】 is stuck, everything is stuck
→ Why stuck? Because the junctions are broken
→ Reconnect the broken junctions
→ Connect them, and it flows.
```

---

## Features

| | |
|---|---|
| 📝 **One-click post** | Fill in nothing. Get a 100–300 character post with an opener, a multi-layer causal ladder, a closing line, and hashtags. |
| 💬 **Reply mode** | Paste someone's comment. A hand-rolled CJK tokenizer pulls keywords out of it and folds them into a reply that engages fully and answers nothing. |
| 🎚 **Waffle density** | Three levels — *low* (restrained) / *medium* (pleasantly vacant) / *high* (information content approaching zero) — controlling ladder depth, filler count, and transition phrases. |
| 🧵 **Threads cards** | Output is rendered as mock Threads posts, including a 5-post thread mode. |
| ↗ **Share** | One click opens the Threads composer pre-filled. |
| 🔁 **Reroll · 📋 Copy · 🕘 History** | Reroll with the same settings, copy with a character count, and keep the last 5 results in `localStorage`. |
| 🔧 **Advanced mode** | Supply your own keywords; template selection narrows to the templates that actually use them. |
| 🌐 **EN / 中 interface** | The UI is bilingual and remembers your choice. **Generated output stays in Traditional Chinese** — the corpus is the joke and it doesn't survive translation. |
| 🌙 **Themes · 📱 Responsive** | Dark and light, verified down to 375px. |

### The eight styles

| Style | What it does |
|---|---|
| **基礎版** — Basic | The standard escalating-causal-ladder sentence. |
| **順起來版** — Flow | 2026 campaign vocabulary: everything's stuck → the junctions are broken → reconnect them. Includes the HEART platform and the "warm orange" branding. |
| **學術煙霧彈版** — Academic smokescreen | Jargon bombardment ("third-space perceptual resilience alignment"). Instant gravitas. |
| **反串崇拜版** — Ironic worship | Sustained parody in the voice of an over-devoted follower. The most lethal register. |
| **質詢版** — Interpellation | Chained rhetorical questions at an official. "Minister, is this right?" |
| **危機感版** — Crisis | Escalates any topic to the survival of democracy. |
| **溫情喊話版** — Warmth | Soft, late-night-murmur persuasion aimed at young people and citizens. |
| **Threads 串文版** — Thread | Emits a full 5-post thread with hashtags, drawn from 7 skeletons. |

Corpus size: **173 templates** across 8 styles, **297 vocabulary entries** across 8 word pools,
plus 16 reply templates, 39 filler lines, 35 closers, and 48 hashtags.

---

## Quick start

There is no build step, no package manager, and no dependencies.

```bash
git clone https://github.com/bounce12340/boyangti-generator.git
cd boyangti-generator
python3 -m http.server 8000     # → http://localhost:8000
```

Opening `index.html` directly over `file://` also works — the page uses plain `<script src>` tags,
no ES modules and no `fetch`.

Then: pick a style and a density → hit **📝 Generate a post** → copy, or switch to
**💬 Generate reply** and paste a comment to reply to. The **中 / EN** button in the header switches
the interface language.

---

## Architecture

Six files. `data/corpus.js` (global `CORPUS`) and `data/i18n.js` (global `I18N`) **must** load before `app.js` — `app.js`
contains no content of its own: generated strings come from the corpus, interface strings from the
language pack.

```
index.html          markup + the script tags (load order matters)
style.css           design tokens under :root / [data-theme="dark"]
app.js              generation engine, rendering, storage, theming, language
data/corpus.js      all templates and word pools
data/i18n.js        interface strings, zh-TW + en
data/style-guide.md sourced style analysis + graded URL list
```

The generation pipeline:

```
drawVals()   draw a placeholder value bag from CORPUS.words
pick(pool)   choose a template from CORPUS.styles[style].templates
fill()       substitute {placeholder} tokens                    → body
compose()    opener + body + fillers (+ transitions) + closer, sized by density
drawTags()   hashtags
```

A style is `{ name, templates }` plus three optional flags: `noOpener` (skip the opener),
`closers` (a style-private closer pool), and `threadSets` **instead of** `templates` (5-post thread
sets, a separate branch in `makePost()`). A new style key must also be added to `STYLE_ORDER` in
`app.js` or no tab renders for it.

Generated text is always written with `textContent`, never `innerHTML` — reply mode echoes user
input into the output, so that invariant matters.

Contributor notes live in [`CLAUDE.md`](CLAUDE.md).

---

## Content rules

[`data/style-guide.md`](data/style-guide.md) is the sourced analysis behind the corpus: a typology
of openers, transitions, catchphrases and ladder structures, a full URL list graded
**官方** (official) / **一手** (primary) / **二手** (secondary) / **論壇** (forum), an honest list of
sources that could not be verified, and a list of material that was researched and then
**deliberately excluded**.

Its constraints govern every corpus edit:

- Imitate **speech style only** — no factual allegations, personal attacks, or private-life content
  about any real person.
- Every template carries a provenance comment (`〔原站〕` `〔一手〕` `〔二手〕` `〔論壇〕`).
- Material sourced from a news cycle goes into the style guide *first*, then becomes templates.
  Material that was excluded gets recorded with its reason, so a later pass doesn't rediscover and
  add it.

---

## Tech notes

- Pure static HTML / CSS / JavaScript. No backend, no build tooling, no API keys, no dependencies.
- Font: [Satoshi](https://www.fontshare.com/fonts/satoshi) via the Fontshare CDN — the only external
  request the page makes. It degrades to `PingFang TC` / `Microsoft JhengHei` if blocked.
- Deployed to GitHub Pages from `main`.
- Verification is manual: exercise each style × each density × both modes, in dark and light, at
  375px width.

---

## Disclaimer

This site is a **parody / satire** created for entertainment and media-literacy purposes. All output
is assembled at random from sentence templates. **It is not the speech of 沈伯洋 (Shen Bo-yang), and
does not represent his positions.** The project imitates a rhetorical style discussed in public
commentary; it does not make, and must not be read as making, factual claims about any real person.

The interface is available in English and Traditional Chinese. All *generated* content is Traditional
Chinese (zh-TW) regardless of interface language.

---

## License

MIT

---

<p align="center">伯洋體感知生態系已完成對齊 · 就是那麼簡單的道理而已</p>
