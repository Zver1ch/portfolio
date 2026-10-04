/**
 * Lab screenshots through headless Chromium with software WebGL (plan §3.9).
 *
 *   pnpm assets:shots --view 'view=hero&t=2' [--size 1440x900] [--out file.png]
 *   pnpm assets:shots --probe head            contact sheet: rest and +deg about x, y, z, front and side
 *   pnpm assets:shots --pose lounge           front, side, top, three-quarter and hero framing
 *   pnpm assets:shots --sequence dive|finale  p = 0, 0.1, …, 1
 *   pnpm assets:shots --compare-source        rest pose, fixed source vs shipped model, pixel diff
 *   pnpm assets:shots --gate                  the Gate 1 package into docs/lookdev/gate-1/
 *   pnpm assets:shots --clip [--poses a,b] [--verbose]   cat-versus-furniture penetration per pose (and bone positions)
 *
 * Starts `next dev` on port 3100 unless `--url` points at a running server.
 * Output goes to artifacts/shots/ (git-ignored) unless the mode says otherwise.
 * The source model is injected from assets/models/source/ through a route
 * handler; the app never serves it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'
import { startDevServer } from './lib/dev-server.mjs'

const SOURCE_MODEL =
	'assets/models/source/boykisser_custom_low_poly_avatar_scratch_model.glb'
const SPACE_MODEL = 'artifacts/model/3-space.glb'
const OUT_DIR = 'artifacts/shots'
const GATE_DIR = 'docs/lookdev/gate-1'
/** Vertices of the cat inside the furniture, deeper than this, are a problem. */
const CLIP_TOLERANCE = 0.003
const CLIP_POSES = ['lounge', 'sleep', 'stretch']
const DEFAULT_TIME = 2.4

const args = process.argv.slice(2)
const option = (name) => {
	const index = args.indexOf(name)
	return index >= 0 ? args[index + 1] : undefined
}
const flag = (name) => args.includes(name)

const size = (value, fallback) => {
	const [w, h] = (value ?? fallback).split('x').map(Number)
	return { width: w, height: h }
}

mkdirSync(OUT_DIR, { recursive: true })
const server = option('--url')
	? { url: option('--url'), stop() {} }
	: await startDevServer()
const browser = await launchBrowser()
const problems = []

try {
	if (flag('--gate')) await gatePackage()
	else if (option('--probe')) await probe(option('--probe'))
	else if (option('--pose')) await poseSheet(option('--pose'))
	else if (option('--sequence')) await sequence(option('--sequence'))
	else if (flag('--compare-source')) await compareSource()
	else if (flag('--clip')) await clipCheck()
	else if (option('--view')) {
		const { width, height } = size(option('--size'), '1440x900')
		await shoot(
			option('--view'),
			width,
			height,
			option('--out') ?? join(OUT_DIR, 'view.png'),
		)
	} else {
		console.error('nothing to do: see the header of scripts/shots.mjs')
		process.exitCode = 2
	}
} finally {
	await browser.close()
	server.stop()
}
if (problems.length) {
	console.error(`\n${problems.length} page problem(s):`)
	for (const problem of problems) console.error(`  - ${problem}`)
	process.exitCode = 1
}

/** Opens the lab with a query, waits for the first frame, saves a PNG. */
/** Opens the lab at `query`, waits for the first frame, runs `run(page)`, closes. */
async function withLab(query, width, height, run) {
	const page = await browser.newPage({
		viewport: { width, height },
		deviceScaleFactor: 1,
	})
	page.on('console', (message) => {
		if (message.type() === 'error')
			problems.push(`${query}: ${message.text()}`)
	})
	page.on('pageerror', (error) => problems.push(`${query}: ${error.message}`))
	await page.route('**/__lab/*.glb', (route) => {
		const file = route.request().url().endsWith('source.glb')
			? SOURCE_MODEL
			: SPACE_MODEL
		if (!existsSync(file)) return route.abort('failed')
		return route.fulfill({ path: file, contentType: 'model/gltf-binary' })
	})
	const url = `${server.url}/lab?${query}`
	const started = Date.now()
	await page.goto(url, { waitUntil: 'domcontentloaded' })
	await page.waitForFunction(() => Boolean(window.__lab), null, {
		timeout: 180_000,
	})
	await page.evaluate(() => window.__lab.ready)
	const result = await run(page, started)
	await page.close()
	return result
}

async function shoot(query, width, height, path) {
	return withLab(query, width, height, async (page, started) => {
		await page.screenshot({ path, fullPage: false })
		console.log(
			`${path}  (${width}×${height}, ${((Date.now() - started) / 1000).toFixed(1)}s)  ${query}`,
		)
		return path
	})
}

/**
 * Runs every skinned vertex of each pose through the room's solids
 * (`scene.penetration()`); `--poses a,b` picks the poses. Part of `--gate`.
 */
async function clipCheck(
	poses = (option('--poses') ?? CLIP_POSES.join(',')).split(','),
) {
	const rows = []
	for (const pose of poses) {
		const query = withTime(`view=turntable&pose=${pose}&cam=quarter`)
		const { hits, bones } = await withLab(query, 1200, 800, (page) =>
			page.evaluate(() => {
				const scene = window.__lab.scene
				const keys = [
					'hips',
					'chest',
					'head',
					'arm_l',
					'elbow_l',
					'wrist_l',
					'arm_r',
					'elbow_r',
					'wrist_r',
					'leg_l',
					'knee_l',
					'foot_l_end',
					'leg_r',
					'knee_r',
					'foot_r_end',
					'tailroot',
					'tail003_end',
					'ear_l002_end',
					'ear_r002_end',
				]
				return {
					hits: scene.penetration(),
					bones: keys.map((key) => [
						key,
						scene.cat.bonePosition(key).toArray(),
					]),
				}
			}),
		)
		if (flag('--verbose'))
			console.log(
				`${pose}: ${bones
					.map(
						([key, p]) =>
							`${key} (${p.map((v) => v.toFixed(3)).join(', ')})`,
					)
					.join('  ')}`,
			)
		if (hits.length === 0)
			rows.push({ pose, collider: '—', vertices: 0, mm: 0, bones: '' })
		for (const hit of hits) {
			rows.push({
				pose,
				collider: hit.collider,
				vertices: hit.vertices,
				mm: Math.round(hit.depth * 1000 * 10) / 10,
				bones: hit.bones
					.slice(0, 7)
					.map((b) => `${b.bone} ${(b.depth * 1000).toFixed(0)}`)
					.join(', '),
			})
			if (hit.depth > CLIP_TOLERANCE)
				problems.push(
					`clip: ${pose} enters the ${hit.collider} by ${(hit.depth * 1000).toFixed(1)} mm (${hit.vertices} vertices, deepest on ${hit.bone})`,
				)
		}
	}
	console.table(rows)
	return rows
}

function withTime(query, time = DEFAULT_TIME) {
	// A real `t` parameter only: `dist=` and `pitch=` also contain "t=".
	return new URLSearchParams(query).has('t') ? query : `${query}&t=${time}`
}

async function probe(bone) {
	const deg = option('--deg') ?? '30'
	await shoot(
		`view=probe&bone=${encodeURIComponent(bone)}&deg=${deg}&t=1`,
		1800,
		1000,
		join(OUT_DIR, `probe-${bone}.png`),
	)
}

async function poseSheet(pose) {
	for (const cam of ['front', 'side', 'top', 'quarter', 'hero'])
		await shoot(
			withTime(`view=turntable&pose=${pose}&cam=${cam}`),
			1200,
			800,
			join(OUT_DIR, `pose-${pose}-${cam}.png`),
		)
}

async function sequence(track) {
	const view = track === 'finale' ? 'finale' : 'dive'
	for (let i = 0; i <= 10; i++) {
		const p = (i / 10).toFixed(1)
		await shoot(
			withTime(`view=${view}&p=${p}`),
			1440,
			900,
			join(OUT_DIR, `${view}-${p.replace('.', '')}.png`),
		)
	}
}

async function compareSource() {
	if (!existsSync(SPACE_MODEL)) {
		console.error(`${SPACE_MODEL} is missing: run pnpm assets:model first`)
		process.exitCode = 2
		return
	}
	const a = await shoot(
		withTime('view=turntable&pose=rest&cam=front&model=space&look=none'),
		1200,
		900,
		join(OUT_DIR, 'compare-space.png'),
	)
	const b = await shoot(
		withTime('view=turntable&pose=rest&cam=front&model=shipped&look=none'),
		1200,
		900,
		join(OUT_DIR, 'compare-shipped.png'),
	)
	const page = await browser.newPage()
	// Data URLs: file:// images would taint the canvas and block getImageData.
	const dataUrl = (file) =>
		`data:image/png;base64,${readFileSync(file).toString('base64')}`
	const result = await page.evaluate(
		async ([pathA, pathB]) => {
			const load = (src) =>
				new Promise((resolve, reject) => {
					const image = new Image()
					image.onload = () => resolve(image)
					image.onerror = reject
					image.src = src
				})
			const [imageA, imageB] = await Promise.all([
				load(pathA),
				load(pathB),
			])
			const read = (image) => {
				const canvas = document.createElement('canvas')
				canvas.width = image.width
				canvas.height = image.height
				const context = canvas.getContext('2d')
				context.drawImage(image, 0, 0)
				return context.getImageData(0, 0, canvas.width, canvas.height)
					.data
			}
			const dataA = read(imageA)
			const dataB = read(imageB)
			let different = 0
			for (let i = 0; i < dataA.length; i += 4) {
				if (
					Math.abs(dataA[i] - dataB[i]) > 8 ||
					Math.abs(dataA[i + 1] - dataB[i + 1]) > 8 ||
					Math.abs(dataA[i + 2] - dataB[i + 2]) > 8
				)
					different++
			}
			return { different, total: dataA.length / 4 }
		},
		[dataUrl(a), dataUrl(b)],
	)
	await page.close()
	const share = result.different / result.total
	console.log(
		`compare-source: ${result.different} of ${result.total} pixels differ (${(share * 100).toFixed(3)}%)`,
	)
	if (share > 0.002) {
		problems.push(
			`compare-source: ${(share * 100).toFixed(3)}% of pixels differ between the fixed source and the shipped model`,
		)
	}
}

async function gatePackage() {
	mkdirSync(GATE_DIR, { recursive: true })
	const shots = [
		['hero-night-1920x1200.png', 'view=hero', 1920, 1200],
		['hero-night-390x844-lite.png', 'view=hero&lite=1', 390, 844],
		[
			'cat-close-up.png',
			'view=turntable&cam=close&pose=lounge',
			1600,
			1000,
		],
		['cat-side.png', 'view=turntable&cam=side&pose=lounge', 1600, 1000],
		['cat-top.png', 'view=turntable&cam=top&pose=lounge', 1600, 1000],
		[
			'stretch.png',
			'view=turntable&cam=quarter&pose=stretch&meow=1',
			1600,
			1000,
		],
		['finale-dawn-1920x1200.png', 'view=finale&p=1', 1920, 1200],
		[
			'sleep-close-up.png',
			'view=turntable&cam=close&pose=sleep&dawn=1&yaw=60&pitch=45&dist=0.75',
			1600,
			1000,
		],
		[
			'sleep-side.png',
			'view=turntable&cam=side&pose=sleep&dawn=1',
			1600,
			1000,
		],
		[
			'shading-a.png',
			'view=turntable&cam=quarter&pose=lounge&shading=a',
			1600,
			1000,
		],
		[
			'shading-b.png',
			'view=turntable&cam=quarter&pose=lounge&shading=b',
			1600,
			1000,
		],
		['sticker.png', 'view=turntable&cam=sticker', 1600, 1000],
		[
			'desk-props.png',
			'view=turntable&cam=desk&dist=0.5&yaw=-25&pitch=35',
			1600,
			1000,
		],
		['lamp.png', 'view=turntable&cam=lamp', 1600, 1000],
		['dive-tunnel-p095.png', 'view=dive&p=0.95', 1440, 900],
		['dive-mid-p065.png', 'view=dive&p=0.65', 1440, 900],
		['probe-head.png', 'view=probe&bone=head&t=1', 1800, 1000],
	]
	for (const [file, query, width, height] of shots)
		await shoot(withTime(query), width, height, join(GATE_DIR, file))
	writeFileSync(
		join(OUT_DIR, 'gate-shots.json'),
		JSON.stringify(shots, null, '\t'),
	)
	await clipCheck(CLIP_POSES)
}
