# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

「伯洋體產生器」— a zero-dependency static web toy that assembles parody Taiwanese political-speak posts and replies from sentence templates. Deployed to GitHub Pages from `main` (https://bounce12340.github.io/boyangti-generator/).

## Commands

There is no build step, package manager, test suite, or linter — the site is plain HTML/CSS/JS loaded via `<script src>` tags.

```bash
# Preview locally (or just open index.html directly — file:// works, no modules/fetch)
python3 -m http.server 8000
```

Verification is manual: open the page, exercise each style tab × each density setting × both modes, and check dark/light and 375px width.

## Architecture

Six files, one hard dependency edge: `data/corpus.js` (global `CORPUS`), `data/i18n.js` (global `I18N`) and `data/checklist.js` (global `CHECKLIST`) **must** load before `app.js` (see the script tags at the bottom of `index.html`). `app.js` contains no content — generated strings come from `CORPUS`, interface strings from `I18N`, unpack-mode questions from `CHECKLIST`.

There are three modes: `post` and `reply` produce parody, `checklist` does the opposite — it takes a slogan apart. See [Unpack mode](#unpack-mode-datachecklistjs).

### Generation pipeline (`app.js`)

```
drawVals()   → build a placeholder value bag by drawing from CORPUS.words
pick(pool)   → choose one template from CORPUS.styles[currentStyle].templates
fill()       → substitute {placeholder} tokens into the template  → "body"
compose()    → opener + body + fillers (+ transitions) + closer, sized by density
drawTags()   → hashtags
```

- **Density** (slider `0|1|2`) is the main knob: it controls opener probability, filler count (`0 / 1 / 3–4`), whether transition phrases are prepended to fillers, and trailing emoji.
- **`generateUnique(key, makeFn)`** retries up to 15 times so consecutive clicks don't repeat; `recentOutputs` is keyed by action + style.
- **Quick-post length guard**: at density ≥ 1 a non-field post is padded with extra fillers until it reaches 100 non-whitespace chars (max 4 extra).
- **Field-aware template selection**: when the advanced fields are filled, the template pool is narrowed to those referencing the *most* filled placeholders, so the user's words actually appear in the output.

### Reply mode

`extractKeywords()` is a hand-rolled CJK tokenizer — it splits Chinese runs on a stop-character class, keeps segments ≥ 2 chars (capped at 6), sorts longest-first, drops fragments contained in longer keeps, then samples up to 3. The results bind `{keyword}` / `{keyword2}` into `CORPUS.replies` templates. Reply mode always passes `noOpener: true`.

### Placeholder contract

`{subject} {a} {a2} {b} {b2} {c} {c2} {buzzword} {buzzword2} {jargon} {jargon2} {jargon3} {topic} {stuck} {stuck2} {keyword} {keyword2}`

`fill()` leaves unknown tokens verbatim, so a typo'd placeholder ships to the user as literal `{foo}`. `drawVals()` uses `pickN` for the paired/tripled slots — the `a`/`b`/`c`/`buzzwords`/`stuck` pools need ≥ 2 entries and `jargon` needs ≥ 3, or `undefined` leaks into output.

`{stuck}`/`{stuck2}` (the 卡點 pool, drawn from 順起來版's "什麼都卡" framing) has no matching advanced-mode input field — it is random-only.

### Adding or changing a style

Each entry in `CORPUS.styles` is `{ name, templates }` plus three optional flags:
- `noOpener: true` — skip the post-style opener (used by 質詢版, which starts mid-interpellation).
- `closers` — a style-private closer pool that replaces `CORPUS.closers` for that style (used by 順起來版 so the campaign slogan lands in every post). Reply mode always uses the global pool.
- `threadSets` **instead of** `templates` — an array of 5-post sets, each post `{ text, tags }`. This is a separate branch in `makePost()` and returns `{ thread: [...] }`, which changes rendering, `shareText()`, and the share intent.

A new style key must also be added to `STYLE_ORDER` in `app.js` or no tab is rendered for it.

### Unpack mode (`data/checklist.js`)

The media-literacy half of the site: paste a slogan, get the accountability questions it dodges. **`data/checklist.js` is not parody content** — it carries no `〔一手〕`-style provenance comments and is *not* governed by the `style-guide.md` content rules below.

One rule governs it instead: **generate questions and report what is literally in the text; never generate answers.** Any "what this really means" inference would just be a second layer of waffle, which is the thing the site exists to mock. Keep it that way.

Three pieces, all mechanical:
- **`detectors`** — regexes for concrete elements (numbers, money, dates, agencies, legal instruments, metrics). Pure string matching, no semantics. A group whose detector fires is marked `answered` and dimmed, because that facet is no longer being dodged.
- **`ladder`** — the five rungs of a policy logic model (投入/活動/產出/成果/影響) matched by keyword. The impact rung additionally folds in `CORPUS.words.c` and `.a`: the same vocabulary that drives the generator doubles as the detector for what it parodies. Rendered even when nothing matches — "landed on no rung at all" is the most informative result, so don't hide it.
- **`groups`** — seven question sets (who / cost / when / metric / authority / trade-off / risk), each with a `{keyword}` slot filled from `extractKeywords()`, falling back to a generic phrase when nothing extracts.

Output is deterministic — same input, same questions — so `runAction` skips `generateUnique` and `render()` hides the reroll button. `checklistCard()` builds DOM with `textContent` throughout; it echoes user input, so keep it that way.

### Interface language (`data/i18n.js`)

The UI chrome is bilingual (`zh-TW` / `en`); **generated output is always Traditional Chinese** and must stay that way — the corpus is the joke, and it does not survive translation. English mode says so via the `note.zhOnly` line under the hero.

`applyLang(lang)` walks four attribute contracts in `index.html` and rewrites everything in place:

| Attribute | Applied to |
|---|---|
| `data-i18n` | `textContent` |
| `data-i18n-html` | `innerHTML` — **authored strings in `I18N` only**, never user input |
| `data-i18n-ph` | `placeholder` |
| `data-i18n-aria` / `data-i18n-content` | `aria-label` / `content` |

It then rebuilds the style tabs (`initTabs()` clears and re-renders, so it is safe to call repeatedly), the density hint, the history list, and the output label. Adding a UI string means adding the key to **both** language packs and tagging the element — a missing key falls back to `zh-TW`, then to the key name.

Anything rendered from JS rather than markup (style tab names, output labels, thread counters, the copy-button confirmation, card chrome) goes through `t(key, vars)` / `styleName(key)`. English style names live in `I18N.en.styles`, keyed by style key; `zh-TW` has `styles: null` and falls back to `CORPUS.styles[key].name`.

Language choice persists in `localStorage` under `byt_lang_v1`. With nothing stored the interface starts in `zh-TW` regardless of browser locale — English is opt-in via the toggle.

`render()` stores a `{type, style}` label object rather than a formatted string, so the output header can be re-rendered on a language switch. History entries from 2.0 stored a plain string; `labelText()` passes those through unchanged.

### Rendering, storage, theming

- `threadsCard()` builds DOM nodes and sets generated text via `textContent`, never `innerHTML` — reply mode echoes user input into the output, so keep it that way. `innerHTML` is only used for static markup (avatar/footer chrome, theme icons).
- History: `localStorage` key `byt_history_v1`, last 5 entries, reads and writes both wrapped in try/catch (private mode fails silently).
- Theme: `data-theme` attribute on `<html>` (`light` is the default in the markup) persisted under `byt_theme_v1`. An inline script in `<head>` re-applies the stored value before first paint — it hardcodes the same key, so changing `THEME_KEY` means changing both. All colors are CSS custom properties defined once under `:root, [data-theme="light"]` and overridden under `[data-theme="dark"]`. Style with the existing `--color-*`, `--space-*`, `--text-*` tokens rather than hard-coded values.

## Content rules for corpus edits

`data/style-guide.md` is the sourced analysis behind the corpus, including a full URL list graded 官方 / 一手 / 二手 / 論壇 and an honest list of unverified items. Its constraints govern `data/corpus.js`:

- Imitate **speech style only**. No factual allegations, personal attacks, or private-life content about any real person.
- When adding material from a fresh news cycle, write the analysis into `style-guide.md` *first* (a numbered section plus a source-list category), then derive templates from it. §9.6 is the precedent for the other half of that job: material that was researched and then **deliberately excluded** gets listed with the reason, so a later pass doesn't "rediscover" it and add it.
- Every new template keeps a trailing provenance comment — `〔原站〕`, `〔一手〕`, `〔二手〕`, or `〔論壇〕` — matching the existing entries.
- The parody disclaimer in the `index.html` footer and in the README must stay.

## Conventions

The site UI, all corpus content, code comments, and commit messages are Traditional Chinese (zh-TW); commits use an emoji prefix (`✨ 2.0 改版：…`, `📚 建立語料資料庫：…`).

**The README is the exception**: `README.md` is English and is the primary version; `README.zh-TW.md` mirrors it in zh-TW. The two are cross-linked at the top and must be kept in sync — a change to features, style count, or corpus numbers belongs in both. Do not "fix" `README.md` back to Chinese.
