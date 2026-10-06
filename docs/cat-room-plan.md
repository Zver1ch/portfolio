# Cat Room: implementation plan

Status: approved by the owner on 2026-10-04. Gate 1 passed the same day after seven feedback rounds (see `docs/lookdev/gate-1/README.md`). M2–M8 are built; the Gate 2 package is in `docs/lookdev/gate-2/README.md` and waits for the owner's review on real GPUs, a phone and with sound.

Audience: the implementer, working only from this repository. All paths are repo-relative. Follow `AGENTS.md`: pnpm only, Biome style, FSD without barrels, React Compiler on (no hand-written `useMemo`/`useCallback`/`memo`), dark theme only.

Working agreement:
- Work on a feature branch created from `main` (for example `feature/cat-room`). Never commit to `main`; merging is the owner's call.
- Conventional commit messages as in the history, without attribution or co-author lines.
- Dependencies approved for this plan: `three@0.186.1` (runtime), `@types/three@0.186.0` (dev) and one-off runs of `pnpm dlx @gltf-transform/cli@4.5.1`. Anything else needs the owner's approval first.
- Stop at the owner gates (§7) and present the listed package. Do not build past a gate without approval.
- The repository is going to be public. Never commit licence-restricted files (§1.2), secrets or personal e-mail addresses. Commit with the owner's GitHub noreply address, `226742360+Zver1ch@users.noreply.github.com`.

## 1. Goal, scope, constraints

**Goal.** Rebuild the home page as one scroll:
1. A 3D hero: a developer's room at night, the cat lounging on the desk in front of the monitor.
2. The camera dives into the monitor and the screen becomes the page.
3. Clean 2D sections with huge typography, with the cat intruding from the viewport edges.
4. The camera pulls back out of the monitor into the room at dawn, the cat still sitting there, then credits. (Gate 2, round 3: the sleeping cat was dropped after two rounds of pose work; the cat sits as in the hero.)

**Non-goals.** Projects section, Russian locale, light theme, custom cursor, PS1 pixelation or vertex jitter, runtime lights, shadows, post-processing, physics engines, external animation files, WebGPU, Open Graph image.

**Reference.** The structure follows https://www.leoparpeix.com/: an immersive 3D world balanced with a clean 2D layout, a mascot at the centre, a companion that reacts to clicks, ambient sound with an opt-in prompt, a loader, a credits block. Its visuals are not copied.

### 1.1 Binding decisions

| # | Decision |
|---|---|
| 1 | World: cozy developer room at night. Base set only: desk, modern flat monitor (no CRT or retro devices), PC tower, keyboard, mouse, window with the moon, lamp, plus the cat's spare pair of stockings dropped on the floor (black, white double stripe, like the pair on its legs; Gate 1 round 6 replaced the paw-print socks). Anything else needs owner approval at Gate 1. |
| 2 | Structure: 3D hero with a scroll-driven camera, 2D sections with huge type, a second 3D moment at the end, credits. |
| 3 | Dark only, existing palette tokens, no `dark:` variants. |
| 4 | The cat gets in the way of work: sitting on the front edge of the desk next to the mouse, legs dangling over the edge, one paw on the mouse, facing the visitor (Gate 1 decision: the side-lying pose of the first drafts was rejected); gibberish (`asdfghjkl`) gets typed; on click he stretches and meows. Wholesome, lazy, cat-like, no pin-up staging. The pose render is approved by the owner before anything is built on it. |
| 5 | Dive into the monitor until the screen fills the viewport and is the page. Finale: pull back out of the monitor; dawn; the cat sits as before (no sleeping cat since Gate 2, round 3). |
| 6 | In 2D sections the cat stays outside the screen and intrudes from the edges (ears, paw swatting the cursor, tail sweep, face against the glass, `asdfgh` typed). A click drops a fish and a paw snatches it. Clicking the cat meows. No walking mini-cat. |
| 7 | Style: clean flat low-poly, flat palette colours, light painted with colour, full resolution. |
| 8 | The character GLB is used as authored: bow tie and stockings stay, proportions untouched, `popka` bones never animated. |
| 9 | Code-generated ambient sound with an "Enable sound" prompt; loader "Building the room…"; credits block mandatory. |
| 10 | English only. Content only from `src/shared/config/profile.ts`; no years, employers, e-mail; never "junior" as a self-title; skills move from `learning` to `skills` only with a live demo. |
| 11 | No Projects section until a live demo exists. |
| 12 | Keep: a cat click plays `public/sounds/cat-click.mp3` through `playCatSound` (the file is used as is, without a credit line); the mute toggle is always reachable; the per-viewer counter stays in localStorage and is labelled "boops". |
| 13 | Both owner models are used: model A as the 3D cat, model B as a pre-rendered sticker image, `public/stickers/cat-sticker.png`. |

Owner-approved texts:

| Slot | Text |
|---|---|
| Hero tagline | Building layouts. Learning the rest. Supervised by a cat. |
| Giant statement after the dive | I BUILD LAYOUTS. THE CAT SITS ON THEM. |
| Footer statement | LET'S BUILD SOMETHING. THE CAT APPROVES. |

There is deliberately no second statement about character, and no character line in the About text.

### 1.2 Licences and credits

| Model | File | Licence | Rule |
|---|---|---|---|
| A, the 3D cat | `assets/models/source/boykisser_custom_low_poly_avatar_scratch_model.glb` | CC BY 4.0 | An optimised copy ships as `public/models/cat.glb`. Attribution is mandatory. |
| B, 2D face line art | Not in the repository | Sketchfab Free Standard | The licence forbids making the model file available as a stand-alone file, and the repository is going to be public: never commit, serve or copy the file. Only its render ships, `public/stickers/cat-sticker.png`, which is already committed. |

Exact credit text, stored in `src/shared/config/credits.ts`, rendered in the finale and repeated in `CREDITS.md`:

> "Boykisser Custom Low Poly Avatar (Scratch Model)" by NEGATIVEMARE (https://sketchfab.com/kakoicapital), https://sketchfab.com/3d-models/boykisser-custom-low-poly-avatar-scratch-model-8f695ab60950464db46134f19fd727b5, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: compressed for the web, posed and animated in code.

> Sticker artwork rendered from "Boy Kisser 2D" by Nyamewsis, https://sketchfab.com/3d-models/boy-kisser-2d-6771664a8c4d431185bf012ec83b3e7e (Sketchfab Standard licence). The model file is not distributed.

Title, author, source and licence are links. Add a line "Built with Next.js, three.js, GSAP, Lenis. Typefaces: Unbounded, Onest, JetBrains Mono (SIL OFL)."

### 1.3 Model facts (measured on the source files; re-verify in M0)

Model A:
- 24,742 triangles, 16,134 vertices, 7 skinned meshes: `Bow_Scifi Metal Plate_0`, `Bow_Glossy Black Plastic_0`, `Stockings_Glossy Black Plastic_0`, `Stockings_Material_0`, `boykisser_Material_0` (white body, 13,994 triangles), `boykisser_fur 2_0` (pink, 5,606), `boykisser_Glossy Black Plastic_0` (black, 1,254).
- 4 materials, all `KHR_materials_unlit`, double-sided, no textures. Linear base colours: `Material` 0.8 (white), `fur_2` (0.45, 0.16, 0.15) (dusty pink), `Glossy_Black_Plastic` 0, `Scifi_Metal_Plate` 0.37.
- One skin with 134 joints (including `_end` leaves). No animations, no morph targets.
  The shipped `cat.glb` adds three tail joints (`smooth-tail`, see `assets/models/README.md`), 137 in all.
- Node chain: `Sketchfab_model` (−90° about X) → fbx node (scale 0.01) → `RootNode` → `Armature` (scale ≈ 39.05 with an axis swap) → `Object_4` → `_rootJoint`. Node names carry numeric suffixes (`Head_017`, `Tail.001_05`).
- Skin weights:
  - Pupils: 64 black vertices on each of `LeftEye` and `RightEye`. The eye bones move the pupils only; there are no eyelids.
  - `jaw` carries the lower jaw (white) and the mouth interior (pink): opening it shows a pink mouth.
  - `Shoulder_L` and `Shoulder_R` have degenerate bind matrices (bind position at the origin) and carry no vertices. Never pose them; an arm is `Arm → Elbow → Wrist`.
  - 32 `hair*` bones in short chains around the head (cheek and crown tufts, 1,526 vertices).
  - Ears: three bones each. Tail: `TailRoot, Tail, Tail.001, Tail.002, Tail.003`, pink tip.
  - Paw pads (pink) and claws (black) sit on the finger and foot bones, so the pads show when a paw is pressed toward the camera.
  - Both bow meshes follow `Neck`; the stockings follow `Leg`, `Knee`, `Foot`.
  - `popka` and `popka.001` influence 83 vertices and are never animated.
- Approximate bind-pose proportions as fractions of the height to the ear tips: knee 0.23, hip joint 0.44, hips 0.56, chest 0.65, neck 0.79, head joint 0.82, eyes 0.88; shoulder joint to wrist ≈ 0.31; tail ≈ 0.25 long.

Model B (not in the repository): the classic character face as flat extruded line art, 3,032 triangles, no rig. Its render `public/stickers/cat-sticker.png` is a 1024×1024 transparent PNG: the line art in `--snow` (`#f4f4f8`) and the blush marks in `--rose` (`#da85af`). Recolour it in code if a surface needs other colours; do not redraw or re-render it.

## 2. Experience walkthrough

Modes (decided on the client; the server always renders `static`):
- `full`: motion allowed, WebGL available, viewport at least 64rem by 44rem with aspect at least 6:5.
- `lite`: motion allowed, WebGL available, any other viewport.
- `static`: reduced motion, no JS, no WebGL, Save-Data, or any scene failure.

| Step | full | lite | static |
|---|---|---|---|
| Load | Server HTML paints the header, hero copy (h1 `profile.name`, `profile.role`, `profile.tagline`) and the loader veil: 2D face, "Building the room…", real progress. The page is scrollable at once. | Same. | Veil hidden by CSS; night poster, hero copy and the 2D face button (meows, counts). |
| Scene ready | Veil fades and the live room replaces the poster: the cat breathes, the tail sways over the screen, the head lazily follows the cursor, gibberish appears on the monitor (which shows the real first section). The "Enable sound" chip appears. Click on the cat: a face reaction (head tilt, ears flat, mouth open; the paws and the tail stay put, Gate 2 round 2), meow, hearts, counter. | Same room, portrait-aware framing, the monitor shows a fake screen (flat glow and text bars). Tap on the cat works. | No scene. |
| Dive | The hero stage pins for 2.2 viewport heights. Hero copy scrolls away and fades. The camera flies to the monitor; the tail flicks off the screen; the screen fills the viewport and docks at identity. | No pin. While the hero scrolls out, the camera pushes in about a third of the path and the canvas fades to transparent, revealing the next section. | Normal scroll. |
| Statement | `profile.statement` in giant uppercase. Corner captions: `profile.handle`, `profile.location`, `profile.languages`. A mono line receives `asdfghjkl`. | Same, static typing line. | Same, static line. |
| About | `profile.about` large; facts list: handle, location, languages, `profile.now`. | Same. | Same. |
| Stack | Table: skill and status. `profile.skills` are "In use", `profile.learning` are "Learning". Note: "Learning rows move up with the first live demo." | Same. | Same. |
| Contact | "Looking for": `profile.lookingFor`; giant links from `profile.links`; `profile.now`. | Same, plus a 2D face button. | Same, plus a 2D face button. |
| Edge intrusions | Ears and eyes peek from the bottom edge; a paw swats near the cursor; the tail sweeps on section change; rarely the face against the glass; `asdfgh` typed in a small line. Clicking an empty page area (or "Feed the cat" in the header) drops a fish and a paw snatches it. Clicking the head meows. | None. | None. |
| Finale | The finale stage pins for 1.8 viewport heights. The page (showing `profile.footerStatement`) undocks and shrinks into the monitor as the camera pulls back; dawn light warms; the cat sits as in the hero and follows the pointer. Credits roll in at the end. Click on the cat: the face reaction and meow. | No pin. The canvas fades in over the finale spacer showing the dawn room; credits overlaid. | Footer statement, dawn poster, credits, face button. |

## 3. Technical design

### 3.1 Key design choices

| Choice | Reason |
|---|---|
| Plain `three`; no React renderer for three and no helper library. | The scene is driven every frame by one external director (scroll progress, camera, DOM matrix, render) and consists of one merged static mesh, one skinned model and a few quads. A reconciler would add a second frame loop to synchronise, a wrapper that sets `pointer-events:auto` and `touch-action:none` on a full-viewport element, and a version coupling to React, while nothing here benefits from declarative updates. |
| The model is optimised with explicit CLI steps (`dedup`, `prune`, `meshopt`), never the `optimize` preset. | The preset runs join, flatten, simplify and palette, which can alter a rig or the authored look. |
| Portal and camera maths are three-free and in the initial bundle. | Pinning and the DOM warp do not depend on the scene chunk; the maths is unit-testable; three stays lazy. |
| Own `dpr-governor.ts`. | Pure and testable. |
| The scene is loaded with a plain `import()` in an effect with explicit rejection handling. | The scene is not a React component. The `next/dynamic` rule is kept in Appendix A.6 for any future React-loaded part. |
| Authored unlit materials are variant A; a two-tone "painted light" variant B is offered at Gate 1. | White unlit limbs over a white torso can merge into one blob in a lying pose. |
| The loader veil is part of the hero stage, never locks scroll, and has a CSS failsafe. | It cannot trap the visitor; hero text stays in the HTML. |

### 3.2 Layering

One fixed transparent canvas sits above the page. z-index in the root stacking context:

| z | Layer |
|---|---|
| 0 | Page flow. Inside a stage (own stacking context while pinned): poster (auto), portal box (10), loader veil (20). |
| 30 | `[data-room-layer]`: `fixed inset-x-0 top-0 h-lvh`, `pointer-events:none`, `aria-hidden`; the canvas is created inside it imperatively. |
| 40 | Film grain (`body::after`, existing; keep or drop is decided at Gate 1). |
| 45 | Scene-attached DOM: hero copy, credits, pet proxies, typing line. |
| 50 | Header, sound prompt, skip link. |
| 60 | Hearts (`stampHearts`), toasts. |

Rules:
- Hero copy and credits are siblings of the pinned stage, never children; the pin applies `position:fixed` and transforms, which would trap them under the canvas.
- No ancestor of a z-45 element may have `transform`, `filter`, `opacity < 1`, `isolation`, `will-change` or `contain`.
- The layer gets `visibility:hidden` whenever no frame is needed. Render one cleared frame before idling: the last presented frame otherwise stays on screen.

### 3.3 Modes, phases, director

- `model/room-mode.ts`: `selectRoomMode({ reducedMotion, webgl, saveData, failed, fullViewport })` returns `'static' | 'lite' | 'full'`. `useRoomMode()` wraps it in `useSyncExternalStore` with server snapshot `'static'`. The WebGL probe runs only on the client and is skipped under reduced motion (Appendix A.1). The layer writes `data-room-mode` on `<html>`.
- `model/room-store.ts`: `status: 'idle' | 'loading' | 'ready' | 'failed'`, `progress: 0..1`, `failed` latch. A failure of any kind (chunk, GLB, timeout, renderer error, context lost) switches to `static` for the rest of the visit.
- `model/phase.ts`: `resolvePhase({ mode, dive, finale, heroInView, finaleInView })`.

| Phase | When | Camera | Room | Cat | Loop |
|---|---|---|---|---|---|
| `room` | full: `dive < 0.985` and hero stage on screen; lite: hero on screen | Perspective, dive track | Night | Sit plus idle layers | Every frame |
| `inside` | full only, between the two stages | Orthographic overlay in CSS px | Hidden | Gag poses | Only while a gag or fish is active |
| `finale` | full: `finale > 0.015`; lite: finale spacer on screen | Perspective, finale track | Dawn | Sit plus idle layers | Every frame |
| `off` | static, hidden tab, nothing on screen | none | none | none | Stopped |

- `model/timeline.ts`: a plain mutable object (`dive`, `finale`, `layerOpacity`, `pointer`, `viewport`). ScrollTriggers write it and the director reads it. It is never React state.
- `model/director.ts` is the only per-frame owner. `tick(time, deltaMs)`:
  1. Resolve the phase.
  2. `cameraAt(track, p, aspect)`.
  3. Write portal transforms to registered elements.
  4. `scene?.render(frame, dt)`.
  5. Position proxies from `scene.measure()`.
  6. Feed the DPR governor.
- The director adds itself to `gsap.ticker` only while frames are needed and removes itself on `visibilitychange`.
- Frame order within one tick: Lenis (registered with `prioritize = true`), then GSAP and ScrollTrigger, then the director (DOM writes, then WebGL render). Change `src/shared/lib/gsap/smooth-scroll.tsx` to `gsap.ticker.add(raf, false, true)`.
- `dt` is accumulated and clamped with `advance()` (Appendix A.2). Never read a renderer clock.

Scene contract (`lib/scene/create-room-scene.ts`):

```ts
export type RoomScene = {
	render(frame: DirectorFrame, dt: number): void
	resize(width: number, height: number, dpr: number): void
	trigger(event: { type: 'pet' } | { type: 'feed'; x: number; y: number }): void
	measure(): { cat: Rect | null; head: Rect | null } // CSS px, for proxies
	dispose(): void
}
```

### 3.4 Scroll choreography

`src/shared/config/motion.ts` gains:
- `ROOM_FULL_QUERY = '(min-width: 64rem) and (min-height: 44rem) and (min-aspect-ratio: 6/5) and (prefers-reduced-motion: no-preference)'`
- `REDUCED_MOTION_QUERY` (renamed from `STORY_REDUCED_QUERY`).
- `FINE_POINTER_QUERY` stays.
- `STORY_FULL_QUERY`, `STORY_LITE_QUERY` and the `story` CSS variant are removed with the widgets that used them.

Triggers live in `ui/portal-stage.tsx` inside `useGSAP(..., { dependencies: [mode] })`, so a mode change reverts them.

Full mode:

```ts
ScrollTrigger.create({
	trigger: section, // <section id='top'> or the finale <footer>
	start: 'top top',
	end: pinEnd(track === 'dive' ? 2.2 : 1.8), // src/shared/lib/gsap/ranges.ts
	pin: stage,
	anticipatePin: 1,
	onUpdate: (self) => { timeline[track] = self.progress },
	onRefresh: (self) => { timeline[track] = self.progress },
})
```

- No `scrub` smoothing: Lenis already smooths on fine pointers.
- Dive progress map: 0–0.08 hold; 0.08–0.90 camera travel (`easeInOutCubic`); 0.55–0.80 tail flick off the screen; 0.90–1.00 dock; the phase becomes `inside` at 0.985.
- Finale progress map: 0–0.10 undock (the docking lerp of §3.5 run backwards, `finaleUndock`); 0.10–0.85 pull back; dawn factor `0.55 + 0.45 * smoothstep(0.1, 0.9, p)`. The credits block is absolutely positioned at the footer's bottom edge in full mode, so it rolls in from the bottom over the last stretch of the pin (about the last 30% for its height) and sits fully in view exactly at p = 1, the end of the document; a left column, so the cat on the right stays uncovered.
- Hero copy fades with a scrubbed tween over the first 0.45 viewport heights.
- Set `history.scrollRestoration = 'manual'`. After the first refresh, scroll to `location.hash` if present.

Lite mode has no pins:
- Hero slot (the poster box, one viewport tall; the section itself is twice that with the first section under it): trigger `top top` to `bottom top` writes `timeline.dive = 0.35 * progress` and `layerOpacity = 1 - smoothstep(0.15, 0.75, progress)`.
- Finale spacer: `top bottom` to `bottom bottom` writes `layerOpacity = smoothstep(0.25, 0.85, progress)`.
- Add `ScrollTrigger.config({ ignoreMobileResize: true })` in `src/shared/lib/gsap/register.ts`.

Stage markup (the static layout is the default; `room-full:` is `@custom-variant room-full (&:where([data-room-mode="full"] *));`):

```html
<section id="top" class="relative">               <!-- no stacking context -->
  <div data-stage class="grid room-full:h-lvh room-full:overflow-clip">
    <div data-slot class="relative h-svh room-full:col-start-1 room-full:row-start-1 room-full:h-lvh">poster + veil</div>
    <div data-portal class="z-10 room-full:col-start-1 room-full:row-start-1 room-full:h-lvh">first section</div>
  </div>
  <div data-hero-copy class="pointer-events-none absolute inset-x-0 top-0 z-[45] h-svh">h1, role, tagline</div>
</section>
```

### 3.5 Portal maths

All CSS pixels; the device pixel ratio only affects the drawing buffer. `W`, `H` are the layer's `clientWidth` and `clientHeight` (ResizeObserver); the stage has the same box.

World (metres, +Y up, camera looks toward −Z). Starting values in `config/room-layout.ts` and `config/camera-tracks.ts`, tuned at Gate 1:

| Item | Value |
|---|---|
| Screen centre | `[0.25, 1.13, -1.33]`, facing +Z |
| Screen size | Height 0.34; width `0.34 * clamp(W / H, 1.2, 3.6)`. The monitor takes the viewport's aspect, so the dive ends exactly at identity. |
| Hero camera | Position `[0.95, 1.36, 0.55]`, target `[0.20, 1.00, -1.20]`, fov 32 (vertical), near 0.05, far 30 |
| Dive | Position: quadratic Bézier from hero through `[0.55, 1.26, -0.05]` to the end position; target: lerp to the screen centre, complete at t = 0.7 |
| End camera | On the screen normal at distance `0.34 / (2 * tan(fov / 2)) * 0.985` (0.593 m at fov 32 before the 1.5% overshoot that hides the bezel) |
| Lite | Hero position scaled away from the target by `max(1, 1.35 / aspect)` |
| Dawn camera | Position `[-0.15, 1.46, 1.0]`, target `[0.4, 1.0, -1.22]`, fov 34 (re-aimed at Gate 2 round 3 to frame the monitor and the cat sitting to its right; the pull-back control point moved to `[0, 1.3, 0.1]`) |

With these values the screen quad at 1440×900 is about 400×270 px at rest and exactly `[0,0]–[1440,900]` at the end.

Projection (`src/shared/lib/math/projection.ts`). The three.js camera is set from the same pose each frame (`position`, `up = (0,1,0)`, `lookAt(target)`, `fov`, `aspect`, `updateProjectionMatrix()`), which this formula matches to floating-point precision:

```ts
export function projectPoint(point: Vec3, cam: CameraPose, width: number, height: number): Vec2 | null {
	const f = normalize(sub(cam.target, cam.position))
	const r = normalize(cross(f, [0, 1, 0]))
	const u = cross(r, f)
	const v = sub(point, cam.position)
	const depth = dot(v, f)
	if (depth <= 1e-4) return null
	const t = Math.tan((cam.fov * Math.PI) / 360)
	return [
		((dot(v, r) / (depth * t * (width / height)) + 1) / 2) * width,
		((1 - dot(v, u) / (depth * t)) / 2) * height,
	]
}
```

Homography (`src/shared/lib/math/homography.ts`), quad order TL, TR, BR, BL:

```ts
export function quadToMatrix3d(quad: Quad, width: number, height: number): number[] | null {
	const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad
	const dx1 = x1 - x2
	const dx2 = x3 - x2
	const dx3 = x0 - x1 + x2 - x3
	const dy1 = y1 - y2
	const dy2 = y3 - y2
	const dy3 = y0 - y1 + y2 - y3
	const den = dx1 * dy2 - dx2 * dy1
	if (Math.abs(den) < 1e-9) return null
	const g = (dx3 * dy2 - dx2 * dy3) / den
	const h = (dx1 * dy3 - dx3 * dy1) / den
	const a = x1 - x0 + g * x1
	const b = x3 - x0 + h * x3
	const d = y1 - y0 + g * y1
	const e = y3 - y0 + h * y3
	// CSS matrix3d is column-major
	return [a / width, d / width, 0, g / width, b / height, e / height, 0, h / height, 0, 0, 1, 0, x0, y0, 0, 1]
}
```

Application (`lib/portal.ts`):
- The portal box is `W × H` at the stage's top-left with `transform-origin: 0 0`.
- While `0 < p < 1`: `style.transform = 'matrix3d(...)'` and `will-change: transform`.
- Docking: over p 0.90–1.00 lerp the four corners to the exact viewport rectangle.
- At `p >= 1`: remove both properties, so text re-rasterises crisp and the computed transform is `none`.
- If a corner projects to `null` or the determinant vanishes, keep the previous matrix.

The screen in 3D:
- A quad with a `ShaderMaterial` that writes `vec4(0.0)` with `blending: NoBlending` and `depthWrite: true` (a hole in a premultiplied-alpha canvas). The cat's tail in front of it still draws.
- The bezel colour equals `--ink`, so any sub-pixel seam is invisible.
- In lite mode and in posters the same quad uses an opaque "fake screen" material: flat glow plus a few bar quads.

Dive tunnel rule: at `p >= 0.9` no part of the cat may be inside the pyramid from the end camera to the screen. At the cat's depth this is y from 1.04 to 1.22 around x = 0.25. The sitting pose keeps the whole cat to the right of it, at the front edge of the desk.

Resize: the observer updates `timeline.viewport`, the renderer size and the monitor aspect; ScrollTrigger refreshes itself; the matrix is recomputed every tick.

### 3.6 Renderer and scene

- `lib/scene/renderer.ts`: create a fresh `<canvas>` inside the effect (StrictMode-safe).
- `new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false })`, clear alpha 0, `toneMapping = NoToneMapping`, sRGB output. Palette hex colours then render exactly.
- `webglcontextlost` reports failure. Dispose everything on cleanup.
- Report "first frame" on the animation frame after the first `render()`. Only then hide the poster and enable proxies.
- DPR: `min(devicePixelRatio, 1.75)` in full, 1.5 in lite.
- `dpr-governor.ts`: every 2.5 s of rendered frames, an average under 40 fps drops to 1, an average of 58 or more restores the cap. Each change is a flip; after 3 flips lock at 1.
- `three` is imported only under `src/features/cat-room/lib/scene/**` and `src/pages/lab/**`. The single edge into it is `await import('./scene/create-room-scene')` in `lib/load-room-scene.ts`. A unit test enforces the boundary; an e2e test checks that no initial chunk contains `WebGLRenderer`.

### 3.7 Room construction conventions

- `lib/scene/room/kit.ts`: builders `box`, `cylinder`, `prism`, `quad` return non-indexed geometry with two colour attributes per face: `color` (night) and `colorDawn`.
- Each face gets a tone factor from its normal, computed once: top 1.0, front 0.9, sides 0.8, away 0.68.
- `build-room.ts` merges all static props with `mergeGeometries` into one mesh. Its `MeshBasicMaterial` (`vertexColors`) is patched in `onBeforeCompile` to `mix(color, colorDawn, uDawn)`.
- Painted light is geometry, not lighting: transparent quads for the monitor glow on desk and cat, the moonlight path, the lamp pool and the dawn sun patch, each faded by `uDawn`.
- The window is a gradient quad plus a moon disc; at dawn the gradient warms and the moon fades.
- Socks: two small prisms with a paw print made of four circles.
- Sticker: a quad on the PC case textured with `public/stickers/cat-sticker.png` (already in the repository).
- Colours come only from the palette tokens and darker mixes of them, mirrored in `lib/scene/materials.ts`.

### 3.8 Cat rig

- **Load** (`cat/load-cat.ts`): `GLTFLoader` with `MeshoptDecoder` from `three/addons/libs/meshopt_decoder.module.js`. Set `frustumCulled = false` on every skinned mesh; the bind-pose bounds are wrong once posed and in the overlay.
- **Normalisation:** wrap in a group; scale so the rest-pose height is 0.62 m; feet at y = 0; facing +Z.
- **Bone lookup:** `skeleton.bones[i]` corresponds to entry `i` of the generated `config/cat-rig.gen.ts` (`{ key, parent }[]` in skin order). In development assert `normalizeBoneName(bone.name) === key`.
- **`lib/bone-names.ts`:** lower-case, whitespace to `_`, drop `.`, strip one trailing `_<digits>` group. Examples: `Head_017` becomes `head`; `Tail.001_05` and the loader-sanitised `Tail001_05` both become `tail001`. Collisions throw in the inspect script.
- **Hard rules:** bones are only rotated (Hips may also translate), never scaled; `popka*` and `shoulder_*` keys are excluded from the posable type, the springs and the IK. A unit test checks that no pose references them.
- **Rest capture:** local quaternion and position per bone; the bone axis is the normalised local position of its first child.

Pose format (`config/poses.ts`, three-free data):

```ts
export type BonePose = { rot?: Vec3; aim?: Vec3; aimWorld?: Vec3; twist?: number; post?: Vec3 }
export type Pose = {
	root?: { position: Vec3; rotation: Vec3 } // metres, degrees
	hips?: Vec3
	bones: Partial<Record<PosableBoneKey, BonePose>>
}
```

- `rot`: local Euler XYZ offset in degrees on top of rest.
- `aim`: desired direction of the bone in character space (+Y up, +Z forward), resolved parent-first by shortest arc, then `twist` degrees about the bone axis; `aimWorld` is the same in the placed cat's world; `post` is a local Euler offset applied last, the same thing the lab's overrides do (Gate 2, round 1).
- `cat/rig.ts` compiles each pose once into local quaternions.
- `cat/pose-mixer.ts` slerps between compiled poses with eased weights. An optional stepped clock (`floor(t * 12) / 12`) is a lab toggle for Gate 1.
- Poses: `rest`, `sit`, `sit-boop` (the face-only pet reaction, masked), `stretch` (lab only), `peek`, `peek-boop`, `reach`, `tail-up`. The `sleep` and `sleep-stretch` poses and the eyelid machinery were removed at Gate 2 round 3.

Procedural layers, applied after the mixer in this order:
1. Breathing: chest pitch ±1° at 0.28 Hz.
2. Look-at: head yaw ±50°, pitch ±25°, split 35% neck and 65% head, damped with λ = 6; the pupils follow through small rotations of `lefteye` and `righteye`.
3. Ear twitch every 4–9 s.
4. Jaw open 18° for 350 ms on meow (the pink mouth shows).
5. Spring chains for tail, ears and hair (`cat/chains.ts`): verlet tip follow at fixed 1/120 s sub-steps, at most 4 per frame; hair chains auto-detected from keys starting with `hair`.
6. Two-bone IK (`lib/ik.ts`, pure; `cat/limb-ik.ts` applies it) for `arm → elbow → wrist`, with clamped reach and a pole hint.

There are no eyelids and no morph targets, so the cat cannot blink; it stays awake on every stage.

Shading variants for Gate 1:
- A: authored unlit.
- B: `MeshBasicMaterial` patched to multiply by a two-step tone from the world normal against a key direction.
- C (optional): plum inverted-hull outline (Appendix A.8).

### 3.9 Pose authoring without a DCC tool

Dev-only route `/lab`:
- `next.config.ts` uses the phase function and sets `pageExtensions` to `['lab.tsx', 'tsx', 'ts']` only in `PHASE_DEVELOPMENT_SERVER`; the page file is `app/lab/page.lab.tsx`. The production build has no such route and no lab code.
- If `pageExtensions` misbehaves, fall back to a `notFound()` guard on `NODE_ENV`.

Query parameters:
- `view=hero|dive|finale|overlay|turntable|face|probe`
- `p`, `dawn`, `pose`, `t`, `shading=a|b|c`, `stepped`
- `bone`, `axis` and `deg` (probe)
- `ui=1`: one row of three range inputs per bone and a "Copy pose" button.

`window.__lab.ready` resolves after the first frame.

`pnpm assets:shots` (`scripts/shots.mjs`) starts `next dev` on port 3100, opens the lab in headless Chromium with the SwiftShader arguments and writes PNGs to `artifacts/shots/` (git-ignored). Modes:
- `--probe <bone>`: contact sheet of +30° about each local axis. Do this first for spine, neck, head, arms, legs and tail, and record which axis is which as comments in `poses.ts`.
- `--pose <name>`: front, side, top, three-quarter and hero framing.
- `--sequence dive|finale`: production build, p = 0, 0.1, …, 1.
- `--compare-source`: rest pose of the source GLB against the optimised GLB with a pixel diff.

Staging rules for `sit` (Gate 1 decision; the side-lying `lounge` was rejected):
- Seated on the front edge of the desk between the mouse and the lamp, facing the camera, bored expression; thighs on the desk, shins dangling over the edge; the left paw propped beside the hip, the right paw resting on the mouse; tail curled on the desk round the left hip.
- The hero camera never frames hips or stockings as the focal point.
- No arched back and no hip-forward line.
- Prepare alternative B as a backup: sprawled on the belly across the keyboard, chin on forearms.

### 3.10 Edge intrusions, fish, typing

Overlay camera: orthographic in CSS px (`left 0, right W, top H, bottom 0`); the cat scaled to `clamp(0.9 * H, 520, 900)` px per metre. The cat faces the viewer, as if looking into the screen from outside.

`lib/gags.ts` is a pure seeded scheduler:
- One gag at a time, each 4 s or shorter, minimum gap 6 s.
- At most one automatic gag per section entry.
- Pointer gags only with a fine pointer; none while the pointer is over an interactive element.
- Drawn only in the bottom 28% and outer 12% of the viewport.
- Escape cancels the current gag and silences gags for 60 s.

| Gag | Trigger | Implementation | Priority |
|---|---|---|---|
| `peek` | Section entry | Body below the bottom edge, ears and eyes rise, look-at follows the cursor; pointer-only proxy button over the head | Must |
| `fish` | Tap on an empty area of `main` (travel ≤ 6 px, not on `a, button, input, [data-no-fish]`, no selection) or header "Feed the cat" | Low-poly fish falls with gravity 2400 px/s²; an IK paw reaches, attaches, retracts; chomp SFX | Must |
| `typing` | After a peek, at random | `ui/typing-line.tsx` types and erases `asdfgh` in a fixed mono line (`aria-hidden`) | Must |
| `tail-sweep` | Section change while scrolling | `tail-up` pose plus spring, moves across 35% of the width | Nice (not built in M6; for after Gate 2) |
| `swat` | Pointer idle 600 ms within 220 px of an edge | The IK target is the cursor, three quick swats | Nice (not built in M6) |
| `glass` | Once per visit | Head close to the camera at a bottom corner, tilted, paw pads visible | Nice (not built in M6) |

M6 notes: the scheduler counts "entry" per IntersectionObserver event of a section crossing the middle 20% of the viewport, so a section re-entered later may gag again, subject to the gap; the first entry inside the monitor always peeks, so the e2e is deterministic. The fish falls and the paw reaches with the two-bone IK; the fish waits on the catch line (0.3 m above the edge) until the paw is up, then rides in the paw while the cat sinks. Gag timing runs on wall time, so idle stretches do not stall the gaps.

### 3.11 Loader, stand-in, fallbacks

- `ui/loader-veil.tsx` is server-rendered inside the hero slot: `CatFaceButton`, label, `role='progressbar'`. It is `pointer-events:none` except the face button.
- CSS hides the veil under `prefers-reduced-motion: reduce`, under `<noscript>`, when `data-room-mode='static'`, and through a failsafe animation after 20 s.
- Progress: 0.05 start; 0.30 chunk loaded; 0.30–0.90 model bytes (the loader's progress events in `lib/scene/cat/load-cat.ts`); 0.90 scene built; 1.0 as soon as the scene exists, whether or not a stage is on screen. Loading is abandoned after 15 s, giving `static`. The veil and the posters make way on the first drawn frame.
- Until the first frame the 2D face button stays live and the hero proxy stays disabled. After it, the face button is removed and `ui/pet-proxy.tsx` (a real button, "Pet the cat") tracks `scene.measure().cat`.
- If the visitor scrolls before the scene is ready, the pin and DOM warp already work; the veil stays over the stage with opacity `1 - smoothstep(0.6, 0.9, dive)`.
- Scene load timing: on idle after hydration in `full`; in `lite` only once the hero or finale has been within 120 px of the viewport (`useInView`, Appendix A.4).
- `ui/scene-error-boundary.tsx` (Appendix A.5) wraps the layer.

### 3.12 Sound

- `src/shared/lib/sound/audio-context.ts`: the shared context, extracted from `cat-sound.ts`.
- `sound-enabled.ts` gains `getSoundOptIn()` (the stored value is exactly `'true'`) and `hasSoundChoice()`.
- SFX and the meow keep today's default (on unless muted). Ambient plays only after an explicit opt-in and a user gesture.
- `features/toggle-sound/ui/sound-prompt.tsx`: an "Enable sound" chip shown while no choice is stored; clicking calls `setSoundEnabled(true)`.
- `ui/ambient-sound.tsx` renders nothing and starts or stops the engine.
- `ambient.ts` exposes `createAmbientGraph(ctx: BaseAudioContext, out: AudioNode)` (the graph: `setMood`, `schedule`, `fadeTo`) and imports nothing, so the e2e can load it as is; `ambient-engine.ts` holds the page-level `startAmbient`, `stopAmbient`, `setAmbientMood(dawn)`. Shipped recipe (the gains were tuned to the loudness window below; the brown noise is normalised to a peak of 1, so they are higher than the first draft's):

| Element | Recipe |
|---|---|
| Room tone | Looped brown noise (4 s, seeded), lowpass 320 Hz, gain 0.26 |
| PC hum | Sines at 55 and 110.5 Hz, gains 0.075 and 0.03, 0.13 Hz tremolo of depth 0.3 |
| Sparse plucks | Every 5–11 s, A-minor pentatonic sine, 2.4 s decay, gain 0.3, through a 0.38 s feedback delay (feedback 0.35, wet 0.4) |
| Dawn (mood > 0.5) | Short chirps (2.4 to 3.2 kHz sweeps, 80 ms, every 1.5–4 s, gain 0.12); hum halves |
| Master | 0.5 with 1.2 s fades |

- `sfx.ts`: key tick (the typing line), plop (the fish drop), chomp (the catch). Only the plop, always a gesture, may create the context; the others play on an existing one.
- The sandbox has no audio output: loudness is asserted by rendering 10 s through `OfflineAudioContext` (RMS between −34 and −26 dBFS, peak at most −9 dBFS) in `e2e/sound.spec.ts`, which strips the module's types with `node:module` and imports it from a blob URL. Measured: −27.6 dBFS RMS / −14.0 peak at night, −28.8 / −14.5 at dawn. The owner listens at Gate 2.
- The prompt is a fixed chip in the bottom-right corner (z 50), mounted by `widgets/cat-stage` once the room is ready, rather than a header item: the header has no room for it at 320 px, and the corner stays clear of the peeks and the copy.

### 3.13 Performance budget

| Item | Budget |
|---|---|
| Triangles | Cat 24.7k, room ≤ 6k, total ≤ 32k |
| Draw calls | Room phases ≤ 12 (≤ 19 with outlines); `inside` ≤ 9 |
| Textures | One (the sticker; downscale the 1024² source to 512² if needed) |
| `public/models/cat.glb` | ≤ 400 kB |
| Scene chunk | ≤ 200 kB gzipped, never in the initial route JS |
| Director tick excluding render | ≤ 2 ms |
| Web vitals | LCP element is text; CLS < 0.02 |

### 3.14 Accessibility

- Every section's text is server-rendered and visible without JS; nothing is revealed only by animation.
- Keyboard: skip link to `#about`; "Pet the cat" (face button or proxy) in the hero and finale tab order with a visible focus ring; "Feed the cat" button in the header (full mode only); the sound toggle is always present with `aria-pressed`.
- Gag proxies are pointer-only (`tabindex='-1'`, `aria-hidden`). The canvas, typing lines and posters are decorative (`aria-hidden`, empty `alt`).
- Reduced motion gives `static`: no pins, no canvas, no gags, no CSS entrances.
- Each automatic motion lasts under 5 s; audio never starts without opt-in and can always be stopped.
- Contrast: hero copy and credits sit on a scrim (`linear-gradient` from `--ink` at 85%), text in `--snow` or `--muted-foreground`.
- The counter is a polite live region only after a pet during this visit.

### 3.15 SEO and LCP

- The h1 (`profile.name`), role and all section text are in the prerendered HTML and never hidden.
- Posters use `getImageProps` with a `<picture>` (portrait source for `(max-aspect-ratio: 1/1)`), `fetchPriority='high'` on the night poster, default quality 75, and `images.formats = ['image/avif', 'image/webp']`.
- No `app/loading.tsx`.
- `public/models/*` gets `Cache-Control: public, max-age=31536000, immutable` through `headers()`; the URL carries `?v=<hash>` from `cat-rig.gen.ts`.

## 4. File plan

### 4.1 Create

Shared:
- `src/shared/config/credits.ts`: typed credit entries with the exact strings of §1.2.
- `src/shared/lib/math/vec3.ts`, `projection.ts`, `homography.ts`, `ease.ts`, `spring.ts`: tuple maths, no three.
- `src/shared/lib/sound/audio-context.ts`, `ambient.ts`, `sfx.ts`.
- The 2D face is `public/stickers/cat-sticker.png` wherever the plan says "2D face" (owner decision at Gate 1: no new drawing). No `cat-face` SVG component exists.
- `src/shared/ui/statement.tsx`, `meta-caption.tsx`, `room-poster.tsx`.

`src/features/boop-cat`:
- `ui/cat-face-button.tsx`: a labelled button around the sticker image (`public/stickers/cat-sticker.png`); calls `boop()` and `stampHearts`.

`src/features/toggle-sound`:
- `ui/sound-prompt.tsx`, `ui/ambient-sound.tsx`.

`src/features/cat-room`:
- `config/room-layout.ts`, `camera-tracks.ts`, `tuning.ts`, `poses.ts`, `cat-rig.gen.ts` (generated).
- `model/room-store.ts`, `room-mode.ts`, `phase.ts`, `timeline.ts`, `director.ts`.
- `lib/render-mode.ts`, `scene-time.ts`, `tap-gesture.ts`, `use-in-view.ts` (Appendix).
- `lib/camera-path.ts`, `screen-quad.ts`, `portal.ts`, `dpr-governor.ts`, `gags.ts`, `ik.ts`, `bone-names.ts`, `load-room-scene.ts`.
- `lib/scene/create-room-scene.ts`, `renderer.ts`, `materials.ts`.
- `lib/scene/room/kit.ts`, `build-room.ts`, `monitor.ts`.
- `lib/scene/cat/load-cat.ts`, `rig.ts`, `pose-mixer.ts`, `layers.ts`, `chains.ts`, `limb-ik.ts`.
- `lib/overlay.ts`, `lib/fish.ts`, `lib/scene/overlay/fish.ts`.
- `ui/room-layer.tsx`, `portal-stage.tsx`, `loader-veil.tsx`, `pet-proxy.tsx`, `typing-line.tsx`, `scene-error-boundary.tsx`.

Widgets (a widget never imports another widget; the page passes portal content as `children`):
- `src/widgets/site-header/ui/site-header.tsx`: handle, nav (Top, About, Stack, Contact), counter chip, Feed button, `SoundToggle`.
- `src/widgets/hero/ui/hero.tsx`, `hero-copy.tsx`.
- `src/widgets/manifesto/ui/manifesto.tsx`.
- `src/widgets/finale/ui/finale.tsx`, `credits.tsx`.
- `src/widgets/cat-stage/ui/cat-stage.tsx`: client composition of `RoomLayer` with `onPet={boop}`, the error boundary, `AmbientSound` and `SoundPrompt`. Features cannot import each other, so the wiring lives here.

Pages and app:
- `src/pages/lab/ui/lab-page.tsx`, `src/pages/lab/lib/lab-params.ts`.
- `app/lab/page.lab.tsx`, `app/icon.svg`, `app/apple-icon.png`.

Scripts, assets and docs:
- `scripts/inspect-model.mjs`, `check-assets.mjs`, `shots.mjs`, `capture-posters.mjs`, `lib/browser.mjs`, `lib/dev-server.mjs`, `lib/glb.mjs`.
- `CREDITS.md`, `docs/lookdev/gate-1/`.
- `public/models/cat.glb`, `public/posters/room-{night,dawn}{,-portrait}.jpg`. (`public/stickers/cat-sticker.png` already exists.)

### 4.2 Change

- `package.json`: dependencies and `assets:*` scripts; `verify` gains `pnpm assets:check`.
- `next.config.ts`: phase function, `pageExtensions`, `images.formats`, `headers()`.
- `playwright.config.ts`: launch arguments (Appendix A.9).
- `vitest.setup.ts`: a quiet `HTMLCanvasElement.prototype.getContext` stub returning `null`.
- `.gitignore` (`/artifacts/`), `.dockerignore` (`/artifacts`), `.github/workflows/ci.yml` (asset guard step).
- `assets/models/README.md`: add the inspect output.
- `app/layout.tsx`, `app/globals.css`, `app/not-found.tsx` (adds the sticker image; texts unchanged).
- `src/pages/home/ui/home-page.tsx`: the composition is `SmoothScroll`, `SiteHeader`, `CatStage`, `main` (`Hero` with `Manifesto` as children, `About`, `Stack`, `Contact`), then `Finale` with the footer statement as children.
- `src/widgets/about/ui/about.tsx`, `stack/ui/stack.tsx`, `contact/ui/contact.tsx`: rewritten as flat typographic sections.
- `src/shared/config/profile.ts`, `motion.ts`.
- `src/shared/lib/gsap/register.ts` (drop `MotionPathPlugin`, add config), `smooth-scroll.tsx`.
- `src/shared/lib/sound/cat-sound.ts`, `sound-enabled.ts`.
- `src/features/boop-cat/lib/stamp-hearts.ts`, `src/features/toggle-sound/ui/sound-toggle.tsx`.
- `README.md`, `AGENTS.md`: English site, latin fonts, 3D scene rules, asset pipeline, licence rule.

### 4.3 Delete

- `src/widgets/prologue/**`, `src/widgets/projects/**`, `src/widgets/footer/**`, `src/widgets/header/**`.
- `src/widgets/about/ui/hills.tsx`, `yarn-ball.tsx`, `src/widgets/contact/ui/sunset.tsx`.
- `src/shared/ui/boykisser-cat/**`, `src/shared/ui/chapter-label.tsx`, `chapter-trail.tsx`, `chapter-numeral.tsx`.
- `src/features/boop-cat/ui/boop-cat.tsx` and its test.
- `src/shared/lib/gsap/scene.ts` if nothing imports it.
- `app/favicon.ico`.
- CSS: the `story` variant, `.chapter-numeral`, `.star`, `.swing-tag`, `.zz` and their keyframes.

Keep `features/boop-cat/model/*` and all sound stores with their tests.

## 5. Asset pipeline

```
pnpm add three@0.186.1
pnpm add -D @types/three@0.186.0
```

Pin `three` exactly. No other dependency.

Model build (one-off; the output is committed). Check `--help` for the exact flags of the installed CLI version:

```
pnpm dlx @gltf-transform/cli@4.5.1 dedup assets/models/source/boykisser_custom_low_poly_avatar_scratch_model.glb artifacts/model/1-dedup.glb
pnpm dlx @gltf-transform/cli@4.5.1 prune artifacts/model/1-dedup.glb artifacts/model/2-prune.glb
pnpm dlx @gltf-transform/cli@4.5.1 meshopt artifacts/model/2-prune.glb public/models/cat.glb --level medium
pnpm assets:inspect --write-rig
```

Never run `optimize`, `join`, `flatten`, `simplify`, `palette` or `weld` on the cat.

| Script | Does |
|---|---|
| `pnpm assets:inspect` | `scripts/inspect-model.mjs`, a dependency-free reader of the GLB JSON chunk (`scripts/lib/glb.mjs`). Prints triangles, meshes, materials, attributes (is `NORMAL` present?), skin joints with parents and bounding boxes for the source model and for `public/models/cat.glb`. Paste the result into `assets/models/README.md` and compare it with §1.3. With `--write-rig` it writes `src/features/cat-room/config/cat-rig.gen.ts` (bone keys and parents in skin order, byte size, SHA-256 prefix) from `public/models/cat.glb` and formats that file with Biome. |
| `pnpm assets:shots` | Lab screenshots (§3.9). The source model is injected with `page.route('**/__lab/*.glb', …)` from `assets/models/source/`; the app never serves it. |
| `pnpm assets:posters` | Renders the night and dawn rooms with the fake screen at 1920×1200 and 1080×1920 into `public/posters/`; `app/apple-icon.png` from the sticker PNG. |
| `pnpm assets:check` | Fails if any `.glb`, `.gltf` or `.bin` exists under `public/` other than `models/cat.glb`; if any file under `public/` has the SHA-256 of a source model; if `cat-rig.gen.ts` does not match the committed GLB. |

Fallbacks:
- If `--compare-source` shows a skinning difference after quantisation, rebuild without the `meshopt` step (dedup and prune only) and accept the larger file.
- If Chromium cannot be downloaded in the sandbox, set `CHROME_PATH`; `scripts/lib/browser.mjs` passes it as `executablePath`.

## 6. English content pass

- `profile.ts`:
  - `about`: "I build layouts with HTML and CSS and I'm leveling up in JavaScript, React, Next.js and TypeScript."
  - `location`: "Remote".
  - `lookingFor`: "Internships", "Junior roles", "HTML/CSS layout gigs".
  - `now`: "Personal site: in progress".
  - New fields: `tagline`, `statement`, `footerStatement` with the texts of §1.1.
  - `projects` stays in the type and stays empty.
  - The owner confirms the wording at Gate 2.
- `app/layout.tsx`: `lang='en'`, font subsets `['latin']`.
- Labels: "Sound", "Sections", "Pet the cat" (the same name on every stage), "Feed the cat", "Enable sound", "Building the room…", counter "boops: N", skip link "Skip to content".
- Remove the heart label text in `stamp-hearts.ts`; translate the warning in `cat-sound.ts`.
- Micro-copy:
  - Captions "(01) Role", "(02) About", "(03) Stack", "(04) Contact".
  - Stack statuses "In use" and "Learning".
  - Contact lead: "Write to me, tell me about the task, or just pet the cat."
  - Hero hint "Scroll to dive in"; "Back to top".
  - Footer line `profile.handle · profile.location`, with no year.
- Tests and e2e: replace every Russian expectation; the 404 texts stay.

## 7. Milestones

Run `pnpm verify` and `pnpm build` after every milestone; `pnpm test:e2e` from M2 on. One commit per milestone unless noted. The effort column is a budget: when it runs out, take the fallback instead of pushing on.

| # | Scope | Acceptance | Effort budget and fallback |
|---|---|---|---|
| M0 | Dependencies, the model build, inspect and check scripts, guard in `verify` and CI, Playwright arguments, model facts recorded. Verify the sandbox network: registry, Playwright browser, Google Fonts during `next build`. | `cat.glb` ≤ 400 kB; the guard fails when a source is copied into `public/` (unit-tested); headless WebGL confirmed with a one-page smoke run. | 0.5 d |
| M1 | Look-dev in the lab only: renderer, room, rig, poses `sit`, `stretch`, `sleep`, idle layers, shading variants, sticker placement. The home page is untouched. | Gate package in `docs/lookdev/gate-1/`: hero night 1920×1200 and 390×844; cat close-up, side, top; stretch; finale dawn; sleep close-up; shading A and B; sticker; dive tunnel at p = 0.95; a README listing what to approve. | 3 d. If the pose still collapses or interpenetrates after 1.5 d, also deliver alternative B. Hair springs are optional. |
| **Gate 1** | **Stop. The owner approves the pose, room, night and dawn palettes, shading variant, sticker, sock placement and whether the film grain stays.** (Gate 1 feedback: the 2D face is the sticker PNG, no new drawing.) Nothing in M3–M8 starts before approval. | | |
| M2 | English content pass and the whole static page (all new widgets, `CatFaceButton`, placeholder poster, credits). Independent of the look; may run while Gate 1 is pending. | No-JS and reduced-motion e2e green; no Russian text left; overflow tests at 320, 360 and 390 px. | 1.5 d |
| M3 | Posters captured; modes, store, director, `RoomLayer`, veil with real progress, all fallbacks, hero `room` phase, pet proxy. | `data-room-mode='full'` and `data-scene-ready='true'` under SwiftShader; every fallback e2e green; three absent from initial chunks. | 1.5 d |
| M4 | Dive: pin, camera path, portal, docking, tail flick, typing line. | At dive end the portal's computed transform is `none` and the phase is `inside`; mid-dive alignment error ≤ 2 px (§8); `--sequence dive` reviewed. | 2 d. Fallback: draw the first section's statement into a `CanvasTexture` on the screen and crossfade the canvas to the un-warped DOM section over p 0.85–1. |
| M5 | Finale: pull-back, dawn, sleep, credits, finale proxy. | Phase `finale` at the bottom; credits visible with working links; `--sequence finale` reviewed. | 1 d |
| M6 | Overlay camera, scheduler, gags, fish, header Feed button. | Must-have gags work by pointer and keyboard; no gag over an interactive element; nothing rendered while idle. | 2 d. Ship the must-haves; drop nice-to-haves that are not convincing. |
| M7 | Ambient, prompt, SFX. | Offline loudness assertion; opt-in and mute e2e. | 1 d |
| M8 | Lite pass, performance and accessibility checks, docs. | Full e2e matrix green; budgets of §3.13 met. | 1.5 d. If lite 3D is unstable at 390×844, lite becomes static and this is recorded in `README.md`. |
| **Gate 2** | **Stop. The owner reviews the production build on a real GPU: desktop Chrome, Firefox, Safari and a phone; listens to the sound; confirms the texts.** | | |

What to look at in screenshots:
- Flat colours with no banding or tone-mapping shift (sample a wall pixel against its hex).
- The screen fully visible above the cat at rest.
- The cat reads as a silhouette with distinguishable limbs.
- No mesh interpenetration at the hero framing.
- Nothing of the cat inside the tunnel at p ≥ 0.9.
- DOM text edges coincide with the bezel in every dive frame.
- The dawn frame shows the window.

## 8. Test plan

Unit (Vitest, no three):
- `homography`: corners map exactly; identity for the viewport rectangle; `null` when degenerate.
- `projection`: known points.
- `camera-path`: at p = 1 the projected screen equals the viewport within 0.5 px for aspects 1.2, 1.6, 1.78 and 2.4.
- `resolvePhase` and `selectRoomMode`: full tables.
- `dpr-governor`: declines, recovers, locks after 3 flips.
- `scene-time`, `tap-gesture`, `spring` (stable under clamped dt).
- `ik` (reachable, clamped, lengths preserved).
- `gags` (seeded: gaps, caps, exclusions).
- `bone-names` (name table).
- `poses` integrity: keys exist in `cat-rig.gen.ts`, none is `popka*` or `shoulder_*`, values finite.
- `room-store`.
- `sound-enabled` opt-in; `ambient` graph on a fake context.
- The asset guard function.
- The three import boundary.

Component (scene mocked through `vi.mock('../lib/load-room-scene')`):
- `room-layer`: static under reduced motion without probing; loads in full; rejection, timeout and context loss give static; the proxy calls `onPet`; unmount disposes.
- `loader-veil`, `cat-face-button`, `sound-prompt`, `sound-toggle`, `portal-stage` (registers and unregisters).
- `home-page`: h1, role, about, every skill, credits text, no Projects heading.

E2E (Playwright; move the existing helpers `gotoHydrated`, `collectProblems`, `waitForScrollToSettle`, `scrollThrough`, `horizontalOverflow` to `e2e/helpers.ts`; always wait for hydration before clicking; 3D tests serial with a 90 s timeout):
1. No JS: every profile field visible, poster visible, veil hidden, no canvas.
2. The h1 is visible at opacity 1 from the first frame for 2.5 s.
3. No initial chunk contains `WebGLRenderer`; the scene chunk is requested only after hydration (Appendix A.10).
4. Full mode: mode and ready attributes set; poster hidden; no console errors or failed requests.
5. Dive: at the end the transform is `none`, the phase is `inside`, the statement is in the viewport. Mid-dive: four zero-size corner markers inside the portal (read with `getBoundingClientRect`) land where a screenshot changes from the section background to the bezel colour, within 2 px.
6. Finale: phase `finale`, credits contain the CC BY text and links, "Back to top" works.
7. Fallbacks: reduced motion, no WebGL, context loss, an aborted scene chunk and an aborted GLB each give `static`, no pin spacer, readable content, a face button that still counts.
8. Pet: a proxy click and Enter/Space increment `boop-count` and start the meow (spy on `AudioBufferSourceNode.prototype.start`); the counter survives reload.
9. Feed: a tap on an empty area and the header button increment `data-fish-count`; a click on a link does not.
10. Sound: the prompt is visible without a choice; after the click the context is running and sources started; toggle off is silent and persists; offline loudness in range.
11. Lite at 390×844 and 360×740, plus 320×640: no horizontal overflow through the whole scroll, no pin spacer.
12. Licence: the only `.glb` response is `/models/cat.glb`.
13. `/lab` is 404 in the production build; the 404 page texts are unchanged.
14. Tab order never lands inside `aria-hidden`; the focus ring is visible; `lang='en'`.

## 9. Risks and open questions

| Risk | Mitigation |
|---|---|
| Skin weights were not made for a lying pose. | Probe sheets, `aim` posing, alternative pose B, Gate 1. |
| White unlit limbs merge. | Shading variants at Gate 1. |
| Minified DOM text shimmers on the monitor; Safari or Firefox differences with `matrix3d` under a pin. | `will-change` only during the dive; the M4 budget and fallback; real-browser check at Gate 2. |
| SwiftShader is slow in CI. | Device scale factor 1, serial 3D tests, long timeouts, an asset timeout separate from the first frame. |
| Phones: GPU, battery, context loss. | Lite scope, loop only while visible, DPR cap and governor, static fallback. |
| A source or licence-restricted file leaks into the build or the public repository. | Asset guard in `verify` and CI, `.dockerignore`, the e2e check; model B is never committed. |
| Stacking-context regressions hide the hero copy or credits. | The rule in §3.2; an e2e `elementFromPoint` check on the h1. |
| Restricted network in the sandbox (registry, Playwright browser, Google Fonts during `next build`). | Verify all three in M0. If fonts cannot be fetched, ask the owner before switching to `next/font/local` with the OFL files committed. |
| Sound cannot be heard in the sandbox. | Offline loudness test; owner check at Gate 2. |
| Intrusions become annoying. | Budgets and exclusions of §3.10; Escape. |

Resolved by the owner: the click sound stays as is and gets no credit line; the repository will become public; the counter label is "boops".

## 10. Appendix: reference snippets

Carried over from an earlier 3D prototype of this site that is no longer in the repository. Tabs as in the originals.

### A.1 `lib/render-mode.ts`

```ts
import { useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function getReducedMotion(): boolean {
	if (typeof window.matchMedia !== 'function') return false
	return window.matchMedia(REDUCED_MOTION).matches
}

function subscribeReducedMotion(listener: () => void) {
	if (typeof window.matchMedia !== 'function') return () => {}
	const query = window.matchMedia(REDUCED_MOTION)
	query.addEventListener('change', listener)
	return () => query.removeEventListener('change', listener)
}

/** Server snapshot is `true`, so SSR and hydration always render the 2D cat. */
export function useReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotion,
		() => true,
	)
}

let webglSupport: boolean | undefined

/** A software renderer would make the room crawl: that counts as "no WebGL". */
const PROBE_OPTIONS: WebGLContextAttributes = {
	failIfMajorPerformanceCaveat: true,
}

export function detectWebGL(): boolean {
	if (webglSupport === undefined) {
		try {
			const canvas = document.createElement('canvas')
			const context =
				canvas.getContext('webgl2', PROBE_OPTIONS) ??
				canvas.getContext('webgl', PROBE_OPTIONS)
			webglSupport = Boolean(context)
			// Free the probe context right away instead of waiting for GC.
			if (context && 'getExtension' in context)
				context.getExtension('WEBGL_lose_context')?.loseContext()
		} catch {
			webglSupport = false
		}
	}
	return webglSupport
}

/** Test hook: forget the cached probe result. */
export function resetWebGLDetection() {
	webglSupport = undefined
}

const noopSubscribe = () => () => {}
const never = () => false

/** `enabled: false` skips the probe entirely (reduced motion already forces 2D). */
export function useWebGLSupport(enabled = true): boolean {
	return useSyncExternalStore(
		noopSubscribe,
		enabled ? detectWebGL : never,
		never,
	)
}
```

### A.2 `lib/scene-time.ts`

```ts
/**
 * Animation clocks accumulate frame deltas instead of reading a renderer
 * clock. A tab that was in the background delivers one huge delta on return;
 * clamp it so nothing teleports.
 */
export const MAX_FRAME_DELTA = 0.1

export function advance(clock: { current: number }, delta: number): number {
	clock.current += Math.min(Math.max(delta, 0), MAX_FRAME_DELTA)
	return clock.current
}
```

### A.3 `lib/tap-gesture.ts`

```ts
/** Pointer travel (px) above which a click counts as a drag. */
export const DRAG_THRESHOLD_PX = 6

export function isBoopClick(
	travelPx: number,
	threshold = DRAG_THRESHOLD_PX,
): boolean {
	return Number.isFinite(travelPx) && travelPx >= 0 && travelPx <= threshold
}
```

### A.4 `lib/use-in-view.ts`

```ts
import { type RefObject, useEffect, useState } from 'react'

export type InViewState = {
	inView: boolean
	/** Latches to true the first time the element is seen. */
	entered: boolean
}

export function useInView(
	ref: RefObject<Element | null>,
	rootMargin = '120px',
): InViewState {
	const [state, setState] = useState<InViewState>({
		inView: false,
		entered: false,
	})

	useEffect(() => {
		const element = ref.current
		if (!element) return
		if (typeof IntersectionObserver === 'undefined') {
			setState({ inView: true, entered: true })
			return
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				const visible = entry?.isIntersecting ?? false
				setState((prev) =>
					prev.inView === visible && (prev.entered || !visible)
						? prev
						: { inView: visible, entered: prev.entered || visible },
				)
			},
			{ rootMargin },
		)
		observer.observe(element)
		return () => observer.disconnect()
	}, [ref, rootMargin])

	return state
}
```

### A.5 `ui/scene-error-boundary.tsx`

```tsx
'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback: ReactNode; onError: () => void }

/** A WebGL renderer that fails to start must degrade to the 2D cat, not crash the page. */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
	state = { failed: false }

	static getDerivedStateFromError() {
		return { failed: true }
	}

	componentDidCatch() {
		this.props.onError()
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children
	}
}
```

### A.6 Lazy-loading rule for React components

If a React component is ever loaded with `next/dynamic`, it must be declared inside a Client Component, and its `loading` component must rethrow:

```tsx
const CatScene = dynamic(() => import('./cat-scene'), {
	ssr: false,
	loading: ({ error }) => {
		// A failed chunk download must degrade to the 2D cat: the App Router
		// loadable throws it from React.lazy, the shared one hands it here.
		if (error) throw error
		return null
	},
})
```

The prototype also established the stand-in rules used in §3.11: the 2D cat stays mounted and clickable until the first rendered frame; the scene wrapper is `pointer-events-none` until then; the stand-in lingers 450 ms under a crossfade.

### A.7 Renderer settings proven in the prototype

DPR range `[1, 1.75]`; a monitor that after 3 flips falls back to DPR 1; `alpha: true, antialias: true`; a `webglcontextlost` listener on the canvas; the loop stopped whenever the scene is off-screen; the first frame reported on the animation frame after the first render.

### A.8 Inverted-hull outline (only for shading variant C)

For skinned meshes add the skinning chunks and displace along `objectNormal` before skinning.

```ts
function createInkMaterial(thickness: number, color: ColorRepresentation) {
	return new ShaderMaterial({
		side: BackSide,
		uniforms: {
			thickness: { value: thickness },
			color: { value: new Color(color) },
		},
		vertexShader: /* glsl */ `
			uniform float thickness;
			void main() {
				vec4 mvPosition = modelViewMatrix * vec4(position + normal * thickness, 1.0);
				gl_Position = projectionMatrix * mvPosition;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 color;
			void main() {
				gl_FragColor = vec4(color, 1.0);
				#include <colorspace_fragment>
			}
		`,
	})
}
```

### A.9 Playwright launch arguments (`playwright.config.ts`)

```ts
projects: [
	{
		name: 'chromium',
		use: {
			...devices['Desktop Chrome'],
			launchOptions: {
				// Software WebGL, so the 3D scene is exercised on runners without a GPU.
				args: [
					'--use-angle=swiftshader',
					'--enable-unsafe-swiftshader',
				],
			},
		},
	},
],
```

In the prototype the probe of A.1 passed under these flags and the 3D path was exercised. Assert `data-room-mode='full'` in the 3D tests so a silent downgrade fails the suite. Use the same arguments in `scripts/lib/browser.mjs`.

### A.10 E2E helpers from the prototype

```ts
/** Only the lazily loaded three.js scene chunk carries the renderer. */
const SCENE_CHUNK_SIGNATURE = 'WebGLRenderer'

/** Holds (or aborts) the three.js chunk so the page can be checked without it. */
async function interceptSceneChunk(
	page: Page,
	mode: 'hold' | 'abort',
): Promise<SceneChunkControl> {
	let release = () => {}
	const released = new Promise<void>((resolve) => {
		release = resolve
	})
	let markRequested = () => {}
	const requested = new Promise<void>((resolve) => {
		markRequested = resolve
	})
	await page.route('**/_next/static/chunks/*.js', async (route: Route) => {
		const response = await route.fetch()
		const body = await response.text()
		if (!body.includes(SCENE_CHUNK_SIGNATURE)) {
			await route.fulfill({ response, body })
			return
		}
		markRequested()
		if (mode === 'abort') {
			await route.abort('failed')
			return
		}
		await released
		await route.fulfill({ response, body })
	})
	return { release, requested }
}
```

No WebGL:

```ts
await page.addInitScript(() => {
	const getContext = HTMLCanvasElement.prototype.getContext
	HTMLCanvasElement.prototype.getContext = function (
		this: HTMLCanvasElement,
		type: string,
		...rest: unknown[]
	) {
		if (type.startsWith('webgl') || type === 'experimental-webgl')
			return null
		return (getContext as (...a: unknown[]) => unknown).call(
			this,
			type,
			...rest,
		)
	} as typeof getContext
})
```

Context loss:

```ts
await canvas.evaluate((node: HTMLCanvasElement) => {
	const gl = node.getContext('webgl2') ?? node.getContext('webgl')
	gl?.getExtension('WEBGL_lose_context')?.loseContext()
})
```
