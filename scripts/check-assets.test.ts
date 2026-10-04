import { describe, expect, it } from 'vitest'
import { findAssetViolations } from './lib/asset-guard.mjs'

const SOURCE = 'assets/models/source/avatar.glb'
const SOURCE_DIGEST = 'a'.repeat(64)
const SHIPPED_DIGEST = 'b'.repeat(64)
const bones = [
	{ key: '_rootjoint', parent: null },
	{ key: 'spine', parent: '_rootjoint' },
	{ key: 'head', parent: 'spine' },
]
const shipped = { bytes: 190_776, sha256: SHIPPED_DIGEST, bones }
const rig = { bytes: 190_776, sha256: SHIPPED_DIGEST.slice(0, 16), bones }
const cat = { path: 'models/cat.glb', sha256: SHIPPED_DIGEST }
const sourceDigests = new Map([[SOURCE_DIGEST, SOURCE]])

function check(overrides: Partial<Parameters<typeof findAssetViolations>[0]>) {
	return findAssetViolations({
		publicFiles: [
			cat,
			{ path: 'stickers/cat-sticker.png', sha256: 'c'.repeat(64) },
		],
		sourceDigests,
		rig,
		shipped,
		...overrides,
	})
}

describe('findAssetViolations', () => {
	it('passes a clean public directory', () => {
		expect(check({})).toEqual([])
	})

	it('fails when a source model is copied into public/', () => {
		const violations = check({
			publicFiles: [
				cat,
				{ path: 'models/source.glb', sha256: SOURCE_DIGEST },
			],
		})
		expect(violations).toHaveLength(2)
		expect(violations[0]).toMatch(/models\/source\.glb.*not served/)
		expect(violations[1]).toMatch(
			/copy of the source model assets\/models\/source\/avatar\.glb/,
		)
	})

	it('flags a renamed copy of a source model by its digest, whatever the extension', () => {
		expect(
			check({
				publicFiles: [
					cat,
					{ path: 'downloads/cat.bak', sha256: SOURCE_DIGEST },
				],
			}),
		).toEqual([
			expect.stringMatching(
				/downloads\/cat\.bak.*copy of the source model/,
			),
		])
	})

	it('rejects .gltf and .bin files anywhere under public/', () => {
		expect(
			check({
				publicFiles: [
					cat,
					{ path: 'models/scene.gltf', sha256: 'd'.repeat(64) },
					{ path: 'nested/dir/scene.BIN', sha256: 'e'.repeat(64) },
				],
			}),
		).toHaveLength(2)
	})

	it('requires the shipped model and the generated rig', () => {
		expect(check({ shipped: null })).toEqual([
			expect.stringMatching(/missing from public/),
		])
		expect(check({ rig: null })).toEqual([
			expect.stringMatching(/cat-rig\.gen\.ts is missing/),
		])
	})

	it('fails when the rig module is stale', () => {
		expect(check({ rig: { ...rig, bytes: 1 } })).toEqual([
			expect.stringMatching(/does not match.*bytes 1 vs 190776/),
		])
		expect(check({ rig: { ...rig, sha256: 'f'.repeat(16) } })).toEqual([
			expect.stringMatching(/sha256/),
		])
		expect(
			check({
				rig: {
					...rig,
					bones: [...bones, { key: 'tail', parent: 'spine' }],
				},
			}),
		).toEqual([expect.stringMatching(/bone table/)])
		expect(
			check({
				rig: {
					...rig,
					bones: bones.map((b, i) =>
						i === 2 ? { ...b, parent: null } : b,
					),
				},
			}),
		).toEqual([expect.stringMatching(/bone table/)])
	})
})
