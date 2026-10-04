# Gate 1: look-dev package

Rendered from the dev-only `/lab` route with `pnpm assets:shots --gate`
(headless Chromium, software WebGL, device pixel ratio 1, animation clock
frozen at t = 2.4 s). The home page is untouched; nothing here is wired into
the site yet. Every shot can be reproduced by opening the lab URL in the
table with `pnpm dev` running.

## Changes since the first package (owner feedback, round 1)

1. **Hind legs of the awake cat.** The shins no longer fold into the thighs:
   the knees bend about 90° with the paws tucked under the belly, written as
   `aimWorld` directions (see below). `cat-top.png`, `cat-side.png`.
2. **The sleep pose** is rebuilt from the owner's photo: on the back, belly
   up, rolled a little towards the visitor, head tipped back, both front paws
   stretched past the head, hind legs long and loose, tail curled away. The
   eyes are closed: the pupils and the black eye outlines collapse into the
   head and a `︶` stroke grows over each eye (the model has no eyelids or
   morph targets). `finale-dawn-1920x1200.png`, `sleep-close-up.png`,
   `sleep-side.png`.
3. **Keyboard and mouse** are no longer boxes: the keyboard is a chamfered
   wedge with bevelled keycaps and a space bar, the mouse a twelve-sided dome
   lofted from five rings with a rose scroll wheel. `desk-props.png`.
4. **The lamp** is an articulated desk lamp: round base, short post, two arm
   segments with knobs at the joints, a conical rose shade aimed at the desk
   and a pale bulb disc inside. `lamp.png`, `hero-night-1920x1200.png`.

## What to approve

| # | Decision | Look at | Lab URL |
|---|---|---|---|
| 1 | **The lounge pose** (binding decision 4): side-lying along the desk, head propped on the left paw, right paw on the keys, knees bent with the paws tucked under the belly, tail up in front of the screen, bored look at the visitor. | `hero-night-1920x1200.png`, `cat-close-up.png`, `cat-side.png`, `cat-top.png` | `/lab?view=hero`, `/lab?view=turntable&pose=lounge&cam=close\|side\|top` |
| 2 | **The room** (decision 1): desk, flat monitor, small tower with the sticker, keyboard, mouse, window with the moon, articulated lamp, socks with paw prints on the floor (visible in the portrait shot). Nothing else was added; a shelf or a mug would need approval. | `hero-night-1920x1200.png`, `hero-night-390x844-lite.png`, `desk-props.png`, `lamp.png` | `/lab?view=hero`, `/lab?view=hero&lite=1`, `/lab?view=turntable&cam=desk\|lamp` |
| 3 | **Night palette**: ink walls with a lavender tint, plum-rose desk, orchid screen glow, rose lamp pool, lavender moonlight. All colours are palette tokens or mixes of them (`src/features/cat-room/lib/scene/room/build-room.ts`, `PAINTS`). | `hero-night-1920x1200.png` | `/lab?view=hero` |
| 4 | **Dawn palette and the sleep pose**: the window turns lavender-to-rose and the moon fades into the sky, the walls lift to a blush-grey plum, a sun patch lands on the floor and the desk, the monitor goes dark; the cat sleeps on its back with closed eyes. | `finale-dawn-1920x1200.png`, `sleep-close-up.png`, `sleep-side.png` | `/lab?view=finale&p=1`, `/lab?view=turntable&pose=sleep&dawn=1&cam=close&yaw=60&pitch=45&dist=0.75`, `/lab?view=turntable&pose=sleep&dawn=1&cam=side` |
| 5 | **Shading variant**: A keeps the authored unlit colours (flat white limbs); B multiplies by a two-step tone from the flat face normal against a key direction, which separates the limbs from the torso. Variant C (plum outline) was not built. | `shading-a.png`, `shading-b.png` | `/lab?view=turntable&cam=quarter&shading=a\|b` |
| 6 | **The 2D face SVG** (`src/shared/ui/cat-face/cat-face.tsx`): an original drawing after the avatar: wedge head with cheek tufts, tall ears with rose insides, slanted black almond eyes with heavy lids, three blush dots a side, a small `w` mouth; CSS ear twitch; an `asleep` variant for the finale. | `face-svg-vs-3d.png` | `/lab?view=face&cam=face` |
| 7 | **The sticker** on the tower's front panel, tilted 9°, left of the vent slots. | `sticker.png` | `/lab?view=turntable&cam=sticker` |
| 8 | **Sock placement**: a pair on the floor in front of the desk, paw prints up. Only the portrait framing shows them; from the desktop hero camera the desk hides the floor. | `hero-night-390x844-lite.png` | `/lab?view=hero&lite=1` |
| 9 | **Film grain**: the lab renders without the page's `body::after` grain. Keep it over the 3D room, or drop it? | compare any shot with the current site | — |

Also in the package:

- `stretch.png`: the click reaction (`stretch` pose plus the meow jaw). `/lab?view=turntable&pose=stretch&cam=quarter&meow=1`
- `dive-mid-p065.png` and `dive-tunnel-p095.png`: the dive track at p = 0.65 (the tail is leaving the screen) and p = 0.95 (the screen fills the viewport, no part of the cat inside the tunnel). `/lab?view=dive&p=0.65`, `/lab?view=dive&p=0.95`
- `probe-head.png`: one of the probe contact sheets used to read the bones' local axes (rest and +30° about x, y, z, front and side).

## What to look at (plan §7)

- Flat colours with no banding or tone-mapping shift: sample the back wall against `#1a1420` (night, `mix(ink, lavender, 7%)`) and the desk against `#4a2536`.
- The screen fully visible above the cat at rest: only the tail crosses the screen; the head stays below the bezel.
- The cat reads as a silhouette with distinguishable limbs: compare `shading-a.png` with `shading-b.png`.
- No mesh interpenetration at the hero framing: the lower paw sits under the cheek, the upper paw on the keys, the knees in front of the belly, the shins clear of the thighs (`cat-top.png`).
- Nothing of the cat inside the tunnel at p ≥ 0.9: `dive-tunnel-p095.png`.
- The dawn frame shows the window: `finale-dawn-1920x1200.png`.
- The sleeping face: closed eyes, no pupil or outline showing from any angle (`sleep-close-up.png`, `sleep-side.png`; orbit with `&yaw=`/`&pitch=`).

## How it was built

- Room: one merged mesh of boxes, cylinders, discs, lofts and quads with two colour attributes (night, dawn) and a per-face tone from the normal; painted light is a second mesh of transparent quads. The keyboard, the mouse and the lamp come from the kit's `loft`, `tube`, `sphere` and `fan` helpers (`src/features/cat-room/lib/scene/room/kit.ts`). About 1,600 triangles plus the monitor.
- Cat: `public/models/cat.glb` (190 kB, one skin, 134 joints), normalised to 0.62 m. Poses are `aim` directions (character space) or `aimWorld` directions (the placed cat's world: +X along the desk towards the head side, +Y up, +Z towards the visitor) compiled into local rotations; the lounge, stretch and sleep poses live in `src/features/cat-room/config/poses.ts`. Idle layers on top: breathing, head and eye look-at towards the camera (off while asleep), ear twitches, the jaw on a meow, verlet springs on the tail and the ears (hair springs exist but are off by default). The stepped 12 fps clock is a lab toggle (`&stepped=1`).
- Closed eyes (`src/features/cat-room/lib/scene/cat/eyelids.ts`): measured from the loaded model, each eye's black outline is a ring and a crease skinned to the head within one pupil-size of the pupil. The sleep pose rolls the eye bones 180°; that roll drives `uEyesClosed`, which moves those vertices and the pupils to a point inside the head through a `sleepShift` vertex attribute, and scales a stroke on the head bone up from the same point. The stroke follows a quadratic fit of the eye surface.
- `--compare-source`: the rest pose of the fixed, uncompressed model against the shipped meshopt file differs in 0.011% of pixels (quantisation is visually lossless).

## Deviations from the plan, for the record

- The source GLB stores the body, fur, black details and stockings 26.76 times smaller than the skin's bind space (the bows are at scale). `scripts/fix-model-space.mjs` rescales those positions before compression; see `assets/models/README.md`.
- `meshopt` runs with `--quantization-volume scene --quantize-position 16`: the per-mesh default clones the skin seven times.
- `prune` drops `NORMAL` and `TEXCOORD_0` (unlit, untextured); shading B uses screen-space derivative normals instead.
- The window sits lower than the plan's first guess so the moon is inside the hero framing; the lite pull-back factor is 1.0 instead of 1.35 (the 390×844 shot was too distant); the cat's spot moved to x = 0 so the head clears the lamp.
- Room and glow materials are double-sided: large single quads (walls, sky, light pools) must show whatever their winding.
- `aimWorld` was added next to `aim`: the limbs of a lying cat are far easier to write in the world of the placed cat than in the character space of a standing one.
- The plan's "no eyelids" limit is lifted by the collapse-and-stroke mechanism above instead of a second model or morph targets; the sleep pose is supine (the plan's first guess was curled up).
- The lab's `side` camera orbits at 70° instead of 90°, where the new lamp shade would sit between the camera and the cat.

## Known limits

- The eyes close over the 0.6 s pose blend: the pupils roll back while the outline shrinks and the stroke grows. There is no separate blink.
- The pink tail tuft extends 0.4 m beyond the last tail bone in the authored mesh, so the tuft is large and moves as one piece.
- The lab screenshots use software WebGL; colours are exact, anti-aliasing matches a real GPU closely but not pixel for pixel.
