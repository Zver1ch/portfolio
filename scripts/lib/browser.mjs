/**
 * Headless Chromium for the asset scripts, with software WebGL so the 3D
 * scene renders on machines and CI runners without a GPU. The same arguments
 * sit in `playwright.config.ts`.
 *
 * Set `CHROME_PATH` to a Chromium binary when Playwright's own download is
 * unavailable (sandboxes with a pre-installed browser).
 */

import { chromium } from '@playwright/test'

export const SWIFTSHADER_ARGS = [
	'--use-angle=swiftshader',
	'--enable-unsafe-swiftshader',
]

/**
 * @param {import('@playwright/test').LaunchOptions} [options]
 */
export function launchBrowser(options = {}) {
	return chromium.launch({
		args: SWIFTSHADER_ARGS,
		executablePath: process.env.CHROME_PATH || undefined,
		...options,
	})
}
