import type { Metadata } from 'next'
import { JetBrains_Mono, Onest, Unbounded } from 'next/font/google'
import type { ReactNode } from 'react'
import { profile } from '@/shared/config/profile'
import { Toaster } from '@/shared/ui/sonner'
import './globals.css'

const unbounded = Unbounded({
	subsets: ['latin'],
	variable: '--font-unbounded',
	display: 'swap',
})

const onest = Onest({
	subsets: ['latin'],
	variable: '--font-onest',
	display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	variable: '--font-jetbrains-mono',
	display: 'swap',
})

export const metadata: Metadata = {
	metadataBase: new URL(profile.site),
	title: {
		default: `${profile.name} — ${profile.role}`,
		template: `%s | ${profile.name}`,
	},
	description: profile.tagline,
	openGraph: { type: 'website', url: '/', siteName: profile.name },
	twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang='en'
			className={`${unbounded.variable} ${onest.variable} ${jetbrainsMono.variable}`}
		>
			<body className='bg-background font-sans text-foreground antialiased'>
				{children}
				<Toaster />
			</body>
		</html>
	)
}
