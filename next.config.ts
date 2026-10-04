import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig: NextConfig = {
	cacheComponents: true,
	reactStrictMode: true,
	reactCompiler: true,
	poweredByHeader: false,
	typedRoutes: true,
	output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
	images: {
		formats: ['image/avif', 'image/webp'],
	},
	async headers() {
		return [
			{
				// The model URL carries the file's hash (`?v=`), so it can be cached forever.
				source: '/models/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
		]
	},
}

export default function config(phase: string): NextConfig {
	if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig
	return {
		...nextConfig,
		// The look-dev lab (`app/lab/page.lab.tsx`) is a dev-server route only:
		// production builds never resolve the `.lab.tsx` extension, so neither
		// the route nor its code exists in the build.
		pageExtensions: ['lab.tsx', 'tsx', 'ts'],
		// The asset scripts open the dev server through Playwright.
		allowedDevOrigins: ['127.0.0.1', 'localhost'],
		// Keeps the dev badge out of the lab screenshots.
		devIndicators: false,
	}
}
