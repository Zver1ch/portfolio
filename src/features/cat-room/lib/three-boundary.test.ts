import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * three.js stays in the lazily loaded scene chunk (plan §3.6): only the scene
 * code and the dev-only lab may import it. Everything else works on the
 * three-free maths in `@/shared/lib/math`.
 */
const SRC = join(process.cwd(), 'src')
const ALLOWED = ['features/cat-room/lib/scene/', 'pages/lab/']
const THREE_IMPORT = /(?:from|import)\s*\(?\s*['"]three(?:\/|['"])/

describe('three import boundary', () => {
	it('is only crossed under the scene directory and the lab', () => {
		const offenders = readdirSync(SRC, {
			recursive: true,
			withFileTypes: true,
		})
			.filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
			.map((entry) => join(entry.parentPath, entry.name))
			.filter((file) => THREE_IMPORT.test(readFileSync(file, 'utf8')))
			.map((file) => relative(SRC, file).split(sep).join('/'))
			.filter(
				(file) => !ALLOWED.some((prefix) => file.startsWith(prefix)),
			)
		expect(offenders).toEqual([])
	})
})
