# ACE Trainer

A clean, **mobile-first study hub** for the ACE certification, delivered as a
single self-contained HTML file. Everything lives in `index.html` — no build
step, no dependencies, no external requests — so it's trivial to host or embed.

## What it does

A single screen with a fixed bottom tab bar (thumb-reachable) and five modes:

| Tab | What's there |
|-----|--------------|
| **Sections** | Collapsible accordion cards — a section breakdown per exam domain plus a `gcloud` cheat sheet. Tap to expand; everything else stays tucked away. |
| **Practice** | Timed and untimed practice exams with instant explanations, per-domain scoring, and full answer review. |
| **Flashcards** | Tap-to-flip cards for active recall, filterable by domain, with shuffle. |
| **Videos** | Tappable resource cards (data-driven — add your own). |
| **Audio** | Audio-guide cards for review on the go (data-driven — add your own). |

Also: light/dark theme toggle (remembers your choice), `#hash` deep links to
each tab, and no horizontal scroll on phones.

## Run / view locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Because it's one self-contained file, you can also just open `index.html`
directly in a browser, or drop it into any host (GitHub Pages, an `<iframe>`,
a WebView, etc.).

## Editing the content

All content is data-driven inside the `<script>` in `index.html`:

- **`SECTIONS`** — the accordion section breakdowns (title, summary, HTML body).
- **`EXAMS` / `DOMAINS`** — the practice question bank. Each question:
  `{ id, domain, type: "single"|"multi", text, options, answer, explanation }`.
- **`CARDS`** — flashcards: `{ d: domain, q: front, a: back }`.
- **`VIDEOS` / `AUDIO`** — resource lists: `{ title, by, dur, url }`.
  Leave a list empty (`[]`) to show a friendly empty state.

Swap those objects to retarget the guide to a different certification without
touching any layout or logic.

## Disclaimer

Independent study aid. Not affiliated with or endorsed by any certification
body. Confirm current exam objectives with the official source.
