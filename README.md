# Online Zoo

Multi-page front-end (Vite + TypeScript) for the RS School **Online Zoo** project.

**Live site (GitHub Pages):** published from branch `online-zoo-creative-extension` when the deploy workflow succeeds.

## Requirements

- **Node.js** `>= 20.19` (repo includes `.nvmrc` with `24` to match CI).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (verbose) |
| `npm run test:coverage` | Vitest + coverage report |
| `npm run check` | Lint → types → tests → build |

## Quality pipeline (creative extension)

1. **ESLint** — TypeScript-aware rules in `eslint.config.js`.
2. **Husky + lint-staged** — on `git commit`, ESLint runs on **staged** `*.ts` files (`--max-warnings 0`). Install hooks: `npm install` runs `prepare` → `husky`.
3. **GitHub Actions CI** — on push/PR to configured branches: `lint`, `typecheck`, `test`, `build`.
4. **GitHub Pages deploy** — same checks **before** `npm run build`, so broken code is not published.

Details and a short mentor walkthrough: **`TESTING.md`**.
