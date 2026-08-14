# Decoupling the ScroogeCorp UI from the API

> Goal: ship the Svelte SPA as a **standalone static artifact** deployed from a
> GitHub repo (GitHub Pages), talking to the BGAPI backend over a configurable,
> cross-origin base URL — instead of being wedged inside the .NET monorepo and
> relying on the Vite dev proxy.

This is a planning doc, not code. Every step names the exact file it touches and
why, so it's reviewable as a PR and explainable in an interview.

---

## 1. Where we are today (the coupling, precisely)

The UI is *physically* separate (`UI/ScroogeCorp/`) but *logically* coupled to
the API in four places:

| # | Coupling point | File | Symptom when decoupled |
|---|----------------|------|------------------------|
| 1 | **Relative API paths** — `/api/scrooge-corp/...` | `src/lib/api.ts` (`BASE`, `resolveIntake`) | Works only because the dev server proxies `/api`. On GitHub Pages there is no backend at the same origin → every fetch 404s. |
| 2 | **Dev-only proxy** to `localhost:62010` | `vite.config.ts` (`server.proxy`) | Not present in a production build; nothing tells the built bundle where the API lives. |
| 3 | **No Vite `base`** (defaults to `/`) | `vite.config.ts` | A GitHub Pages *project* site is served under `https://<user>.github.io/<repo>/`. Assets requested from `/` 404. |
| 4 | **Backend CORS allow-list** | `APIs/BGAPI/DI/Extensions/ConfigureCors.cs` | Cross-origin browser calls from the Pages domain are blocked until that origin is whitelisted. |

Two more facts that shape the plan:

- **GitHub Pages is static-only.** It cannot host the .NET API. The API must run
  somewhere with a public HTTPS URL (Azure App Service / Container Apps, a VPS,
  Fly.io, etc.). *Decoupling the UI does not decouple you from needing a hosted
  API.* This plan assumes that URL exists; call it `https://api.scroogecorp.example`.
- **A test pins the literal path.** `src/lib/FinancingRequestList.test.ts:37`
  asserts `fetch` was called with `"/api/scrooge-corp/financing-requests"`. The
  base-URL change (step 3) must default to `""` under Vitest so this test — and
  the mocked-fetch tests generally — keep passing untouched.

---

## 2. Target architecture

```
   ┌─────────────────────────┐         HTTPS + CORS        ┌────────────────────────┐
   │  GitHub Pages (static)  │  ───── fetch(API_BASE) ───▶ │  BGAPI .NET host        │
   │  <user>.github.io/scr…  │                             │  api.scroogecorp.…      │
   │  built by GH Actions    │  ◀──── JSON / 4xx ───────── │  CORSPolicy allows      │
   └─────────────────────────┘                             │  the Pages origin       │
                                                            └────────────────────────┘
```

- The SPA becomes **origin-agnostic**: the API base URL is injected at **build
  time** via a Vite env var (`VITE_API_BASE_URL`).
- **Local dev is unchanged**: base var is empty → relative `/api` paths → the
  existing dev proxy still works. Zero-friction inner loop.
- **Production**: base var = the public API URL → absolute cross-origin calls →
  CORS on the backend authorizes the Pages origin.

---

## 3. Code changes on the UI side

### 3.1 Make the API base configurable — `src/lib/api.ts`

Replace the hardcoded constant with an env-driven one that **defaults to empty
string** (preserving current relative-path behaviour for dev + tests):

```ts
// Empty in dev/test → relative "/api/..." paths hit the Vite proxy / mock.
// Set VITE_API_BASE_URL at build time (e.g. https://api.scroogecorp.example) for prod.
const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? "";
const BASE = `${API_ROOT}/api/scrooge-corp/financing-requests`;
```

And fix the one other absolute-ish path (`resolveIntake`, currently
`/api/scrooge-corp/intake-documents/...`) to prepend `API_ROOT` the same way.
Everything else in `api.ts` stays as-is.

> Why build-time, not runtime? Vite inlines `import.meta.env.VITE_*` at build.
> It's the simplest, most teachable choice for a single-target SPA. If you later
> need one bundle promoted across many environments, switch to a runtime
> `config.json` fetched on boot — note that as the tradeoff, don't build it now.

### 3.2 Env files — `UI/ScroogeCorp/`

- `.env` (committed) — sane default, empty base:
  ```
  # Empty → relative /api paths (dev proxy). Overridden per-environment below.
  VITE_API_BASE_URL=
  ```
- `.env.production` (committed) — the public API origin:
  ```
  VITE_API_BASE_URL=https://api.scroogecorp.example
  ```
  Or leave it blank and inject via the CI env (step 5) if the URL is a secret /
  varies per deploy. **Prefer CI injection** so the URL isn't baked into git
  history if it changes.
- Add `.env.local` to `.gitignore` (append to existing `UI/ScroogeCorp/.gitignore`).

Add a type hint in `src/vite-env.d.ts`:
```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
```

### 3.3 Vite base path + keep the dev proxy — `vite.config.ts`

```ts
export default defineConfig({
  // Project Pages site lives under /<repo>/. User/org site or custom domain → "/".
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [svelte()],
  resolve: { conditions: process.env.VITEST ? ["browser"] : [] },
  server: {
    proxy: { "/api": { target: "http://localhost:62010", changeOrigin: true } },
  },
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest-setup.ts"] },
});
```

- `base` is driven by an env var so the same config serves a project site
  (`/scroogecorp-ui/`), a user site (`/`), or a custom domain (`/`).
- The dev proxy is untouched — local dev keeps working with an empty API base.

### 3.4 Verify tests still pass

- `FinancingRequestList.test.ts:37` and the other mocked-fetch tests assert
  literal `/api/...` strings. With `VITE_API_BASE_URL` unset under Vitest,
  `API_ROOT === ""` → paths are unchanged → **no test edits needed**. Run
  `npm test` to confirm before opening the PR.

---

## 4. Backend change (small, but required)

Add the Pages origin to the allow-list — mirror the existing `baiganio.github.io`
precedent in `APIs/BGAPI/DI/Extensions/ConfigureCors.cs`:

```csharp
.WithOrigins([
    config["BAIGANIO:APP_URL"],
    config["COMPANY_HOUSE:APP_URL"],
    "https://baiganio.github.io/js4b",
    config["SCROOGECORP:APP_URL"]   // e.g. https://<user>.github.io
])
```

- Read the origin from config (`settings/applications.json` +
  environment-variable override) rather than hardcoding — matches how the other
  app URLs are wired.
- **CORS origins are scheme+host+port only** — no path. Use
  `https://<user>.github.io`, *not* `.../scroogecorp-ui`. (The existing
  `.../js4b` entry is technically wrong for that reason; don't copy the mistake.)
- Leave `AllowCredentials` commented out — these endpoints are cookieless; keep
  it that way so we don't have to pin exact origins for credentialed requests.

This is the **only** backend edit. Do not touch the service-manager singletons,
auth internals, or anything outside this file (per repo guardrails).

---

## 5. Repo & deployment strategy

You said you'll deploy from a GitHub repo. Two viable shapes:

### Option A — Separate UI repo (recommended)
Push `UI/ScroogeCorp/` to its own repo (e.g. `scroogecorp-ui`). Cleanest story:
independent CI, independent Pages site, the SPA truly stands alone.

- One-time extract preserving history:
  ```bash
  git subtree split --prefix=UI/ScroogeCorp -b scroogecorp-ui
  # push that branch to the new repo's main
  ```
- Set `base: "/scroogecorp-ui/"` (project site) via `VITE_BASE_PATH`.
- **Tradeoff:** the hand-written `types.ts` contract now lives in a different
  repo from the backend DTOs it mirrors. Mitigate by treating the read DTO as a
  versioned contract (it already is — see the comment at the top of `types.ts`).

### Option B — Keep in the monorepo, deploy the subdir
Keep `UI/ScroogeCorp/` where it is; a GitHub Action builds just that folder and
publishes to Pages. Less repo sprawl, but the "one repo to deploy the app"
framing is weaker and Pages config gets a bit more indirect.

**Recommendation: Option A.** It's the honest realisation of "decoupled," it's
the cleaner interview story, and it removes the .NET solution from the UI's
build path entirely.

### GitHub Actions workflow (Pages)
`.github/workflows/deploy.yml` in the UI repo (or `paths: [UI/ScroogeCorp/**]`
filtered in the monorepo for Option B):

```yaml
name: Deploy UI to Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: UI/ScroogeCorp } }   # drop for Option A
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: UI/ScroogeCorp/package-lock.json }
      - run: npm ci
      - run: npm test          # gate deploy on the Vitest suite
      - run: npm run build
        env:
          VITE_API_BASE_URL: ${{ vars.API_BASE_URL }}    # GitHub repo Variable
          VITE_BASE_PATH: /scroogecorp-ui/               # "/" for user site / custom domain
      - uses: actions/upload-pages-artifact@v3
        with: { path: UI/ScroogeCorp/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deploy.outputs.page_url }} }
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

- `API_BASE_URL` is a **repo/environment Variable** (Settings → Secrets and
  variables → Actions → Variables), so the deployed origin is config, not code.
- The workflow **runs the tests before building** — deploy is gated on green.

### SPA routing note
The app reads `?id=<guid>` (query string), not client-side path routing, so the
classic Pages "deep-link 404" isn't a problem here. If you later add path-based
routes, add a `404.html` = `index.html` fallback trick.

---

## 6. Hosting the API (Azure or Raspberry Pi 5)

The UI decoupling is host-agnostic — whichever you pick just produces a
different HTTPS URL that feeds two config values (`API_BASE_URL` Variable +
`SCROOGECORP:APP_URL` CORS origin). But one constraint dominates the choice:

> **The API must be reachable over HTTPS.** GitHub Pages serves the SPA over
> HTTPS, and browsers block an HTTPS page from calling an HTTP API
> (mixed-content). A plain `http://<pi-ip>:62010` works locally but **not** from
> the deployed UI. HTTPS is non-negotiable, not a nicety.

| | **Azure** | **Raspberry Pi 5** |
|---|-----------|--------------------|
| HTTPS | Free, automatic (`*.azurewebsites.net`, or custom domain on App Service / Container Apps) | **You must provide it** — see below |
| Public URL | Given to you | You have to expose your home network |
| CPU arch | x64 (matches the current Dockerfile default) | **ARM64** — see caveat below |
| Cost / uptime | Costs money (or free-tier limits), always-on | Free, but home uptime + a box exposed at home |

### If Azure
`dotnet/aspnet:10.0` runs as-is. App Service or Container Apps gives you HTTPS +
a public hostname out of the box. The hostname becomes `API_BASE_URL` and the
CORS origin. Nothing else changes.

### If Raspberry Pi 5 — getting HTTPS + a public URL is the real work
Recommended: a **Cloudflare Tunnel** (`cloudflared`). Free, gives you an HTTPS
hostname, terminates TLS for you, and needs **no port-forwarding and no exposed
home IP**. Alternatives: Tailscale Funnel, or dynamic-DNS + Caddy/nginx with
Let's Encrypt (more moving parts). Cloudflare Tunnel is the pick.

Two Pi-specific gotchas from the current setup:

1. **ARM64.** The .NET runtime image is multi-arch, so the API builds and runs
   fine on the Pi. But `docker-compose.yml` pins `platform: linux/amd64` on
   **SQL Server**, which has no ARM image and won't run on the Pi. The
   ScroogeCorp slice uses **PostgreSQL** (`postgres:16-alpine`, multi-arch) — so
   the slice works; only the legacy Geography/TechCorp SQL-Server bits won't.
   Fine if you're deploying ScroogeCorp only.
2. **Build off-device.** Build the image for `linux/arm64` on your dev machine
   (`docker buildx --platform linux/arm64`) and push it, rather than compiling
   on the Pi.

Either way, the decision can be deferred — it doesn't block the UI work, it only
gates the "push live" phase (you can't set the real URLs until the API is hosted).

---

## 7. Execution checklist (small, test-first commits)

1. **UI: env-driven base** — `api.ts` + `vite-env.d.ts` + `.env*`. → verify: `npm test` green (paths unchanged in tests), `npm run dev` still talks to local API.
2. **UI: Vite `base`** — `vite.config.ts`. → verify: `npm run build` then `npm run preview`; assets load under the base path.
3. **Backend: CORS origin** — `ConfigureCors.cs` + config key. → verify: from a non-localhost origin, a preflight `OPTIONS` returns the `Access-Control-Allow-Origin` header for the Pages domain.
4. **Repo split** (Option A) — `git subtree split`, push, set Pages source = GitHub Actions.
5. **CI workflow** — add `deploy.yml`, set the `API_BASE_URL` Variable. → verify: push to main → Action builds, tests, publishes; the live Pages URL loads and fetches real data cross-origin.

Each step is independently reviewable and reversible — matches the repo's
"commit small, test-first, incremental" guardrail.

---

## 8. Interview talking points this exercises

- **Build-time vs runtime config** for SPAs, and the tradeoff (why `VITE_*`
  inlining is fine for a single-target app, when you'd switch to a runtime
  `config.json`).
- **Same-origin dev proxy vs cross-origin prod + CORS** — why the dev proxy
  exists (no CORS in the inner loop) and what changes in production.
- **CORS is origin-only (scheme+host+port), no path** — and spotting that the
  existing `.../js4b` entry is a latent bug.
- **Contract stability across a repo boundary** — the hand-written `types.ts`
  mirroring the flat Dapper read DTO becomes a versioned API contract once the
  UI is a separate repo.
- **CI as a deploy gate** — tests run before the artifact is published.
