/**
 * Builds `public/models/cat.glb` from the source avatar (plan §5):
 *
 *   dedup → prune → fix-model-space → tuck-stockings → meshopt
 *
 * Intermediate files land in `artifacts/model/` (git-ignored); the output is
 * committed. Only `dedup`, `prune` and `meshopt` of glTF Transform run: the
 * `optimize` preset (join, flatten, simplify, palette, weld) would alter the
 * rig or the authored look. `prune` drops the unused NORMAL and TEXCOORD_0
 * attributes: every material is unlit and untextured, and the painted-light
 * shading derives flat normals in the fragment shader. After this script run
 * `pnpm assets:inspect --write-rig` to refresh `cat-rig.gen.ts`.
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'

const CLI = '@gltf-transform/cli@4.5.1'
const SOURCE =
	'assets/models/source/boykisser_custom_low_poly_avatar_scratch_model.glb'
const OUT_DIR = 'artifacts/model'
const OUTPUT = 'public/models/cat.glb'

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync('public/models', { recursive: true })

const steps = [
	['pnpm', ['dlx', CLI, 'dedup', SOURCE, `${OUT_DIR}/1-dedup.glb`]],
	[
		'pnpm',
		[
			'dlx',
			CLI,
			'prune',
			`${OUT_DIR}/1-dedup.glb`,
			`${OUT_DIR}/2-prune.glb`,
		],
	],
	[
		process.execPath,
		[
			'scripts/fix-model-space.mjs',
			`${OUT_DIR}/2-prune.glb`,
			`${OUT_DIR}/3-space.glb`,
		],
	],
	[
		process.execPath,
		[
			'scripts/tuck-stockings.mjs',
			`${OUT_DIR}/3-space.glb`,
			`${OUT_DIR}/4-tucked.glb`,
		],
	],
	[
		'pnpm',
		[
			'dlx',
			CLI,
			'meshopt',
			`${OUT_DIR}/4-tucked.glb`,
			OUTPUT,
			'--level',
			'medium',
			// One volume for all meshes keeps the single authored skin: with the
			// default per-mesh volumes quantize clones the skin per mesh (7 skins).
			'--quantization-volume',
			'scene',
			// Same storage as the 14-bit default (int16) and a finer grid.
			'--quantize-position',
			'16',
		],
	],
]

for (const [command, args] of steps) {
	console.log(
		`\n$ ${command === process.execPath ? 'node' : command} ${args.join(' ')}`,
	)
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: process.platform === 'win32',
	})
	if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(
	`\n${OUTPUT}: ${statSync(OUTPUT).size.toLocaleString('en-US')} bytes`,
)
