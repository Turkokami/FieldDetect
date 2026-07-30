# ACE Trainer — Google Cloud Associate Cloud Engineer Prep

A free, self-contained **static training website** for people studying for the
**Google Cloud Associate Cloud Engineer (ACE)** certification. It includes a
domain-by-domain study guide and multiple timed practice exams with instant
explanations — built in the style of the official ACE sample exam.

## What's inside

| Page | Purpose |
|------|---------|
| `index.html` | Landing page: exam-at-a-glance, the five domains, how to study |
| `study-guide.html` | Full study guide — service decision tables, `gcloud` cheat sheet, exam tips |
| `practice.html` | Interactive quiz engine — pick an exam, answer, get scored |
| `data/questions.js` | The question bank (3 exams, 76 questions, single & multi-select) |
| `js/quiz.js` | Vanilla-JS quiz engine (timer, scoring, per-domain breakdown, review) |
| `css/style.css` | Styles (responsive, light/dark aware) |

## Features

- **3 practice exams** covering all five exam domains, each question tagged by domain.
- **Two modes:** *timed exam* (simulates the real thing) and *untimed practice*
  (check each answer immediately and read the explanation).
- **Instant explanations** for every question — right and wrong.
- **Per-domain score breakdown** on the results screen so you know what to review.
- **Answer review** listing every question with your answer vs. the correct one.
- **Question shuffling** each attempt, deep-link support (`practice.html?exam=exam-2&mode=practice`).
- No build step, no dependencies, no tracking — just open the files.

## Run locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy (GitHub Pages)

Because it's a plain static site, you can host it free on GitHub Pages:

1. Push this branch and merge to your default branch.
2. In the repo, go to **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, pick the branch and `/root`.
4. Your site will be served at `https://<user>.github.io/<repo>/`.

## Adding more questions

Open `data/questions.js` and add question objects to an exam's `questions` array
(or add a whole new exam to `EXAMS`). Each question looks like:

```js
{
  id: "e1q1",          // unique
  domain: 3,           // 1..5, maps to DOMAINS
  type: "single",      // "single" | "multi"
  text: "…",
  options: ["…", "…"], // no letter prefixes
  answer: 2,           // index (single) or [i, j] (multi)
  explanation: "…",
}
```

Run a quick integrity check with Node:

```bash
node -e 'const {EXAMS}=require("./data/questions.js");console.log(EXAMS.reduce((n,e)=>n+e.questions.length,0),"questions")'
```

## Disclaimer

This is an independent study aid and is **not affiliated with or endorsed by
Google**. Certification objectives change over time — always confirm the current
exam guide on the
[official certification page](https://cloud.google.com/learn/certification/cloud-engineer).
