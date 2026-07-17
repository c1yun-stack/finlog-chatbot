# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

핀로그(FinLog) — a Korean-language finance-learning chatbot built as a single self-contained
`index.html` file (~590KB, no build step, no framework). It answers questions about Korean
capital-market terms, current financial issues, and interview tips via simple client-side
keyword/fuzzy matching — there is no LLM or backend call involved in answering questions.

## Commands

There is no build, lint, or test tooling in this repo (no bundler, no test framework, no
package.json scripts beyond `start`).

- **Run locally (no server needed):** open `index.html` directly in a browser.
- **Run via Node/Express static server** (mirrors production deploy target):
  ```bash
  npm install   # installs express (first time only)
  npm start     # serves on http://localhost:3000 (server.js)
  ```
- **Deploy:** static hosting (Netlify/Vercel/GitHub Pages) just needs to publish the repo root
  (`netlify.toml` sets `publish = "."`, `_redirects` rewrites everything to `/index.html`). A
  Node host (Render/Railway) can instead run `npm start`, which serves the same static files via
  `server.js`.

There is no automated verification in this repo. After editing `index.html`, manually open it in
a browser and exercise the chat flow (see "Manual testing" below).

## Architecture

Everything — HTML shell, CSS, data, and application logic — lives in `index.html`. `server.js` is
a thin Express static-file server used only for the "real server" deploy option; it has no routes
or logic relevant to the chatbot itself. There is no separate frontend/backend split, no API, and
no client-side framework (vanilla DOM APIs only).

### `index.html` layout (single `<script>` block starting ~line 119)

1. **Data (all inline JS literals, one array per line near the top of the script):**
   - `KB` — the knowledge base: 108 term entries, each with `id`, `term`, `category`, `keywords`,
     `short`, `detail`, `example`, and optionally `issues` (pros/cons list), `conclusion`,
     `interview_tip`, `faqs` (per-term FAQ chips), `weeks` (curriculum week label), and
     `topic: true` for the curated "학습주제" (learning topic) subset.
   - `TOPICS = KB.filter(e => e.topic)` — the 21 featured learning-topic entries, derived from `KB`.
   - `FAQS` — 63 standalone Q&A pairs (`q`, `a`, `term`, `weeks`, `cat`), matched independently of `KB`.
   - `CATS = [...new Set(KB.map(e => e.category))]` — category list, derived from `KB`, drives the
     quick-access category chips and the "browse all terms" accordion.
   - `IMG` — base64 data-URI images for the two mascot characters (오르소 "Oreuso"/bull,
     고마 "Goma"/bear), used as chat avatars.

   **To add/edit a term, topic, or FAQ, edit these literals directly** — there is no separate data
   file or generation script (the README notes the original generator script is not in this repo;
   ask the maintainer for it if regenerating from scratch).

2. **Matching/search pipeline** (`norm`, `toks`, `scoreEntry`, `search`, `lev`, `suggest`,
   `searchFAQ`, `relatedByCat`):
   - `norm()` strips whitespace/punctuation and lowercases for loose matching; `toks()` tokenizes a
     query into meaningful words, filtering out a Korean stopword list (`STOP`, particles/fillers
     like 은/는/이/가/뭐야/알려줘).
   - `scoreEntry()` scores a `KB` entry against a query using weighted heuristics: exact term match
     scores highest (120), keyword matches next (90/34/16), then token-substring hits in
     term/keywords/short/detail. `search()` runs this over all of `KB` and sorts by score.
   - `lev()` (Levenshtein distance) + `suggest()` provide typo correction: if nothing scores above
     threshold, look for a `KB` term/keyword within edit-distance 1 of the query.
   - `searchFAQ()` runs an analogous scoring pass over `FAQS`; a FAQ match wins over a `KB` match
     only if it scores at least 80% as high as the best `KB` score **and** the `KB` score is below
     90 (i.e., FAQ answers are preferred for question-shaped queries unless there's a strong direct
     term hit) — see the ordering logic in `answer()`.
   - `relatedByCat()` finds up to 3 related `KB` entries by shared category/keywords, used for the
     "함께 보면 좋은 용어" (related terms) chips.

3. **Response orchestration** — `answer(q)` is the single dispatcher, checked in this priority
   order: forced FAQ (`FORCE_FAQ`, set when a user clicks a FAQ chip) → exact category name match
   → FAQ vs. KB scoring comparison (above) → best `KB` result if score ≥ 50 → typo suggestion via
   `suggest()` → fallback "not learned yet" message with category chips. A `FOREIGN` keyword list
   (미국/해외/글로벌/...) triggers a disclaimer that the bot focuses on domestic (Korean) markets.
   `ask(q)` is the entry point from UI events: it appends the user bubble, shows a typing indicator,
   then calls `answer()` after a fixed `setTimeout` delay (simulated latency, not a real async call).

4. **Rendering helpers** (`renderEntry`, `highlight`, `faqChips`, `relatedChips`, `sameTopicChips`,
   `catChips`, `allTermsBrowse`, `el`, `botWrap`, `addUser`) — build DOM nodes directly via
   `document.createElement`/`innerHTML` (via the `el()` helper). `highlight()` wraps matched query
   tokens in `<span class="hl">`. All user-supplied and data text is passed through `escapeHtml()`
   before insertion as HTML — preserve this when adding new render paths to avoid XSS, since query
   text and KB/FAQ content are interpolated into `innerHTML`.

5. **Bootstrapping (IIFEs at the bottom of the script):** builds the quick-access chip bar (학습주제
   / 전체 용어 / category chips), sets the header avatar, and renders the welcome message including
   a deterministic "오늘의 용어" (term of the day) picked via `KB[new Date().getDate() % KB.length]`.

### Conventions specific to this codebase

- **Everything is inline, on purpose** — the whole point of this project is a single portable file
  (see README: "더블클릭만 해도 작동"). Do not split `index.html` into separate JS/CSS/data files
  or introduce a build step unless explicitly asked; that would break the "one file, no install"
  deployment model this repo is built around.
- **Data literals are minified onto single lines** — `KB`, `FAQS`, `IMG`, `CATS`, `TOPICS` are each
  one extremely long line. When editing entries, use targeted string/JSON edits rather than
  reading/rewriting the whole line, and avoid introducing line breaks inside these arrays unless
  intentionally reformatting (which will produce a large diff).
- **Korean text throughout** — UI strings, commit messages, and data are in Korean. Match the
  existing tone/register when adding terms, FAQs, or UI copy.
- **Commit message style** is Korean, prefixed with a category tag before a colon, e.g.
  `기능: ...` (feature), `수정: ...` (fix), `정정: ...` (correction), `보완: ...` (refinement),
  `개선: ...` (improvement), `최적화: ...` (optimization), `업그레이드: ...` (upgrade). Follow this
  pattern for new commits.
- **No secrets/env config** — this app has no backend logic, API keys, or environment variables;
  `.gitignore` covers `.env` defensively but none is currently used.

### Manual testing

Since there's no test suite, verify changes by opening `index.html` (or `npm start` +
`localhost:3000`) and checking:
- A known term query (e.g. "공매도가 뭐야?") returns the right `KB` entry.
- A FAQ-shaped question returns the FAQ answer, not just the raw term definition.
- A near-miss typo (edit distance 1) triggers the "혹시 ... 찾으셨나요?" suggestion.
- Category chips, "전체 용어" browse, and "핀로그 학습주제" chips still populate and are clickable.
- No unescaped HTML renders from user input (test with a query containing `<`/`>`).
