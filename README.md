# Portfolio

Backend-less, dark-only, English personal portfolio built on Next.js 16 (App
Router) with Feature-Sliced Design and strict tooling: a 3D developer room with
a cat on the desk, a scroll dive into the monitor, flat 2D sections with huge
type. All copy comes from a typed config in `src/shared/config/profile.ts`;
third-party credits are in `CREDITS.md`.

## Stack

- **Next.js 16** — App Router, React 19, Cache Components and React Compiler enabled
- **Feature-Sliced Design** — validated with [steiger](https://github.com/feature-sliced/steiger)
- **Tailwind CSS v4** + **shadcn** (base-nova, Base UI primitives), dark theme only, plum + pink palette tokens in `app/globals.css`
- **next/font** — Unbounded (display), Onest (body), JetBrains Mono (mono), latin subsets
- **three.js** — the cat room (`src/features/cat-room`), loaded lazily, never in the initial chunks
- **GSAP** (ScrollTrigger) + **Lenis** — the pinned dive and finale, smooth scrolling
- **Web Audio** — code-generated ambient and effects, no audio files besides the meow
- **Biome** — lint + format (tabs, single quotes, no semicolons)
- **Lefthook** — pre-commit lint, pre-push type-check + FSD validation
- **Vitest** + **Testing Library** — colocated component tests
- **Playwright** — e2e tests in `e2e/`
- **GitHub Actions** — lint, type-check, FSD, tests, build on push/PR
- **t3-env** — validated environment variables

## Getting started

```bash
pnpm install
pnpm dev
```

Edit `src/shared/config/profile.ts`; the site says what the owner's resume says
and nothing beyond it (no NDA employer name, no e-mail).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm verify` | Lint + type-check + FSD + unit tests, in one command |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm tsc` | Type-check |
| `pnpm lint` | Biome check + auto-fix |
| `pnpm lint:ci` | Biome check only (CI) |
| `pnpm test` | Run Vitest tests |
| `pnpm test:coverage` | Run Vitest tests with coverage report |
| `pnpm test:e2e` | Run Playwright e2e tests |
| `pnpm run fsd` | Validate FSD layer boundaries |
| `pnpm assets:model` | Rebuild `public/models/cat.glb` from the source avatar |
| `pnpm assets:inspect` | Print the model facts; `--write-rig` regenerates `cat-rig.gen.ts` |
| `pnpm assets:check` | Asset guard: no source models or stray model files under `public/`, rig in sync |
| `pnpm assets:shots` | Lab screenshots through headless Chromium: `--view`, `--pose`, `--probe`, `--sequence dive\|finale`, `--clip` (cat versus furniture), `--gate` (the Gate 1 package) |
| `pnpm assets:posters` | Renders the hero and finale posters and the touch icon from the lab |
| `pnpm assets:page-shots` | Stills of the production page at the moments the owner reviews (the Gate 2 package in `docs/lookdev/gate-2/`); needs a running `pnpm start` |

## The cat room

The home page is a 3D developer room with a cat on the desk, drawn on one
fixed transparent canvas above the page. It runs in one of three modes,
decided on the client (the server always renders the static page):

- **full** (wide landscape viewports with motion allowed and real WebGL): the
  hero pins and the camera dives into the monitor, where the page itself shows
  through a hole in the canvas; between the stages the cat peeks from the
  bottom edge, a tap on an empty spot (or "Feed the cat" in the header) drops
  a fish, Escape stops the gags; the finale pulls back out of the monitor into
  the dawn room, the cat still sitting on the desk, and the credits rolling in.
- **lite** (phones, narrow viewports): the same room with a painted screen,
  no pins, no gags; the canvas fades over the hero and the finale.
- **static** (reduced motion, no WebGL, Save-Data, or any failure while
  loading): posters and a 2D face button; nothing moves.

Sound is opt-in: the "Enable sound" chip starts a generated ambient (room
tone, the PC's hum, sparse plucks, chirps at dawn); the meow and the small
effects play unless muted. Details, budgets and the test matrix are in
`AGENTS.md` and `docs/cat-room-plan.md`; the owner's review packages are in
`docs/lookdev/`.

## Project structure

```
app/                  — Next.js App Router routes (thin, import from src/pages)
pages/                — required stub, see pages/README.md
src/
  pages/     — page compositions (home)
  widgets/   — site-header, hero, manifesto, about, experience, stack, contact, finale
  features/  — boop-cat, toggle-sound, cat-room (the 3D scene)
  entities/  — business entities (add when needed)
  shared/    — config (profile, env, routes), lib, ui
assets/               — source 3D models and their licences (never served, see assets/models/README.md)
docs/                 — implementation plans (docs/cat-room-plan.md) and look-dev packages (docs/lookdev/)
scripts/              — asset pipeline: model build, inspect, guard, lab screenshots
```

## E2E tests

Playwright specs live in `e2e/`. The web server config builds and starts the
app itself (`pnpm build-start`); locally it reuses a server already running on
:3000, and in CI it runs `pnpm start` against the build produced earlier in the
pipeline.

- `home.spec.ts` — the page without JavaScript, the hero, the face buttons,
  the sections, reduced motion, narrow viewports, the 404 page.
- `room.spec.ts` — the live room in full and lite mode, the lazy scene chunk,
  every fallback to static.
- `dive.spec.ts`, `finale.spec.ts`, `gags.spec.ts`, `sound.spec.ts` — the
  pinned dive and its pixel alignment, the finale, the edge intrusions, the
  sound opt-in and the offline loudness of the ambient.

The 3D specs run serially under software WebGL (SwiftShader) with long
timeouts. Where Playwright cannot download Chromium, point `CHROME_PATH` at a
Chromium binary. The site has no network dependencies, so the specs are
hermetic.

## Docker

```bash
docker build -t portfolio .
docker run -p 3000:3000 -e SITE_URL=https://example.com portfolio
```

Or with Compose (reads env from `.env.local` if present):

```bash
docker compose up --build
```

## AI agent instructions

Project conventions for coding agents live in [`AGENTS.md`](./AGENTS.md) — the
cross-tool open standard read by Codex, Cursor, Copilot, Gemini CLI, Zed and
others. `CLAUDE.md` is a thin shim that imports it (`@AGENTS.md`), because
Claude Code reads `CLAUDE.md` and not `AGENTS.md`. Edit `AGENTS.md`, not the
shim.

Claude Code additionally picks up two committed files worth reading before you
trust this workspace:

- `.claude/settings.json` — permission rules. `.env`, `.env.local`,
  `.env.development` and `.env.production` are denied to the agent; the
  read-only checks (`verify`, `tsc`, `lint:ci`, `test`, `fsd`, `build`) are
  pre-approved; `pnpm dlx`, `pnpx`, `pnpm add`, `pnpm install` and `pnpm dev`
  always ask. Allow rules take effect only after you accept the workspace-trust
  dialog, which lists them.
- `.agents/skills/` — Agent Skills, kept in the cross-agent directory that
  Copilot, Gemini CLI, Zed, opencode and Amp read directly; `.claude/skills/*`
  symlink to them, because Claude Code scans only its own directory. Ships
  `fsd-slice` (repo-local, scaffolds an FSD slice) plus four vendored from
  upstream projects, all MIT: two from `vercel/next.js` (`next-dev-loop` and
  `next-cache-components-adoption`), `accessibility`
  from `addyosmani/web-quality-skills`, and `vitest` from `antfu/skills`. The
  vendored ones are pinned by `skills-lock.json` and refreshed with
  `npx skills update`. None declare `allowed-tools`, so they grant no tool
  access of their own; delete `.agents/skills/` if you don't want them.

  On a Windows clone with `core.symlinks=false` the link materializes as a
  plain text file and Claude Code simply won't find the skill — every other
  agent still reads the canonical copy, and nothing else breaks. Run
  `git config core.symlinks true` before cloning to get it, or copy the
  directory instead of linking.

Note that `.mcp.json` servers execute code: `next-devtools` runs
`npx -y next-devtools-mcp@latest`, fetched from npm each session, and
`context7` is a remote HTTP endpoint. To opt out without editing the repo, add
a `disabledMcpjsonServers` entry to your own settings.

## AI tooling (MCP)

`.mcp.json` ships three project-scoped MCP servers for AI assistants:

- **next-devtools** — version-matched Next.js docs (offline, from
  `node_modules`) plus live dev-server state: real routes, compilation issues,
  and errors instead of guesses. Runtime queries need `pnpm dev` running.
- **shadcn** — resolves components against this project's `components.json`
  registry, so suggestions match the installed base-nova / Base UI setup.
- **context7** — up-to-date docs for the rest of the stack; no API key.

## Requirements

- Node >= 24 (`.nvmrc`)
- pnpm 11

## License

[MIT](./LICENSE)
