# Digital Futures Thesis Archive

A browseable archive of OCAD University Digital Futures graduate theses, collated from the [Open Research Repository](https://openresearch.ocadu.ca/view/divisions/sch=5Fgs=5Fdfu/).

Live site (GitHub Pages): `https://digitalfuturesocadu.github.io/thesisArchive/`

## Features

- Browse by project, year, topic, student, faculty advisor, and bibliographies
- Advisor pages include every project where they appear as primary or secondary
- Bibliographies search with most-cited sources and links back to projects
- Live links to Open Research records and PDF downloads

## Annual data refresh

### Manual (local)

Run this after each graduating cohort lands in Open Research (or whenever new DF deposits appear). One command rebuilds the committed site data:

```bash
npm install          # first time / after clone
npm run update:data  # scrape Open Research + rebuild public/data
```

Then:

```bash
npm run dev          # optional spot-check at http://127.0.0.1:5173/thesisArchive/
git add public/data/archive.json public/data/bibliography.json
git commit -m "Refresh archive data from Open Research"
git push             # deploys GitHub Pages from main
```

### Automated (monthly)

A GitHub Action (`.github/workflows/refresh-data.yml`) runs on the **1st of each month** and can also be started manually from the Actions tab (**Refresh archive data** → Run workflow).

- Scrapes and normalizes the same way as `npm run update:data`
- Ignores `generatedAt`-only churn
- Opens a PR only when thesis/advisor/topic/bibliography content actually changed
- Review advisor pages before merging (update `data/advisor-aliases.json` if needed)

### Notes

- Scrapes Digital Futures year exports from `yearStart` through **next calendar year** (missing years are skipped with a warning)
- Writes `public/data/archive.json` and `public/data/bibliography.json` — these are what the live site reads
- `data/raw/` is gitignored; do not commit raw scrapes
- If duplicate advisor pages show up, merge them in [`data/advisor-aliases.json`](data/advisor-aliases.json) and run `npm run normalize` again

## Development

```bash
npm install
npm run update:data   # or skip if public/data/archive.json already exists
npm run dev
```

Open [http://127.0.0.1:5173/thesisArchive/](http://127.0.0.1:5173/thesisArchive/) (Vite `base` matches the GitHub Pages project path).

```bash
npm run build    # production build → dist/
npm run preview  # preview dist locally
```

## Data pipeline

Sources are listed in [`data/sources.json`](data/sources.json) (Digital Futures only for now; more divisions can be added later).

| Script | Command | Purpose |
|--------|---------|---------|
| Update | `npm run update:data` | **Manual refresh** — scrape, normalize, print summary + next steps |
| Change check | `node scripts/has-data-changes.mjs` | Used by CI; ignores `generatedAt`-only diffs |
| Scrape | `npm run scrape` | Fetch year JSON exports into `data/raw/` |
| Normalize | `npm run normalize` | Merge advisors, apply field policy, write `public/data/*.json` |
| Both | `npm run build:data` | Scrape then normalize (no summary banner) |

Pages deploys do **not** hit Open Research; they build from the committed `public/data/` files.

### Advisor name merges

Raw deposits use inconsistent advisor names and emails. Canonical people live in [`data/advisor-aliases.json`](data/advisor-aliases.json).

- Match by email, then by `@ocadu.ca` / `@faculty.ocadu.ca` local-part, then by known name aliases
- Add new `canonical` entries when you spot duplicates on an advisor page

### Field policy

[`data/field-policy.json`](data/field-policy.json) documents which Open Research fields are kept vs ignored; the normalize script reads it as the output contract.

## Deploy

Push to `main`. The existing GitHub Pages workflow installs dependencies, runs `npm run build`, and deploys `dist/`.
