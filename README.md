# Romanian Mortgage Repayment Comparator

Static web app comparing Romanian mortgage strategies: shorter term vs longer term with equal monthly outflow via extra payments, plus investment break-even analysis.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ (includes `npm`).

```bash
cd c:\_repositories\personal\loan-repayments
npm install
npm run dev
```

Vite prints a local URL, usually **http://localhost:5173/loan-repayments/** — open that in your browser.

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

Live (after deploy): `https://cozminv.github.io/loan-repayments/`

Push to `main` with GitHub Pages source = **GitHub Actions**.

## Features

- Quick presets (generic + bank-published examples)
- Manual inputs: sumă, dobândă, IRCC, marjă, perioadă fixă, termeni
- Bank calculator links under “Referințe bănci”
- Rate egale / rate descrescătoare
- Fixed, variable, or fixed-then-variable rates
- Scenario comparison and investment break-even
