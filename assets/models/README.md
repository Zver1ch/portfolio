# Source models

Third-party 3D assets supplied by the site owner. They are **not** covered by
the repository's MIT licence; each keeps its own licence.

| File | Title and author | Source | Licence |
|---|---|---|---|
| `source/boykisser_custom_low_poly_avatar_scratch_model.glb` | "Boykisser Custom Low Poly Avatar (Scratch Model)" by [NEGATIVEMARE](https://sketchfab.com/kakoicapital) | [Sketchfab](https://sketchfab.com/3d-models/boykisser-custom-low-poly-avatar-scratch-model-8f695ab60950464db46134f19fd727b5) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

## Rules

- `source/` holds the untouched download. Nothing in this directory is served
  by the site: only optimised or rendered outputs go to `public/`.
- **Avatar (CC BY 4.0).** An optimised copy may ship with the site.
  Attribution is mandatory wherever it is used: title, author, source,
  licence, and a note that it was modified. The exact credit text is in
  [`docs/cat-room-plan.md`](../../docs/cat-room-plan.md), §1.2.

## Sticker render

`public/stickers/cat-sticker.png` is a render of "Boy Kisser 2D" by
[Nyamewsis](https://sketchfab.com/Nyamewsis)
([Sketchfab](https://sketchfab.com/3d-models/boy-kisser-2d-6771664a8c4d431185bf012ec83b3e7e),
[Sketchfab Free Standard](https://sketchfab.com/licenses) licence): the line
art in `#f4f4f8`, the blush marks in `#da85af`, transparent background,
1024×1024.

That licence forbids making the model file available as a stand-alone file,
so the model itself is deliberately **not** in this repository. Never commit
it; ship only the render.

## Build

`pnpm assets:model` (`scripts/build-model.mjs`) turns the source into
`public/models/cat.glb`, the only model file the site serves:

```
dedup → prune → fix-model-space → tuck-stockings → meshopt --level medium --quantization-volume scene --quantize-position 16
```

- `dedup`, `prune` and `meshopt` are one-off runs of
  `pnpm dlx @gltf-transform/cli@4.5.1`. Never `optimize`, `join`, `flatten`,
  `simplify`, `palette` or `weld`: they can alter the rig or the authored look.
- `tuck-stockings` (`scripts/tuck-stockings.mjs`) pulls the body vertices
  under the stockings 30% towards each leg's axis. The stockings are a
  separate skinned mesh with rings 5–6 cm apart; on a bent knee they cut the
  corner with a straight chord while the denser white leg follows the arc,
  and a white kneecap pokes through. The covered leg is never visible, so
  thinning it changes nothing at rest and keeps it inside the stocking when
  bent. The band is the stocking's vertical extent minus 2 cm at each edge,
  within 12 cm of the hip-to-ankle axis; 1,000 of the 9,249 body vertices
  move. Bind-space units come from the hip-to-ankle distance measured in
  both spaces (13,572 per metre): the bind matrices carry a non-uniform
  scale, so their columns cannot be used for that.
- `prune` drops `NORMAL` and `TEXCOORD_0`: every material is unlit and
  untextured, so neither is read. Shading variants that want normals derive
  flat ones from screen-space derivatives in the fragment shader.
- `--quantization-volume scene` matters: with the default per-mesh volumes
  `quantize` clones the skin once per mesh (7 skins × 134 joints) because
  each mesh needs its own dequantisation baked into the inverse bind
  matrices. One shared volume keeps the single authored skin.
- `scripts/fix-model-space.mjs` is ours; see the next section.
- Afterwards `pnpm assets:inspect --write-rig` regenerates
  `src/features/cat-room/config/cat-rig.gen.ts` (bone keys and parents in
  skin order, byte size, SHA-256 prefix). `pnpm assets:check` (in `verify`
  and CI) fails when that file and the GLB disagree.

Intermediates land in `artifacts/model/` (git-ignored).

### Bind space

Sketchfab exported the avatar with one skin but two vertex scales. The two
bow meshes are stored in the skin's bind space; the body, the fur, the black
details and the stockings are stored 26.76 times smaller, about the same
origin. Rendered as downloaded (three.js, the Khronos sample viewer, Blender),
the body collapses to a 7 cm blob at the feet of a 1.75 m skeleton while the
bow floats at neck height. `fix-model-space` multiplies the positions of
those five meshes by 26.76 before compression; nothing else changes.

The factor was calibrated on the source file against the bones, in scene
metres:

| Landmark | Mesh (×26.76) | Bone |
|---|---|---|
| Lowest body vertex | y 0.004 | `Foot_L_end` y 0.006 |
| Highest ear vertex | y 1.751 | `Ear_L.002_end` y 1.753 |
| Left pupil centre | (0.064, 1.471, 0.061) | `LeftEye` (0.064, 1.480, 0.041) → end (0.064, 1.480, 0.061) |
| Thigh vertices (`leg_l`) | y 0.387–0.711, centred x 0.106 | `Leg_L` y 0.731 → `Knee_L` y 0.386, x 0.106 |
| Stocking thigh (`leg_l`) | y 0.385–0.710, centred x 0.106, 4% wider than the leg | same |
| Bow (`neck`, ×1) | centred (0.000, 1.328, 0.019) | `Neck` (−0.002, 1.327, −0.060) |

A least-squares fit of vertex-cluster centroids against joint positions gives
25.6 for the body and 32.8 for the stockings, but those centroids sit off
the joints along each bone; the landmarks above agree to 2 mm only with one
common factor, 26.76.

## Facts

Measured by `pnpm assets:inspect` (`scripts/inspect-model.mjs`), which reads
the glTF JSON chunk and the uncompressed vertex data without three.js or the
glTF Transform SDK. The output below is pasted as printed; the shipped
model's skin table is identical to the source's and omitted.

Compared with the plan (`docs/cat-room-plan.md` §1.3):

- Triangles, vertices, meshes, materials, colours, the 134-joint skin, the
  node chain and the absence of animations and morph targets match.
- `popka` and `popka.001` influence 62 vertices each (124), not 83; all
  `hair*` bones together influence 1,964 vertices of the white mesh, not
  1,526. Both figures here count vertices with a non-zero weight per joint,
  so a vertex shared by two hair bones counts twice.
- The proportions in §1.3 are fractions of the height to the head of the
  last ear bone (`Ear_L.002`, 1.674 m). To the `_end` leaf, the actual ear
  tip (1.753 m), each fraction is about 0.05 lower. In scene metres: knee
  0.386, hip joint 0.731, hips 0.933, chest 1.088, neck 1.327, head 1.380,
  eyes 1.480, shoulder joint 0.125 → wrist 0.651 (x), feet at 0.
- Eyes: each pupil is 64 vertices of the black mesh skinned to `LeftEye` /
  `RightEye`, a dome 0.054 × 0.061 m wide and 0.043 m deep in source metres
  whose centre sits 0.020 m in front of the eye bone along +Y. Each eye's
  black outline belongs to the head: a ring of 32 vertices (0.082 × 0.055 m,
  centred 0.009 m outboard of the pupil) and a crease of 32 vertices above
  it (0.103 m wide, wrapping 0.115 m around the side of the head), both
  within 0.028 m of the pupil centre; the next black piece, the nose, is
  0.130 m away. `src/features/cat-room/lib/scene/cat/eyelids.ts` relies on
  that gap.
- The tail bones end 0.80 m behind the hips; the pink tail mesh reaches
  1.20 m, so the last 0.4 m of the tuft follows `Tail.003` rigidly.
- The source stores the body 26.76 times too small for its skin (see Bind
  space above). The shipped file is corrected.
- Shipped: 190,776 bytes (budget 400 kB), one skin, `NORMAL` and
  `TEXCOORD_0` pruned, positions quantised to 16 bits in one scene volume.

| File | SHA-256 (first 16 hex digits) | Size |
|---|---|---|
| `source/boykisser_custom_low_poly_avatar_scratch_model.glb` | `94368c5f93a44662` | 1,252,140 bytes |
| `public/models/cat.glb` | `f46ff775ffb50d05` | 190,776 bytes |

### Inspect output

#### `assets/models/source/boykisser_custom_low_poly_avatar_scratch_model.glb`

- 1,252,140 bytes, SHA-256 `94368c5f93a44662…`
- generator: Sketchfab-0.13.0
- author: NEGATIVEMARE (https://sketchfab.com/kakoicapital)
- license: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- source: https://sketchfab.com/3d-models/boykisser-custom-low-poly-avatar-scratch-model-8f695ab60950464db46134f19fd727b5
- title: Boykisser Custom Low Poly Avatar (Scratch Model)
- extensionsUsed: KHR_materials_unlit; extensionsRequired: —
- nodes 149, meshes 7, materials 4, textures 0, skins 1, animations 0, morph targets 0

##### Meshes

| # | Mesh | Triangles | Vertices | Material | Attributes | Bind-pose bounds (scene space) |
|---|---|---|---|---|---|---|
| 0 | Bow_Scifi Metal Plate_0 | 1,496 | 866 | Scifi_Metal_Plate | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.013, 1.318, -0.010) – (0.013, 1.336, 0.042) |
| 1 | Bow_Glossy Black Plastic_0 | 416 | 216 | Glossy_Black_Plastic | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.059, 1.308, -0.158) – (0.059, 1.350, 0.013) |
| 2 | Stockings_Glossy Black Plastic_0 | 1,896 | 1,028 | Glossy_Black_Plastic | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.008, 0.000, -0.011) – (0.008, 0.027, 0.005) |
| 3 | Stockings_Material_0 | 80 | 80 | Material | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.008, 0.024, -0.009) – (0.008, 0.025, 0.005) |
| 4 | boykisser_Material_0 | 13,994 | 9,249 | Material | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.032, 0.000, -0.027) – (0.032, 0.065, 0.007) |
| 5 | boykisser_fur 2_0 | 5,606 | 3,568 | fur_2 | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.032, 0.000, -0.045) – (0.032, 0.065, 0.006) |
| 6 | boykisser_Glossy Black Plastic_0 | 1,254 | 1,127 | Glossy_Black_Plastic | JOINTS_0 NORMAL POSITION TEXCOORD_0 WEIGHTS_0 | (-0.033, 0.000, -0.005) – (0.033, 0.057, 0.008) |

Total: 24,742 triangles, 16,134 vertices.
Bind-pose bounds of all meshes: (-0.059, 0.000, -0.158) – (0.059, 1.350, 0.042); size (0.117, 1.350, 0.200) (height 1.350, feet at y = 0.000).

##### Materials

| Material | Unlit | Double-sided | Base colour (linear) | sRGB |
|---|---|---|---|---|
| Scifi_Metal_Plate | yes | yes | (0.366, 0.366, 0.366) | `#a3a3a3` |
| Glossy_Black_Plastic | yes | yes | (0.000, 0.000, 0.000) | `#000000` |
| Material | yes | yes | (0.800, 0.800, 0.800) | `#e7e7e7` |
| fur_2 | yes | yes | (0.452, 0.162, 0.153) | `#b3706d` |

##### Skin

- 134 joints, skeleton root `_rootJoint`
- node chain to the root: `Sketchfab_model` (matrix: scale 1.0000, rotated) → `862c6e030c0049458ffef3e17b81188f.fbx` (matrix: scale 0.0100, rotated) → `RootNode` → `Armature` (matrix: scale 39.0461, rotated) → `Object_4` → `_rootJoint`
- 98 bones plus 36 `_end` leaves; keys are unique

| # | Node | Key | Parent | Local translation |
|---|---|---|---|---|
| 0 | _rootJoint | `_rootjoint` | — | — |
| 1 | spine_02 | `spine` | `_rootjoint` | (0.000, 0.097, 1.858) |
| 2 | TailRoot_03 | `tailroot` | `spine` | (0.000, 0.511, -0.293) |
| 3 | Tail_04 | `tail` | `tailroot` | (0.000, 0.251, -0.006) |
| 4 | Tail.001_05 | `tail001` | `tail` | (0.000, 0.395, 0.000) |
| 5 | Tail.002_06 | `tail002` | `tail001` | (0.000, 0.394, 0.000) |
| 6 | Tail.003_07 | `tail003` | `tail002` | (0.000, 0.372, 0.000) |
| 7 | Tail.003_end_099 | `tail003_end` | `tail003` | (0.000, 0.559, 0.000) |
| 8 | Leg_L_08 | `leg_l` | `spine` | (0.272, 0.013, -0.008) |
| 9 | Knee_L_09 | `knee_l` | `leg_l` | (0.000, 0.886, 0.000) |
| 10 | Foot_L_010 | `foot_l` | `knee_l` | (0.000, 0.888, 0.000) |
| 11 | Foot_L_end_0100 | `foot_l_end` | `foot_l` | (0.000, 0.355, 0.000) |
| 12 | Leg_R_011 | `leg_r` | `spine` | (-0.272, 0.013, -0.008) |
| 13 | Knee_R_012 | `knee_r` | `leg_r` | (0.000, 0.886, 0.000) |
| 14 | Foot_R_013 | `foot_r` | `knee_r` | (0.000, 0.888, 0.000) |
| 15 | Foot_R_end_0101 | `foot_r_end` | `foot_r` | (0.000, 0.355, 0.000) |
| 16 | Hips_014 | `hips` | `spine` | (0.000, 0.531, 0.000) |
| 17 | Chest_015 | `chest` | `hips` | (0.000, 0.399, 0.000) |
| 18 | Neck_016 | `neck` | `chest` | (0.000, 0.616, -0.007) |
| 19 | Head_017 | `head` | `neck` | (0.000, 0.136, 0.000) |
| 20 | Ear_L_018 | `ear_l` | `head` | (0.260, 0.494, -0.085) |
| 21 | Ear_L.001_019 | `ear_l001` | `ear_l` | (0.000, 0.172, 0.000) |
| 22 | Ear_L.002_020 | `ear_l002` | `ear_l001` | (0.000, 0.138, 0.000) |
| 23 | Ear_L.002_end_0102 | `ear_l002_end` | `ear_l002` | (0.000, 0.241, 0.000) |
| 24 | Ear_R_021 | `ear_r` | `head` | (-0.260, 0.494, -0.085) |
| 25 | Ear_R.001_022 | `ear_r001` | `ear_r` | (0.000, 0.172, 0.000) |
| 26 | Ear_R.002_023 | `ear_r002` | `ear_r001` | (0.000, 0.138, 0.000) |
| 27 | Ear_R.002_end_0103 | `ear_r002_end` | `ear_r002` | (0.000, 0.241, 0.000) |
| 28 | LeftEye_024 | `lefteye` | `head` | (0.165, 0.269, 0.240) |
| 29 | LeftEye_end_0104 | `lefteye_end` | `lefteye` | (0.000, 0.051, 0.000) |
| 30 | RightEye_025 | `righteye` | `head` | (-0.165, 0.269, 0.240) |
| 31 | RightEye_end_0105 | `righteye_end` | `righteye` | (0.000, 0.051, 0.000) |
| 32 | hair_026 | `hair` | `head` | (0.128, 0.617, 0.128) |
| 33 | hair.001_027 | `hair001` | `hair` | (0.000, 0.150, 0.000) |
| 34 | hair.001_end_0106 | `hair001_end` | `hair001` | (0.000, 0.177, 0.000) |
| 35 | hair.002_028 | `hair002` | `head` | (0.063, 0.665, 0.068) |
| 36 | hair.003_029 | `hair003` | `hair002` | (0.000, 0.093, 0.000) |
| 37 | hair.003_end_0107 | `hair003_end` | `hair003` | (0.000, 0.161, 0.000) |
| 38 | hair.006_030 | `hair006` | `head` | (0.000, 0.631, 0.103) |
| 39 | hair.007_031 | `hair007` | `hair006` | (0.000, 0.136, 0.000) |
| 40 | hair.007_end_0108 | `hair007_end` | `hair007` | (0.000, 0.221, 0.000) |
| 41 | hair.008_032 | `hair008` | `head` | (-0.064, 0.635, 0.143) |
| 42 | hair.009_033 | `hair009` | `hair008` | (0.000, 0.101, 0.000) |
| 43 | hair.009_end_0109 | `hair009_end` | `hair009` | (0.000, 0.147, 0.000) |
| 44 | hair.010_034 | `hair010` | `head` | (-0.066, 0.628, 0.002) |
| 45 | hair.011_035 | `hair011` | `hair010` | (0.000, 0.159, 0.000) |
| 46 | hair.011_end_0110 | `hair011_end` | `hair011` | (0.000, 0.216, 0.000) |
| 47 | hair.012_036 | `hair012` | `head` | (-0.125, 0.633, 0.054) |
| 48 | hair.013_037 | `hair013` | `hair012` | (0.000, 0.060, 0.000) |
| 49 | hair.013_end_0111 | `hair013_end` | `hair013` | (0.000, 0.127, 0.000) |
| 50 | hair.014_038 | `hair014` | `head` | (0.145, 0.612, 0.027) |
| 51 | hair.015_039 | `hair015` | `hair014` | (0.000, 0.110, 0.000) |
| 52 | hair.015_end_0112 | `hair015_end` | `hair015` | (0.000, 0.085, 0.000) |
| 53 | hair.016_040 | `hair016` | `head` | (0.004, 0.641, 0.002) |
| 54 | hair.017_041 | `hair017` | `hair016` | (0.000, 0.100, 0.000) |
| 55 | hair.017_end_0113 | `hair017_end` | `hair017` | (0.000, 0.108, 0.000) |
| 56 | hair.018_042 | `hair018` | `head` | (0.362, 0.373, 0.032) |
| 57 | hair.019_043 | `hair019` | `hair018` | (0.000, 0.072, 0.000) |
| 58 | hair.019_end_0114 | `hair019_end` | `hair019` | (0.000, 0.076, 0.000) |
| 59 | hair.020_044 | `hair020` | `head` | (0.341, 0.432, 0.028) |
| 60 | hair.021_045 | `hair021` | `hair020` | (0.000, 0.111, 0.000) |
| 61 | hair.021_end_0115 | `hair021_end` | `hair021` | (0.000, 0.101, 0.000) |
| 62 | hair.022_046 | `hair022` | `head` | (0.305, 0.491, 0.025) |
| 63 | hair.023_047 | `hair023` | `hair022` | (0.000, 0.111, 0.000) |
| 64 | hair.023_end_0116 | `hair023_end` | `hair023` | (0.000, 0.100, 0.000) |
| 65 | hair.024_048 | `hair024` | `head` | (0.275, 0.535, 0.022) |
| 66 | hair.025_049 | `hair025` | `hair024` | (0.000, 0.087, 0.000) |
| 67 | hair.025_end_0117 | `hair025_end` | `hair025` | (0.000, 0.104, 0.000) |
| 68 | hair.026_050 | `hair026` | `head` | (-0.358, 0.373, 0.031) |
| 69 | hair.027_051 | `hair027` | `hair026` | (0.000, 0.068, 0.000) |
| 70 | hair.027_end_00 | `hair027_end` | `hair027` | (0.000, 0.079, 0.000) |
| 71 | hair.028_052 | `hair028` | `head` | (-0.338, 0.432, 0.028) |
| 72 | hair.029_053 | `hair029` | `hair028` | (0.000, 0.109, 0.000) |
| 73 | hair.029_end_01 | `hair029_end` | `hair029` | (0.000, 0.100, 0.000) |
| 74 | hair.030_054 | `hair030` | `head` | (-0.301, 0.491, 0.025) |
| 75 | hair.031_055 | `hair031` | `hair030` | (0.000, 0.109, 0.000) |
| 76 | hair.031_end_0118 | `hair031_end` | `hair031` | (0.000, 0.099, 0.000) |
| 77 | hair.032_056 | `hair032` | `head` | (-0.272, 0.535, 0.022) |
| 78 | hair.033_057 | `hair033` | `hair032` | (0.000, 0.085, 0.000) |
| 79 | hair.033_end_0119 | `hair033_end` | `hair033` | (0.000, 0.102, 0.000) |
| 80 | jaw_058 | `jaw` | `head` | (0.000, 0.017, 0.267) |
| 81 | jaw_end_0120 | `jaw_end` | `jaw` | (0.000, 0.144, 0.000) |
| 82 | Shoulder_L_059 | `shoulder_l` | `chest` | (0.258, 0.383, 0.010) |
| 83 | Arm_L_060 | `arm_l` | `shoulder_l` | (0.001, 0.067, 0.000) |
| 84 | Elbow_L_061 | `elbow_l` | `arm_l` | (0.000, 0.755, 0.000) |
| 85 | Wrist_L_062 | `wrist_l` | `elbow_l` | (0.000, 0.593, 0.000) |
| 86 | Thumb_L_063 | `thumb_l` | `wrist_l` | (0.083, 0.116, 0.009) |
| 87 | Thumb_L.001_064 | `thumb_l001` | `thumb_l` | (0.000, 0.100, 0.000) |
| 88 | Thumb_L.002_065 | `thumb_l002` | `thumb_l001` | (0.000, 0.067, 0.000) |
| 89 | Thumb_L.002_end_0121 | `thumb_l002_end` | `thumb_l002` | (0.000, 0.101, 0.000) |
| 90 | Index_L_066 | `index_l` | `wrist_l` | (0.100, 0.190, 0.017) |
| 91 | Index_L.001_067 | `index_l001` | `index_l` | (0.000, 0.105, 0.000) |
| 92 | Index_L.002_068 | `index_l002` | `index_l001` | (0.000, 0.140, 0.000) |
| 93 | Index_L.002_end_0122 | `index_l002_end` | `index_l002` | (0.000, 0.113, 0.000) |
| 94 | Middle_L_069 | `middle_l` | `wrist_l` | (0.028, 0.192, 0.017) |
| 95 | Middle_L.001_070 | `middle_l001` | `middle_l` | (0.000, 0.102, 0.000) |
| 96 | Middle_L.002_071 | `middle_l002` | `middle_l001` | (0.000, 0.137, 0.000) |
| 97 | Middle_L.002_end_0123 | `middle_l002_end` | `middle_l002` | (0.000, 0.121, 0.000) |
| 98 | Ring_L_072 | `ring_l` | `wrist_l` | (-0.044, 0.194, 0.017) |
| 99 | Ring_L.001_073 | `ring_l001` | `ring_l` | (0.000, 0.103, 0.000) |
| 100 | Ring_L.002_074 | `ring_l002` | `ring_l001` | (0.000, 0.140, 0.000) |
| 101 | Ring_L.002_end_0124 | `ring_l002_end` | `ring_l002` | (0.000, 0.117, 0.000) |
| 102 | Little_L_075 | `little_l` | `wrist_l` | (-0.116, 0.196, 0.017) |
| 103 | Little_L.001_076 | `little_l001` | `little_l` | (0.000, 0.102, 0.000) |
| 104 | Little_L.002_077 | `little_l002` | `little_l001` | (0.000, 0.138, 0.000) |
| 105 | Little_L.002_end_0125 | `little_l002_end` | `little_l002` | (0.000, 0.121, 0.000) |
| 106 | Shoulder_R_078 | `shoulder_r` | `chest` | (-0.249, 0.385, 0.011) |
| 107 | Arm_R_079 | `arm_r` | `shoulder_r` | (-0.001, 0.067, 0.000) |
| 108 | Elbow_R_080 | `elbow_r` | `arm_r` | (0.000, 0.755, 0.000) |
| 109 | Wrist_R_081 | `wrist_r` | `elbow_r` | (0.000, 0.593, 0.000) |
| 110 | Thumb_R_082 | `thumb_r` | `wrist_r` | (-0.083, 0.116, 0.009) |
| 111 | Thumb_R.001_083 | `thumb_r001` | `thumb_r` | (0.000, 0.100, 0.000) |
| 112 | Thumb_R.002_084 | `thumb_r002` | `thumb_r001` | (0.000, 0.067, 0.000) |
| 113 | Thumb_R.002_end_0126 | `thumb_r002_end` | `thumb_r002` | (0.000, 0.101, 0.000) |
| 114 | Index_R_085 | `index_r` | `wrist_r` | (-0.100, 0.190, 0.017) |
| 115 | Index_R.001_086 | `index_r001` | `index_r` | (0.000, 0.105, 0.000) |
| 116 | Index_R.002_087 | `index_r002` | `index_r001` | (0.000, 0.140, 0.000) |
| 117 | Index_R.002_end_0127 | `index_r002_end` | `index_r002` | (0.000, 0.113, 0.000) |
| 118 | Middle_R_088 | `middle_r` | `wrist_r` | (-0.028, 0.192, 0.017) |
| 119 | Middle_R.001_089 | `middle_r001` | `middle_r` | (0.000, 0.102, 0.000) |
| 120 | Middle_R.002_090 | `middle_r002` | `middle_r001` | (0.000, 0.137, 0.000) |
| 121 | Middle_R.002_end_0128 | `middle_r002_end` | `middle_r002` | (0.000, 0.121, 0.000) |
| 122 | Ring_R_091 | `ring_r` | `wrist_r` | (0.044, 0.194, 0.017) |
| 123 | Ring_R.001_092 | `ring_r001` | `ring_r` | (0.000, 0.103, 0.000) |
| 124 | Ring_R.002_093 | `ring_r002` | `ring_r001` | (0.000, 0.140, 0.000) |
| 125 | Ring_R.002_end_0129 | `ring_r002_end` | `ring_r002` | (0.000, 0.117, 0.000) |
| 126 | Little_R_094 | `little_r` | `wrist_r` | (0.116, 0.196, 0.017) |
| 127 | Little_R.001_095 | `little_r001` | `little_r` | (0.000, 0.102, 0.000) |
| 128 | Little_R.002_096 | `little_r002` | `little_r001` | (0.000, 0.138, 0.000) |
| 129 | Little_R.002_end_0130 | `little_r002_end` | `little_r002` | (0.000, 0.121, 0.000) |
| 130 | popka_097 | `popka` | `spine` | (-0.186, 0.331, -0.319) |
| 131 | popka_end_0131 | `popka_end` | `popka` | (0.000, 0.133, 0.000) |
| 132 | popka.001_098 | `popka001` | `spine` | (0.188, 0.331, -0.319) |
| 133 | popka.001_end_0132 | `popka001_end` | `popka001` | (0.000, 0.133, 0.000) |

##### Skin weights

Vertices influenced per joint (weight > 0), by mesh.

| Joint | Bow_Scifi Metal Plate_0 | Bow_Glossy Black Plastic_0 | Stockings_Glossy Black Plastic_0 | Stockings_Material_0 | boykisser_Material_0 | boykisser_fur 2_0 | boykisser_Glossy Black Plastic_0 |
|---|---|---|---|---|---|---|---|
| `lefteye` | 0 | 0 | 0 | 0 | 0 | 0 | 64 |
| `righteye` | 0 | 0 | 0 | 0 | 0 | 0 | 64 |
| `jaw` | 0 | 0 | 0 | 0 | 199 | 208 | 0 |
| `shoulder_l` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `shoulder_r` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `popka` | 0 | 0 | 0 | 0 | 62 | 0 | 0 |
| `popka001` | 0 | 0 | 0 | 0 | 62 | 0 | 0 |
| `neck` | 866 | 216 | 0 | 0 | 144 | 0 | 0 |
| `tail003` | 0 | 0 | 0 | 0 | 0 | 172 | 0 |
| `spine` | 0 | 0 | 0 | 0 | 189 | 0 | 0 |
| `tailroot` | 0 | 0 | 0 | 0 | 42 | 0 | 0 |
| `tail` | 0 | 0 | 0 | 0 | 80 | 0 | 0 |
| `tail001` | 0 | 0 | 0 | 0 | 58 | 43 | 0 |
| `tail002` | 0 | 0 | 0 | 0 | 0 | 107 | 0 |
| `leg_l` | 0 | 0 | 220 | 40 | 240 | 0 | 0 |
| `knee_l` | 0 | 0 | 220 | 0 | 220 | 0 | 0 |
| `foot_l` | 0 | 0 | 114 | 0 | 309 | 625 | 100 |
| `leg_r` | 0 | 0 | 220 | 40 | 220 | 0 | 0 |
| `knee_r` | 0 | 0 | 220 | 0 | 240 | 0 | 0 |
| `foot_r` | 0 | 0 | 114 | 0 | 309 | 625 | 100 |
| `hips` | 0 | 0 | 0 | 0 | 96 | 0 | 0 |
| `chest` | 0 | 0 | 0 | 0 | 230 | 0 | 0 |
| `head` | 0 | 0 | 0 | 0 | 1517 | 213 | 549 |
| `ear_l` | 0 | 0 | 0 | 0 | 45 | 33 | 0 |
| `ear_l001` | 0 | 0 | 0 | 0 | 45 | 33 | 0 |
| `ear_l002` | 0 | 0 | 0 | 0 | 78 | 52 | 0 |
| `ear_r` | 0 | 0 | 0 | 0 | 45 | 33 | 0 |
| `ear_r001` | 0 | 0 | 0 | 0 | 45 | 33 | 0 |
| `ear_r002` | 0 | 0 | 0 | 0 | 78 | 52 | 0 |
| `arm_l` | 0 | 0 | 0 | 0 | 64 | 0 | 0 |
| `elbow_l` | 0 | 0 | 0 | 0 | 594 | 0 | 0 |
| `wrist_l` | 0 | 0 | 0 | 0 | 816 | 125 | 0 |
| `arm_r` | 0 | 0 | 0 | 0 | 64 | 0 | 0 |
| `elbow_r` | 0 | 0 | 0 | 0 | 594 | 0 | 0 |
| `wrist_r` | 0 | 0 | 0 | 0 | 816 | 125 | 0 |
| all `hair*` | 0 | 0 | 0 | 0 | 1964 | 0 | 0 |

#### `public/models/cat.glb`

- 190,776 bytes, SHA-256 `f46ff775ffb50d05…`
- generator: glTF-Transform v4.5.1
- author: NEGATIVEMARE (https://sketchfab.com/kakoicapital)
- license: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- source: https://sketchfab.com/3d-models/boykisser-custom-low-poly-avatar-scratch-model-8f695ab60950464db46134f19fd727b5
- title: Boykisser Custom Low Poly Avatar (Scratch Model)
- extensionsUsed: EXT_meshopt_compression, KHR_materials_unlit, KHR_mesh_quantization; extensionsRequired: EXT_meshopt_compression, KHR_mesh_quantization
- nodes 146, meshes 7, materials 4, textures 0, skins 1, animations 0, morph targets 0
- vertex data is meshopt-compressed: bounds and weights are not decoded here

##### Meshes

| # | Mesh | Triangles | Vertices | Material | Attributes | Bind-pose bounds (scene space) |
|---|---|---|---|---|---|---|
| 0 | Bow_Scifi Metal Plate_0 | 1,496 | 866 | Scifi_Metal_Plate | JOINTS_0 POSITION WEIGHTS_0 | — |
| 1 | Bow_Glossy Black Plastic_0 | 416 | 216 | Glossy_Black_Plastic | JOINTS_0 POSITION WEIGHTS_0 | — |
| 2 | Stockings_Glossy Black Plastic_0 | 1,896 | 1,028 | Glossy_Black_Plastic | JOINTS_0 POSITION WEIGHTS_0 | — |
| 3 | Stockings_Material_0 | 80 | 80 | Material | JOINTS_0 POSITION WEIGHTS_0 | — |
| 4 | boykisser_Material_0 | 13,994 | 9,249 | Material | JOINTS_0 POSITION WEIGHTS_0 | — |
| 5 | boykisser_fur 2_0 | 5,606 | 3,568 | fur_2 | JOINTS_0 POSITION WEIGHTS_0 | — |
| 6 | boykisser_Glossy Black Plastic_0 | 1,254 | 1,127 | Glossy_Black_Plastic | JOINTS_0 POSITION WEIGHTS_0 | — |

Total: 24,742 triangles, 16,134 vertices.

##### Materials

| Material | Unlit | Double-sided | Base colour (linear) | sRGB |
|---|---|---|---|---|
| Scifi_Metal_Plate | yes | yes | (0.366, 0.366, 0.366) | `#a3a3a3` |
| Glossy_Black_Plastic | yes | yes | (0.000, 0.000, 0.000) | `#000000` |
| Material | yes | yes | (0.800, 0.800, 0.800) | `#e7e7e7` |
| fur_2 | yes | yes | (0.452, 0.162, 0.153) | `#b3706d` |
