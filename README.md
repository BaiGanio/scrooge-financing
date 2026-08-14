# ScroogeCorp Frontend v1

> Lives at `UI/ScroogeCorp/`. The `UI/` folder is the home for all frontend
> projects, keeping the repo root clean (`APIs/`, `Core/`, `Infrastructure/`,
> `Tests/`, `UI/`).

The last link in the ScroogeCorp vertical slice: a Svelte 4 + Vite + TypeScript SPA
that renders a financing request fetched from the BGAPI read side.

`document → extract → FinancingRequest → approve → **read → render**`

## Stack

- **Svelte 4** (matches Mitigram's stack — plain Svelte, not SvelteKit; one component)
- **Vite 5** dev server + build
- **Vitest 2** + `@testing-library/svelte` (jsdom)
- **TypeScript** — `FinancingRequestDto` is typed against the API read model

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` → `http://localhost:62010` (the BGAPI .NET host),
so the browser sees a single origin and **no CORS config is needed on the backend**.
Start the API first (`docker-compose up -d`), then open:

```
http://localhost:5173/?id=<financing-request-guid>
```

## Test

```bash
npm test           # vitest run (CI)
npm run test:watch # watch mode
npm run check      # svelte-check (type + template diagnostics)
```

The backend test projects are included in the root solution. From the repo
root, run:

```bash
dotnet test BGAPI.sln
```

This runs the ScroogeCorp unit tests, controller boundary tests, and the
PostgreSQL/Testcontainers integration tests. Docker must be running for the
integration project. The integration suite deliberately exercises the real EF
write path and Dapper read path, including rejected requests, credit-limit
approval protection, unknown reads, and `NeedsReview` gap projection.

## Notes for reviewers

- **`FinancingRequestCard.svelte`** fetches
  `GET /api/scrooge-corp/financing-requests/{id}` and renders Status, Amount
  (currency-formatted), Debtor IBAN, and the source Document id. Null fields are
  surfaced as a **"to confirm"** gap rather than crashing — mirrors the backend's
  gap-to-confirm extraction pattern.
- States handled: loading, loaded, **404 → not found**, network/other error.
- **Vitest gotcha (Svelte 4):** Vitest resolves the SSR build of components by
  default, where `onMount` never runs. `vite.config.ts` sets
  `resolve.conditions: ["browser"]` under Vitest so lifecycle hooks fire.
  (The `@testing-library/svelte/vite` `svelteTesting` plugin is the Svelte 5 / v5
  equivalent — not available on the v4 line.)
