/**
 * Rules that keep licence-restricted and stale files out of `public/`
 * (plan §1.2 and §5). Pure: the CLI in `scripts/check-assets.mjs` gathers
 * the inputs, the unit test feeds fixtures.
 */

export const MODEL_EXTENSIONS = ['.glb', '.gltf', '.bin']
/** Model files that may be served, as paths relative to `public/`. */
export const ALLOWED_MODELS = ['models/cat.glb']

/**
 * @typedef {{ path: string; sha256: string }} PublicFile
 *   A file under `public/`: posix path relative to that directory and its digest.
 * @typedef {{ bytes: number; sha256: string; bones: { key: string; parent: string | null }[] }} RigFacts
 *   What `cat-rig.gen.ts` records (`sha256` is a prefix) and what the shipped GLB measures.
 */

/**
 * @param {object} input
 * @param {PublicFile[]} input.publicFiles Every file under `public/`.
 * @param {Map<string, string>} input.sourceDigests Digest → path of every source model.
 * @param {RigFacts | null} input.rig Content of the generated rig module, or null when missing.
 * @param {RigFacts | null} input.shipped Facts measured on the shipped GLB, or null when missing.
 * @returns {string[]} Human-readable violations; empty when everything is fine.
 */
export function findAssetViolations({
	publicFiles,
	sourceDigests,
	rig,
	shipped,
}) {
	const violations = []

	for (const file of publicFiles) {
		const lower = file.path.toLowerCase()
		const isModel = MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext))
		if (isModel && !ALLOWED_MODELS.includes(file.path))
			violations.push(
				`public/${file.path}: model files are not served except ${ALLOWED_MODELS.map((p) => `public/${p}`).join(', ')}`,
			)
		const source = sourceDigests.get(file.sha256)
		if (source)
			violations.push(
				`public/${file.path}: byte-for-byte copy of the source model ${source}; only the optimised build may ship`,
			)
	}

	if (!shipped) {
		violations.push(
			`${ALLOWED_MODELS[0]} is missing from public/: run pnpm assets:model`,
		)
		return violations
	}
	if (!rig) {
		violations.push(
			'src/features/cat-room/config/cat-rig.gen.ts is missing: run pnpm assets:inspect --write-rig',
		)
		return violations
	}
	const mismatches = []
	if (rig.bytes !== shipped.bytes)
		mismatches.push(`bytes ${rig.bytes} vs ${shipped.bytes}`)
	if (!shipped.sha256.startsWith(rig.sha256))
		mismatches.push(
			`sha256 ${rig.sha256} vs ${shipped.sha256.slice(0, rig.sha256.length)}`,
		)
	if (
		rig.bones.length !== shipped.bones.length ||
		rig.bones.some(
			(bone, i) =>
				bone.key !== shipped.bones[i].key ||
				bone.parent !== shipped.bones[i].parent,
		)
	)
		mismatches.push('bone table')
	if (mismatches.length)
		violations.push(
			`cat-rig.gen.ts does not match public/models/cat.glb (${mismatches.join('; ')}): run pnpm assets:inspect --write-rig`,
		)
	return violations
}
