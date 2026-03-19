# Who Funds Maxine Dexter? (2023-2026)

Production-ready, Maxine-specific investigative journalism site built with:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- D3 force layout for network rendering

The only non-Maxine-focused route is:
- `/maxines-2026-primary-opponent` (Jessica page)

## Core Architecture

### Data folders

```text
/data
  /maxine
    donors.json
    pacs.json
    transactions.json
    expenditures.json
    media.json
    receipts.json
    documents.json
    config.json
  /jessica
    donors.json
    pacs.json
    transactions.json
    expenditures.json
    media.json
    receipts.json
    documents.json
    config.json
```

### Global year filter
- Built into top navigation.
- Options: `All Years`, `2023`, `2024`, `2025`, `2026`.
- Filters are applied in the data processing layer before rendering.
- All stats, charts, tables, and networks update by year.

### Evidence system
- Click donors, PACs, links, edges, rows, media items, and documents.
- Right-side evidence drawer shows:
  - entity type
  - reason included
  - amount/date
  - committee/contributor/recipient
  - match confidence
  - receipt IDs
  - filing/source links

## Routes

- `/` Home (Maxine-specific)
- `/direct-donors`
- `/outside-spending`
- `/aipac-network`
- `/bundling`
- `/media`
- `/documents`
- `/methodology`
- `/maxines-2026-primary-opponent`
- `/admin` (data upload)

API:
- `GET /api/data?candidate=maxine|jessica&year=all|2023|2024|2025|2026`
- `POST /api/upload`

## Run locally

```bash
cd "/Volumes/LIttle Guy/LAST RIDE MAXINE"
npm install
npm run dev -- -H 127.0.0.1 -p 3051
```

Open:
- [http://127.0.0.1:3051](http://127.0.0.1:3051)

## Deploy to Netlify

This repo is now Netlify-ready.

1. Push this project to GitHub/GitLab/Bitbucket.
2. In Netlify, create a new site from that repo.
3. Netlify will use:
   - build command: `npm run build`
   - Next.js runtime plugin from `netlify.toml`
4. Deploy.

Important:
- `data/**` is explicitly included for server-side data loading.
- Runtime uploads are disabled on Netlify (filesystem is read-only).
- To update data in production, replace files in `data/maxine` or `data/jessica`, commit, and redeploy.

## Replace or upload data

### Option A: Replace JSON directly
1. Replace files in `data/maxine` or `data/jessica`.
2. Keep the same field names used by the seed files.
3. Refresh the app.

### Option B: Upload through admin
1. Open `/admin`.
2. Choose candidate (`maxine` or `jessica`).
3. Choose dataset (`donors`, `pacs`, etc.).
4. Upload `.json` or `.csv`.
5. API writes normalized output to `data/<candidate>/<dataset>.json`.

### OR-03 handoff ingestion (your current flow)

If you place the split handoff at:

- `data/Maxine data/or03_site_handoff`

run:

```bash
node scripts/ingest-or03-handoff.mjs
```

This generates:

- `data/maxine/*.json`
- `data/jessica/*.json`

with normalized dates, PAC tagging, transactions, expenditures, receipts, and documents.

## Notes on matching + overlap

AIPAC overlap uses rule-based matching:
1. exact normalized name
2. normalized name key + ZIP
3. normalized name key + employer
4. fuzzy match as secondary support

Labels: `exact`, `probable`, `possible`, `none`.

## Legal/Editorial framing

- Public data only
- No claim of wrongdoing
- Independent analysis
- Network relationships do not necessarily imply direct transfer or coordination
- Bundling analysis may reflect patterns unless official bundler disclosures are explicitly sourced

## Footer text

The site includes:

> Data sourced from the Federal Election Commission (FEC). This site is not affiliated with or endorsed by the FEC.

And a note that it was built independently using personal time/resources.
