/**
 * Asset guard, part of `pnpm verify` and CI: fails when a model file other
 * than `public/models/cat.glb` is served, when anything under `public/` is a
 * copy of a source model, or when `cat-rig.gen.ts` no longer matches the
 * shipped GLB. See `scripts/lib/asset-guard.mjs` for the rules.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { findAssetViolations } from './lib/asset-guard.mjs'
import { RIG_FILE, rigFacts, SHIPPED_MODEL } from './lib/cat-rig.mjs'
import { readGlb } from './lib/glb.mjs'

const PUBLIC_DIR = 'public'
const SOURCE_DIR = 'assets/models/source'

function walk(dir) {
	if (!existsSync(dir)) return []
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name))
}

const digest = (path) =>
	createHash('sha256').update(readFileSync(path)).digest('hex')

const publicFiles = walk(PUBLIC_DIR).map((path) => ({
	path: relative(PUBLIC_DIR, path).split(sep).join('/'),
	sha256: digest(path),
}))
const sourceDigests = new Map(
	walk(SOURCE_DIR).map((path) => [digest(path), path]),
)
const shipped = existsSync(SHIPPED_MODEL)
	? {
			...rigFacts(readGlb(SHIPPED_MODEL)),
			sha256: readGlb(SHIPPED_MODEL).sha256,
		}
	: null
const rig = existsSync(RIG_FILE)
	? parseRigModule(readFileSync(RIG_FILE, 'utf8'))
	: null

const violations = findAssetViolations({
	publicFiles,
	sourceDigests,
	rig,
	shipped,
})
if (violations.length) {
	console.error('Asset guard failed:')
	for (const violation of violations) console.error(`  - ${violation}`)
	process.exit(1)
}
console.log(
	`Asset guard passed: ${publicFiles.length} files under public/, ${shipped.bones.length} bones in sync.`,
)

/**
 * Reads the facts back out of the generated TypeScript without executing it.
 * @param {string} source
 */
function parseRigModule(source) {
	const bytes = Number(/bytes:\s*(\d+)/.exec(source)?.[1])
	const sha256 = /sha256:\s*'([0-9a-f]+)'/.exec(source)?.[1] ?? ''
	const bones = [
		...source.matchAll(
			/\{\s*key:\s*'([^']+)',\s*parent:\s*(null|'([^']+)')\s*\}/g,
		),
	].map((match) => ({ key: match[1], parent: match[3] ?? null }))
	return { bytes, sha256, bones }
}
