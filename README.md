# DevQuiz — Full Stack MCQ App

## How to run

Because the app loads `.json` files via `fetch()`, you need a local HTTP server
(browsers block `fetch` on bare `file://` URLs).

**Quickest options:**

```bash
# Python (from inside the quiz_app folder)
python -m http.server 8080

# Node (npx, no install needed)
npx serve .
```

Then open http://localhost:8080 in your browser.

## Contents

| File | Description |
|------|-------------|
| `index.html` | Single-page quiz app |
| `app.js` | All quiz logic (exam mode, practice mode, scoring) |
| `manifest.json` | Index of all sets |
| `set_1.json` … `set_11.json` | 120 questions each (last set = 115) |
| `needs_review.md` | Questions flagged during extraction |

## Stats
- **1315** unique questions
- **0** exact duplicates removed
- **14** wrong answers corrected (flagged with `"corrected": true`)
- **113** same-concept variant groups (different phrasings of same topic — all kept)
- **11** sets of 120 questions (mixed topics in every set)

## Topics
| Topic | Count |
|-------|-------|
| Java OOP | 929 |
| JavaScript | 205 |
| HTML/CSS | 123 |
| Concurrency | 58 |

## Features
- **Exam Mode** — pick a set, get shuffled questions, immediate per-question feedback + explanation, final score summary
- **Practice Mode** — set topic percentages (e.g. 30% Java, 40% JS, 20% HTML, 10% Concurrency), total question count, and source set; custom drill is built from those constraints
- Retry any session with a fresh shuffle
- Per-topic score breakdown on summary screen
- Dark theme, mobile-friendly
