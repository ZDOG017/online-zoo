# Testing (creative extension — API layer)

This project uses **Vitest** for unit tests focused on **`src/api`**: the HTTP client and endpoint helpers. The UI is not covered by automated tests in this phase (that would require DOM/e2e tooling or extracted pure functions).

## Why these tests exist

The UI depends on correct **URLs**, **headers**, **JSON bodies**, **error messages**, and **response shapes**. When those regress, users often see **empty lists or vague errors** instead of a clear failure. Tests lock that contract so refactors and dependency updates are safer.

## Structure (two layers)

| Layer | Source | Test file | What it guards |
|-------|--------|-----------|----------------|
| 1 | `src/api/client.ts` | `src/api/__tests__/client.test.ts` | `request()`: URL vs `API_BASE_URL`, headers, POST JSON, `ApiError`, `AbortSignal` |
| 2 | `src/api/endpoints.ts` | `src/api/__tests__/endpoints.test.ts` | `getPets` / `getPetById`: routes and normalizing array vs `{ data: ... }` |

Vitest **verbose** reporter prints the same layer names as nested `describe` blocks.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests once (verbose output). |
| `npm run test:watch` | Watch mode while editing. |
| `npm run test:coverage` | Coverage report (terminal + `coverage/` HTML). |
| `npm run check` | Lint + typecheck + test + production build — closest to “ready to ship”. |

## CI vs deploy

- **`.github/workflows/ci.yml`** runs lint, TypeScript, tests, and build on push/PR (listed branches) and can be run manually (**Actions → CI → Run workflow**).
- **`.github/workflows/deploy-pages.yml`** runs the **same checks before build**, then uploads `dist/` to GitHub Pages. A failing test or lint **blocks deployment**.

## Presenting to a mentor (short script)

1. Show **this file** — two layers, table matches folders.
2. Run **`npm run test`** — read one line of output (“what — why” in the test title).
3. Open **GitHub Actions** — show a green **CI** run and that **Deploy** includes test steps before build.
