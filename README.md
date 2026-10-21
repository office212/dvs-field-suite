# DVS Field Suite

Field command suite for **Dryer Vent Services**: client intake, anemometer
airflow diagnostics (CFM / MPH / km/h / FPM on a 4 in duct), equivalent duct
length checked against the dryer maker's limit (set per job), hazard and work checklists, photo evidence (vent +
meter, before/after), client signature, pricing with $ or % discount, tax and deposit, a
printable service certificate, and one-tap customer messages for WhatsApp
Business, SMS, Housecall Pro, and a next-day Google review ask.

- **Fully offline**: all data lives on the device (IndexedDB). After the first
  visit the installed PWA works with no connection at all.
- **No accounts, no backend**: a plain static site. Job numbers are sequential
  (DVS-1001, DVS-1002, ...). Backup export/import is a single JSON file.
- **Languages**: interface in English or Hebrew (RTL); customer messages in
  English, Spanish, or Hebrew.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript check
npm run build      # static build into dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site
and publishes `dist/` to GitHub Pages. The build uses relative asset paths, so
it works unchanged from a project subpath
(`https://office212.github.io/dvs-field-suite/`) or a custom domain root.

In the repo settings, set **Settings → Pages → Source** to **GitHub Actions**
once, before the first deploy.

## Layout

- `src/lib/dvs/` — domain logic: `types`, `calc` (airflow math, pricing),
  `content` (catalog, hazards, actions), `i18n` (en/he/es copy), `report`
  (customer message, follow-up, Housecall Pro note), `share`, `photos`
  (compression), `store` (zustand state), `idb` (IndexedDB persistence).
- `src/components/dvs/` — screens and panels, certificate, signature pad.
- `src/App.tsx` — app shell (header, navigation, dialogs).
- `public/` — PWA manifest, service worker, icons.
