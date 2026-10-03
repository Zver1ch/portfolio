import type { MetadataRoute } from 'next'
import { profile } from '@/shared/config/profile'

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: profile.name,
		short_name: profile.handle,
		description: profile.about,
		start_url: '/',
		display: 'standalone',
		background_color: '#120d16',
		theme_color: '#120d16',
	}
}
