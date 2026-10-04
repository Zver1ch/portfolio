/**
 * Starts `next dev` for the asset scripts and waits until the lab answers.
 * The server is killed with its whole process group on `stop()`.
 */

import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'

const POLL_MS = 1500

/**
 * @param {{ port?: number; readyPath?: string; timeoutMs?: number; logFile?: string }} [options]
 * @returns {Promise<{ url: string; stop(): void }>}
 */
export async function startDevServer({
	port = 3100,
	readyPath = '/lab',
	timeoutMs = 300_000,
	logFile = 'artifacts/shots/dev-server.log',
} = {}) {
	mkdirSync('artifacts/shots', { recursive: true })
	const log = createWriteStream(logFile)
	const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', String(port)], {
		env: {
			...process.env,
			NEXT_TELEMETRY_DISABLED: '1',
			BROWSER: 'none',
			FORCE_COLOR: '0',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
		detached: process.platform !== 'win32',
		shell: process.platform === 'win32',
	})
	child.stdout.pipe(log)
	child.stderr.pipe(log)
	let exited = false
	child.on('exit', () => {
		exited = true
	})

	// `localhost`, not 127.0.0.1: Next blocks dev resources (HMR) for other origins and the page reloads forever.
	const url = `http://localhost:${port}`
	const stop = () => {
		if (exited) return
		try {
			if (process.platform === 'win32' || child.pid === undefined)
				child.kill()
			else process.kill(-child.pid, 'SIGTERM')
		} catch {
			// Already gone.
		}
	}
	process.on('exit', stop)

	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (exited) throw new Error(`next dev exited early; see ${logFile}`)
		try {
			const response = await fetch(url + readyPath)
			if (response.ok) return { url, stop }
		} catch {
			// Not listening yet.
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_MS))
	}
	stop()
	throw new Error(
		`next dev did not answer on ${url}${readyPath} within ${timeoutMs / 1000}s; see ${logFile}`,
	)
}
