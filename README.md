# Romanian Mortgage Repayment Comparator

Static web app comparing Romanian mortgage strategies: shorter term vs longer term with equal monthly outflow via extra payments, plus investment break-even analysis.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ (includes `npm`).

```bash
cd c:\_repositories\personal\loan-repayments
npm install
npm run dev
```

Vite opens **http://localhost:5173/loan-repayments/** (the `/loan-repayments/` path is required — same as GitHub Pages).

To match production locally after a build:

```bash
npm run build && npm run preview
```

Then open **http://localhost:4173/loan-repayments/** (not the server root).

Use **https://cozminv.github.io/loan-repayments** (with or without trailing slash). If styles look missing, hard-refresh once (Ctrl+Shift+R).

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run unit tests |

To stop the dev server: `Ctrl+C` in the terminal.

## Using the app

1. Pick a **preset** (optional) and click **Aplică preset** — or edit every field yourself.
2. Enter your real offer values: sumă, IRCC, marjă, termen scurt/lung, etc.
3. Click **Calculează** to compare scenarios and see invest vs prepay.
4. **Salvează parametrii** stores your inputs in the browser for next time.

Presets are starting points only; nothing is locked after you apply one.

## GitHub Pages

Live URL (after deploy): **https://cozminv.github.io/loan-repayments/**

### One-time setup (fixes deploy 404)

The `deploy-pages` action returns **404 / Not Found** until Pages is enabled:

1. Open **[Settings → Pages](https://github.com/cozminv/loan-repayments/settings/pages)**
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”)
3. Save, then re-run the failed workflow: **Actions → Deploy to GitHub Pages → Re-run all jobs**

The first successful deploy creates the `github-pages` environment automatically.

Push to `main` triggers deploy via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Features

- Quick presets (generic + bank-published examples)
- Manual inputs: sumă, dobândă, IRCC, marjă, perioadă fixă, termeni
- Bank calculator links under “Referințe bănci”
- Rate egale / rate descrescătoare
- Fixed, variable, or fixed-then-variable rates
- Scenario comparison and investment break-even
