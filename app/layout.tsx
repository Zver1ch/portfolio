import type { Metadata } from 'next'
import { JetBrains_Mono, Onest, Unbounded } from 'next/font/google'
import type { ReactNode } from 'react'
import { profile } from '@/shared/config/profile'
import { Toaster } from '@/shared/ui/sonner'
import './globals.css'

const unbounded = Unbounded({
	subsets: ['cyrillic', 'latin'],
	variable: '--font-unbounded',
	display: 'swap',
})

const onest = Onest({
	subsets: ['cyrillic', 'latin'],
	variable: '--font-onest',
	display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ['cyrillic', 'latin'],
	variable: '--font-jetbrains-mono',
	display: 'swap',
})

export const metadata: Metadata = {
	title: {
		default: `${profile.name} — ${profile.role}`,
		template: `%s | ${profile.name}`,
	},
	description: profile.about,
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang='ru'
			className={`${unbounded.variable} ${onest.variable} ${jetbrainsMono.variable}`}
		>
			<body className='bg-background font-sans text-foreground antialiased'>
				{children}
				<Toaster />
			</body>
		</html>
	)
}
