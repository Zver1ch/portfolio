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
  `global-error.tsx`, `robots.ts`, `sitemap.ts`, `manifest.ts`;
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
  - Fonts via `next/font/google` in `app/layout.tsx` (latin subsets, the site
    is English only):
    `font-display` (Unbounded), `font-sans` (Onest, the body default),
    `font-mono` (JetBrains Mono).
- **Lucide** icons (see `src/features/toggle-sound/ui/sound-toggle.tsx`)
- No `app/loading.tsx`: the site is fully static, and a root Suspense
  fallback would make the prerendered HTML show only the fallback until JS
  runs (the content arrives hidden and is swapped in by a script).
- **sonner** toasts — `<Toaster />` is mounted in `app/layout.tsx`
  (`src/shared/ui/sonner.tsx`); fire with `toast(...)`
- **class-variance-authority** + **clsx** + **tailwind-merge** for class composition (`cn()` in `src/shared/lib/utils.ts`)

To add a shadcn component: `pnpx shadcn@latest add <component>`

## Content

The site is English only and has no backend. All copy lives in the typed
`profile` object in `src/shared/config/profile.ts`; pages read it directly.
Publish only facts the owner can confirm: no years of experience or
employers, never "junior" as a self-title, a skill moves from `learning` to
`skills` once it has a live demo, projects appear only with a live demo, no
e-mail (the domain has no MX). The three statements (hero tagline, dive
statement, footer statement) are owner-approved texts: change them only
with the owner. Third-party credits are typed in
`src/shared/config/credits.ts` and repeated word for word in `CREDITS.md`.
The 2D face everywhere is `public/stickers/cat-sticker.png`
(`CatFaceButton`); no SVG cat exists any more.

The cat click sound is `public/sounds/cat-click.mp3` (supplied by the owner).

Cache Components is enabled, so everything is dynamic by default and
`export const revalidate` / `dynamic` / `fetchCache` are build errors; opt in
to caching with `'use cache'` + `cacheLife(...)`. Anything that must observe
the environment per request needs `await connection()` (from `next/server`),
otherwise the value is captured during prerendering.

## 3D scene (cat room)

- `three` is imported only under `src/features/cat-room/lib/scene/**` and
  `src/pages/lab/**`; a unit test enforces it. Everything else (camera path,
  portal maths, poses) is three-free tuple maths in `src/shared/lib/math`.
- `public/models/cat.glb` is the only model the site serves. Rebuild it with
  `pnpm assets:model` (glTF Transform dedup → prune → `fix-model-space` →
  `tuck-stockings` → `smooth-tail` → meshopt; never the `optimize` preset),
  then `pnpm assets:inspect --write-rig` to refresh
  `src/features/cat-room/config/cat-rig.gen.ts`. `pnpm assets:check`
  (in `verify` and CI) fails on a stale rig file, on any other `.glb`/`.gltf`/
  `.bin` under `public/`, and on any copy of a source model there. Model facts
  and the licence rules are in `assets/models/README.md`.
- Poses are data in `src/features/cat-room/config/poses.ts`: `aim` directions
  in character space (+Y up, +Z forward, +X the cat's left), `aimWorld` the
  same in the placed cat's world (after `root.rotation`; unused since the
  sleeping cat went at Gate 2 round 3, kept for a pose that turns the root),
  `rot` local Euler degrees, `twist` a roll about the bone after `aim`,
  `post` a local Euler offset applied last (exactly what the lab's
  `bone/axis/deg` and sliders do, so a value found there bakes in as it is).
  The pet reaction (`PET` in `config/tuning.ts`) is `sit-boop` masked to neck,
  head and ears: the paws and the tail never move on a click (Gate 2,
  round 2). `popka*` and `shoulder_*` bones are never animated. The arm IK (`lib/scene/cat/limb-ik.ts`) aims the upper
  arm and the forearm by shortest arc, which leaves the forearm's roll
  arbitrary: its `twistDeg` rolls it afterwards, and the wrist's own `post`
  in the pose decides how the paw curls.
- On the page the room is `src/widgets/cat-stage` → `features/cat-room/ui/room-layer.tsx`:
  one fixed transparent canvas (`[data-room-layer]`, z-30, `pointer-events:
  none`, `aria-hidden`) above the page. `model/room-mode.ts` decides
  `static | lite | full` on the client (the server always renders static) and
  the layer writes it to `<html data-room-mode>`; `data-scene-ready='true'`
  follows the first rendered frame. `model/director.ts` is the only per-frame
  owner (GSAP ticker, after Lenis and ScrollTrigger) and reads the plain
  mutable `model/timeline.ts`; nothing per-frame is React state. The scene
  chunk is imported in exactly one place, `lib/load-room-scene.ts`, so three
  never joins the initial JS (e2e checks it). Any failure (chunk, model,
  15 s timeout, renderer error, context loss) latches `static` for the visit
  in `model/room-store.ts`; the loader veil (`ui/loader-veil.tsx`) and the
  static face button swap by CSS on those attributes.
- The dive (`features/cat-room/ui/portal-stage.tsx`, `lib/portal.ts`,
  `@/shared/lib/math/homography`): in full mode the hero and finale stages
  pin for 2.2 and 1.8 viewport heights and write their progress to the
  timeline; the first 2D section is the `[data-portal]` inside the hero
  stage and is warped with a `matrix3d` onto the projected screen quad every
  frame, docked to the viewport over the last 10 % and left with no
  transform at the end (`data-room-phase='inside'`). The monitor in full mode
  is a hole in the canvas, so what shows on it is the real page. Zero-size
  `[data-portal-corner]` markers at the portal's corners exist for the e2e
  alignment check (`e2e/dive.spec.ts`), which reads screenshot pixels with
  the tiny PNG reader in `e2e/png.ts`. Lite mode never pins: the hero
  trigger pushes the camera a third of the way in and fades the layer.
- The finale (`src/widgets/finale`, the `finale` branch of the director): the
  footer statement is the `[data-portal]` of the finale stage. Past
  `data-room-phase='finale'` the director undocks it with the dive's docking
  run backwards (`finaleUndock` in `lib/camera-path.ts`) and the camera pulls
  back to the dawn camera; the room turns to dawn through `dawnFactor` and
  the cat keeps sitting, following the pointer, with the same pet reaction
  as in the hero (the sleeping cat, its eyelids and the `sleep-stretch`
  reaction were removed at Gate 2 round 3). The credits block is a sibling of the stage, absolute
  at the footer's bottom edge in full mode, so it rolls in over the last
  stretch of the pin as a left column that leaves the cat in reach; its
  scrim is a CSS gradient that is invisible on the ink page. The pet proxy
  is "Pet the cat" in every phase (`model/room-store.ts` still mirrors the
  phase for the ambient's mood); the 2D face button in the finale slot is
  `[data-static-face]`, shown only when no room will come.
- Inside the monitor (`data-room-phase='inside'`, full mode only) the cat
  intrudes from the bottom edge through an orthographic overlay laid out in
  CSS px (`lib/overlay.ts`; the cat keeps its world spot, the room meshes are
  hidden). `lib/gags.ts` is the pure, seeded scheduler (one gag at a time,
  4 s cap, 6 s gap, the first section entry always peeks, Escape silences
  for 60 s); the director runs it on wall time, draws only while a gag runs
  and writes `data-room-gag` and `data-fish-count` on `<html>`. Section
  entries come from an IntersectionObserver on `main section[id]` and the
  manifesto; a clean tap on `main` (travel ≤ 6 px, nothing interactive or
  `[data-no-fish]` under it, no selection) or the header's "Feed the cat"
  (`model/feed-bus.ts`) drops a fish (`lib/fish.ts`, the mesh in
  `lib/scene/overlay/fish.ts`) that the left paw reaches for with the
  two-bone IK. The peeking head gets `[data-gag-proxy]`, pointer-only
  (`tabindex=-1`, `aria-hidden`); clicking it meows. The nice-to-have gags of
  plan §3.10 (tail sweep, swat, glass) are not built.
- Sound (`src/shared/lib/sound`): one shared `AudioContext`
  (`audio-context.ts`); the meow and the synthesised effects (`sfx.ts`: tick,
  plop, chomp) play unless muted, and only the plop, which always follows a
  gesture, may create the context. The code-generated ambient lives in
  `ambient.ts`, a module that imports nothing on purpose: the e2e loudness
  test strips its types with `node:module` and renders it through an
  `OfflineAudioContext` in the browser (RMS −34…−26 dBFS, peak ≤ −9 dBFS);
  its gains are tuned to that window, not to the plan's first numbers.
  `ambient-engine.ts` runs it on the page; `features/cat-room/ui/ambient-sound.tsx`
  starts it only after the explicit opt-in (`getSoundOptIn()`, the stored
  value exactly `'true'`), while the room is ready and the tab visible, dawn
  mood in the finale. `features/toggle-sound/ui/sound-prompt.tsx` is the
  "Enable sound" chip, mounted by `widgets/cat-stage` once the room runs and
  gone once any choice is stored; the toggle mutes everything.
- Smooth scrolling (`src/shared/lib/gsap/smooth-scroll.tsx`): Lenis runs on
  fine pointers only and is ticked from the GSAP ticker ahead of
  ScrollTrigger. In-page links are scrolled by Lenis alone: the component
  prevents the click's default and calls `scrollTo` (Lenis honours the
  target's `scroll-margin`), setting the hash once it arrives. Left to the
  browser as well, the instant fragment jump raced the smooth scroll and
  the page jumped back and forth; the nav e2e asserts the scroll never
  turns back.
- Posters (`public/posters/room-{night,dawn}{,-portrait}.jpg`) and
  `app/apple-icon.png` are rendered from the lab with `pnpm assets:posters`;
  re-run it after any change to the room, the poses or the palette.
- Look-dev happens on the dev-only `/lab` route (`app/lab/page.lab.tsx`,
  enabled through `pageExtensions` in `PHASE_DEVELOPMENT_SERVER` only).
  `pnpm assets:shots` drives it headlessly with software WebGL
  (`--view`, `--probe <bone>`, `--pose <name>`, `--sequence`,
  `--compare-source`, `--clip`, `--gate`); set `CHROME_PATH` where Playwright
  cannot download Chromium. Screenshots go to `artifacts/` (git-ignored); the
  Gate 1 package lives in `docs/lookdev/gate-1/`, the Gate 2 package (stills
  of the production page from `pnpm assets:page-shots` against a running
  `pnpm start`, plus the measured budgets of plan §3.13) in
  `docs/lookdev/gate-2/`. Their READMEs are in Russian (the owner's
  language), code and the other docs stay English.
- The cat must not enter the furniture. `src/features/cat-room/config/colliders.ts`
  describes the room's solids; `scene.penetration()` runs every skinned vertex
  of the posed cat through them, and `pnpm assets:shots --clip` (also part of
  `--gate`) fails above 3 mm for `sit` and `stretch`. After moving
  a prop or editing a pose, run it; `--verbose` prints bone positions.

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
