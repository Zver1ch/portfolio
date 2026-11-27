import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					// Software WebGL, so the 3D scene is exercised on runners
					// without a GPU (the same flags as scripts/lib/browser.mjs).
					args: [
						'--use-angle=swiftshader',
						'--enable-unsafe-swiftshader',
					],
					// Sandboxes with a pre-installed Chromium and no browser
					// download: point CHROME_PATH at the binary.
					executablePath: process.env.CHROME_PATH || undefined,
				},
			},
		},
	],
	webServer: {
		// CI already ran `pnpm build` as a separate step — don't build twice.
		command: process.env.CI ? 'pnpm start' : 'pnpm build-start',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
})
