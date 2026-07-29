# Digital Futures Thesis Archive

A browseable archive of OCAD University Digital Futures graduate theses, collated from the [Open Research Repository](https://openresearch.ocadu.ca/view/divisions/sch=5Fgs=5Fdfu/).

Live site (GitHub Pages): `https://digitalfuturesocadu.github.io/thesisArchive/`

## Features

- Browse by project, year, topic, student, faculty advisor, and bibliography
- Advisor pages include every project where they appear as primary or secondary
- Bibliography search with most-cited sources and links back to projects
- Live links to Open Research records and PDF downloads

## Development

```bash
npm install
npm run build:data   # scrape + normalize (optional if public/data/archive.json exists)
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
| Scrape | `npm run scrape` | Fetch year JSON exports into `data/raw/` |
| Normalize | `npm run normalize` | Merge advisors, apply field policy, write `public/data/archive.json` + `bibliography.json` |
| Both | `npm run build:data` | Scrape then normalize |

`data/raw/` is gitignored. Commit the generated `public/data/archive.json` so Pages deploys do not need to hit Open Research at build time.

### Advisor name merges

Raw deposits use inconsistent advisor names and emails. Canonical people live in [`data/advisor-aliases.json`](data/advisor-aliases.json).

- Match by email, then by `@ocadu.ca` / `@faculty.ocadu.ca` local-part, then by known name aliases
- Add new `canonical` entries when you spot duplicates on an advisor page

### Field policy

[`data/field-policy.json`](data/field-policy.json) documents which Open Research fields are kept vs ignored; the normalize script reads it as the output contract.

## Deploy

Push to `main`. The existing GitHub Pages workflow installs dependencies, runs `npm run build`, and deploys `dist/`.
