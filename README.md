# Digital Futures Thesis Archive

A browseable archive of OCAD University Digital Futures graduate theses, collated from the [Open Research Repository](https://openresearch.ocadu.ca/view/divisions/sch=5Fgs=5Fdfu/).

Live site (GitHub Pages): `https://digitalfuturesocadu.github.io/thesisArchive/`

## Features

- Browse by project, year, topic, student, faculty advisor, and bibliographies
- Advisor pages include every project where they appear as primary or secondary
- Media page: every deposited image and video poster in one continuous grid, by year and project
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
git add public/data/archive.json public/data/bibliography.json public/data/project-images.json
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
- Writes `public/data/archive.json`, `public/data/bibliography.json`, and `public/data/project-images.json` — these are what the live site reads
- `data/raw/` is gitignored; do not commit raw scrapes
- If duplicate advisor pages show up, merge them in [`data/advisor-aliases.json`](data/advisor-aliases.json) and run `npm run normalize` again
- If a non-Digital-Futures thesis appears, add it to [`data/excluded-theses.json`](data/excluded-theses.json) and run `npm run normalize` again

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
| Update | `npm run update:data` | **Manual refresh** — scrape, faculty directory, normalize, summary |
| Change check | `node scripts/has-data-changes.mjs` | Used by CI; ignores `generatedAt`-only diffs |
| Scrape | `npm run scrape` | Fetch year JSON exports into `data/raw/` |
| Faculty | `npm run fetch:faculty` | Fetch OCAD Explore Faculty bios into `data/faculty-directory.json` |
| Normalize | `npm run normalize` | Merge advisors, apply field policy, write `public/data/*.json` |
| Both | `npm run build:data` | Scrape then normalize (no summary banner) |

Pages deploys do **not** hit Open Research; they build from the committed `public/data/` files.

### Advisor name merges

Raw deposits use inconsistent advisor names and emails. Canonical people live in [`data/advisor-aliases.json`](data/advisor-aliases.json).

- Match by email, then by `@ocadu.ca` / `@faculty.ocadu.ca` local-part, then by known name aliases
- Add new `canonical` entries when you spot duplicates on an advisor page

### Advisor committee overrides

Some deposits list extra committee members or wrong roles. Corrected committees live in [`data/advisor-committees.json`](data/advisor-committees.json) (applied during normalize). Remaining multi-advisor oddities to revisit: [`data/advisor-committee-review.json`](data/advisor-committee-review.json).

Overrides replace the deposit's advisor list entirely — only the advisors you list are kept, with the roles you give them.

### Program director role (`pd`)

Deposits carry the graduate program director as an advisor with role `pd`. That is an administrative signoff, not thesis supervision, so normalize drops these rows: no project credit, no advisor-page listing.

The filter runs **after** committee overrides, so an explicit entry in `data/advisor-committees.json` can still promote a `pd` person to a real committee role when they genuinely served on that thesis. Do not reorder these two steps.

### Excluded theses

Some deposits are cross-listed into the Digital Futures division but belong to another program, so the scraper picks them up. List them in [`data/excluded-theses.json`](data/excluded-theses.json) with a note explaining why.

Excluded deposits are skipped before normalizing — no project page, no advisor credit, no citations, no images. Normalize warns if a listed id stops appearing in the scrapes so stale entries surface instead of rotting.

Exclude by eprint id rather than by department: the department field has typo variants in the source data (`Digial Futures`, `Digital Future`) and is not safe to filter on.

### Advisor page groupings

[`data/df-faculty.json`](data/df-faculty.json) lists Current / Previous Digital Futures faculty and OCADU Administration. Remaining advisors are grouped by OCAD faculty from [`data/faculty-directory.json`](data/faculty-directory.json), with manual placements in [`data/faculty-overrides.json`](data/faculty-overrides.json).

### Project media

`public/data/project-images.json` backs the Media page. It collects deposited images, poster frames for deposited videos, and YouTube posters from related links (Vimeo has no static poster without an API call).

Open Research generates thumbnails for only about half the deposited videos, and a few image thumbnails 404, with nothing in the record to say which. So **normalize probes every Open Research thumbnail URL and keeps only the ones that resolve** — that is the one step in normalize that needs network access. If the server is unreachable it keeps all candidates unverified and warns; the site hides anything that still fails to load.

This means `npm run normalize` takes a few seconds longer than it used to, and the item counts on the Media page are true counts rather than claims.

#### Title cards and text-only frames

Open Research takes a video's poster from its opening frame, which is often a title card or a page of writing — a tile with no image in it. Those are listed in [`data/excluded-media.json`](data/excluded-media.json) by eprint id and filename.

This list is curated by eye rather than detected, because pixel statistics cannot tell a title card from minimal work: eprint 5121's `AWORM` card and eprint 214's point-cloud form differ by less than 1% on every histogram measure, as do eprint 746's title card and eprint 221's photograph on a white background. Anything automatic deletes real work.

After a data refresh, scan the Media page and add any tile that is only text. Normalize warns about entries whose file is no longer deposited.

### Field policy

[`data/field-policy.json`](data/field-policy.json) documents which Open Research fields are kept vs ignored; the normalize script reads it as the output contract.

## Deploy

Push to `main`. The existing GitHub Pages workflow installs dependencies, runs `npm run build`, and deploys `dist/`.
