# AGENTS.md

## Commands

- `pnpm verify` — `lint:ci` + `tsc` + `fsd` + `test` in one shot. Takes a few
  seconds; run it before reporting work as done.
- `pnpm lint` — Biome check **+ auto-fix (writes files)**. To check without
  writing, use `pnpm lint:ci`. `pnpm lint-unsafe` also applies unsafe fixes.
- `pnpm test` / `test:watch` / `test:coverage` — Vitest (jsdom + Testing
  Library); coverage is V8 over `src/**`
- `pnpm test:e2e` — Playwright; needs network, builds and starts the app itself
- `pnpm build` — production build
- `pnpm dev` — dev server (long-running; don't start it just to check something)

Install dependencies only with `pnpm add`. Agent Skills bundled in
`.agents/skills/` sometimes give `npm i -g` / `npx` instructions — translate
them: `pnpm-workspace.yaml` sets `minimumReleaseAge: 480` plus `overrides`,
CI runs `pnpm install --frozen-lockfile`, and an npm-installed dev dependency
fails the build.

## Architecture

Next.js 16 App Router with Feature-Sliced Design (FSD).

Layers live under `src/` — see the tree in `README.md`.

### FSD rules (enforced by steiger, see `steiger.config.ts`)

- Preset: `fsd.configs.recommended` with overrides:
  - `fsd/public-api: off` and `fsd/no-public-api-sidestep: off` — **no `index.ts`
    barrel files in slices**. Import directly from segment paths, e.g.
    `@/shared/config/profile`, `@/pages/home/ui/home-page`.
    Do not create slice `index.ts` files.
  - `fsd/insignificant-slice: warn` — a slice referenced from only one place
    is a warning, not an error. Anything else `pnpm run fsd` prints is a
    real finding.
  - `fsd/segments-by-purpose: off` for `src/app/**` only — `providers` is the
    conventional app-layer segment name, but steiger-plugin >=0.7 flags it as
    essence-based. The rule stays active on all other layers.
- Layer imports go strictly downward only:
  pages → widgets → features → entities → shared. A slice must not import from
  its own layer (e.g. entity → entity) or any layer above.
- Slices are organized into segments: `ui/`, `api/`, `model/`, `lib/`, `config/`.

### FSD deviations (deliberate — these override external FSD guidance)

Published FSD material, including the official `feature-sliced/skills` Agent
Skill, teaches the opposite of the three rules below. This project's choices
win; do not "fix" the code toward the canonical guidance.

- **No slice `index.ts` barrels.** Canonical FSD makes every slice export
  through a public API; here `fsd/public-api` and `fsd/no-public-api-sidestep`
  are off and imports go straight to segment paths.
- **The `widgets/` layer may be used on purpose.** The official skill
  discourages adopting it; this project does not follow that.
- **`src/pages/` keeps its name** — it is not renamed to `src/_pages/`, and
  the root `pages/` stub stays (it holds `_document.tsx` and `404.tsx`, so the
  empty-directory build failure that motivates the rename does not apply).

### Next.js routing vs FSD

- App Router lives in root `app/` (not `src/app` — that's the FSD app layer).
- Root `pages/` is a **required stub** (`_document.tsx`, `404.tsx`): it shadows
  the FSD layer `src/pages/` so Next.js doesn't treat it as a Pages Router
  directory. Do not delete it (see `pages/README.md`).
- Route files in `app/` are thin: they import a page composition from
  `@/pages/*` (e.g. `app/page.tsx` → `HomePage`).
- Root-level route conventions live in `app/`: `not-found.tsx`, `error.tsx`,
  `global-error.tsx`, `loading.tsx`, `robots.ts`, `sitemap.ts`, `manifest.ts`;
  `metadata` is exported from `app/layout.tsx`.
- `typedRoutes` is enabled; route constants live in `src/shared/config/routes.ts`.
- Path alias (`tsconfig.json`): `@/*` → `./src/*`.

## Code style (Biome)

- Tabs, indent width 4
- Single quotes, JSX single quotes
- No semicolons (trailing commas everywhere)
- Linter: plain `recommended` preset, no rule overrides (unused imports are a
  warning; a11y rules are active)
- CSS modules enabled, Tailwind directives supported

## Git hooks (Lefthook) & CI

- **pre-commit**: Biome check + auto-fix on staged files
- **pre-push**: type-check (`pnpm tsc`) + FSD validation (`pnpm run fsd`)
- **CI** (`.github/workflows/ci.yml`): lint → tsc → fsd → tests → build → e2e on push/PR

## Testing

- **Vitest 5** + **Testing Library** (jsdom), config in `vitest.config.ts`
  (`resolve.tsconfigPaths: true` resolves the `@/` alias).
  The bundled `vitest` Agent Skill was generated from the 5.x beta, but its
  API matches 5.0 stable: `vi.when`, `toHaveBeenExhausted` and context-scoped
  `bench` exist, `test.sequential` is gone (use `{ concurrent: false }`).
  Vitest 5 also defaults `clearMocks` to `true`.
- Tests are colocated with slices: `src/**/*.test.{ts,tsx}`
  (example: `src/pages/home/ui/home-page.test.tsx`).
- **Playwright** e2e tests live in `e2e/` (`*.spec.ts`), config in
  `playwright.config.ts` — its `webServer` runs `pnpm build-start` locally
  (reusing an already-running server on :3000) and `pnpm start` in CI, where
  the build step has already run. Chromium only by default.
  `reuseExistingServer` is on outside CI, so **stop `pnpm dev` before
  `pnpm test:e2e`** — otherwise Playwright silently tests the dev server
  instead of a production build, and the run can go green on code that would
  fail when built.

## UI stack

- **shadcn** v4 (base-nova style, Base UI primitives) — components install to `src/shared/ui/`
- **Tailwind CSS v4**, **dark theme only**: there is no light palette and no
  theme switch, `color-scheme: dark` is set on `:root`. Do not add `dark:`
  variants. All tokens live in `:root` of `app/globals.css`.
  - Palette: `--rose`, `--orchid`, `--blush`, `--snow`, `--lavender`
    (user-provided hex values, keep them exact) plus plum neutrals `--ink`
    (page background), `--ink-2` (cards, popovers), `--ink-3` (muted
    surfaces). Registered in `@theme inline` as `--color-<name>`, so
    `bg-ink`, `text-rose` etc. work.
  - shadcn tokens (`--background`, `--primary`, `--muted-foreground`, ...)
    are mapped onto the palette; use them for components, the raw palette
    for decoration.
  - Fonts via `next/font/google` in `app/layout.tsx` (cyrillic + latin):
    `font-display` (Unbounded), `font-sans` (Onest, the body default),
    `font-mono` (JetBrains Mono).
- **Lucide** icons (see `app/loading.tsx`)
- **sonner** toasts — `<Toaster />` is mounted in `app/layout.tsx`
  (`src/shared/ui/sonner.tsx`); fire with `toast(...)`
- **class-variance-authority** + **clsx** + **tailwind-merge** for class composition (`cn()` in `src/shared/lib/utils.ts`)

To add a shadcn component: `pnpx shadcn@latest add <component>`

## Content

The site has no backend. All copy lives in the typed `profile` object in
`src/shared/config/profile.ts`; pages read it directly. Publish only facts
the owner can confirm: no years of experience or employers, a skill moves
from `learning` to `skills` once it has a live demo, projects appear only
with a live demo, no e-mail (the domain has no MX).

The cat click sound is `public/sounds/cat-click.mp3` (supplied by the owner).

Cache Components is enabled, so everything is dynamic by default and
`export const revalidate` / `dynamic` / `fetchCache` are build errors; opt in
to caching with `'use cache'` + `cacheLife(...)`. Anything that must observe
the environment per request needs `await connection()` (from `next/server`),
otherwise the value is captured during prerendering.

## Environment

- Validated via t3-env in `src/shared/config/env.ts`.
- `SITE_URL` (optional, server-only, defaults to `http://localhost:3000`) —
  public origin for robots.txt/sitemap.xml. Those routes call `connection()`,
  so it is read at runtime (swappable per container). The Zod default applies
  at runtime, where validation runs — do not turn these routes static: at
  build time `SKIP_ENV_VALIDATION=1` (Docker) makes t3-env return raw
  `process.env` without defaults.
- `.env.local` is optional; `SKIP_ENV_VALIDATION=1` bypasses validation (used in Docker builds).

## Build & deploy

- Cache Components (`cacheComponents: true`), React Compiler
  (`reactCompiler: true`), `poweredByHeader: false`, `typedRoutes: true`
- Docker: multi-stage `Dockerfile` (standalone output via `DOCKER_BUILD=1`);
  `.env*` files are dockerignored — pass env at runtime
- Node >= 24, pnpm 11

## TypeScript 7

The project is on **TypeScript 7** (the Go-native port). `tsc --noEmit`,
`next build` (it runs the project's `tsc` CLI), steiger, Vitest and
Playwright all work under it with no config changes.

`steiger` 0.7 loads `steiger.config.ts` under TS 7 (cosmiconfig 10 dropped
its TypeScript dependency). `pnpm-workspace.yaml` still widens the
`tsconfck>typescript` peer range: `tsconfck` (via the steiger plugin) asks for
`^5` and pnpm reports an unmet peer without it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
