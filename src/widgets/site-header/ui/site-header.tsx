'use client'

import { Fish, Heart } from 'lucide-react'
import {
	useBoopCount,
	useBoopedThisVisit,
} from '@/features/boop-cat/model/boop-store'
import { requestFeed } from '@/features/cat-room/model/feed-bus'
import { useRoomMode } from '@/features/cat-room/model/room-mode'
import { useRoomState } from '@/features/cat-room/model/room-store'
import { SoundToggle } from '@/features/toggle-sound/ui/sound-toggle'
import { profile } from '@/shared/config/profile'

const NAV = [
	{ href: '#top', label: 'Top' },
	{ href: '#about', label: 'About' },
	{ href: '#work', label: 'Work' },
	{ href: '#stack', label: 'Stack' },
	{ href: '#contact', label: 'Contact' },
] as const

const LINK =
	'rounded-md text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring'

export function SiteHeader() {
	const boops = useBoopCount()
	// A polite live region only once this visit has petted the cat (plan §3.14).
	const announce = useBoopedThisVisit()
	// The keyboard way to drop a fish (plan §3.10): full mode only, once the room runs.
	const mode = useRoomMode()
	const { status } = useRoomState()
	const canFeed = mode === 'full' && status === 'ready'

	return (
		<header className='fixed inset-x-0 top-0 z-50 border-b border-border bg-ink/75 backdrop-blur-md'>
			<div className='mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6'>
				<a
					href='#top'
					className={`${LINK} font-display font-semibold tracking-tight`}
				>
					{profile.handle}
				</a>
				<nav aria-label='Sections' className='hidden md:block'>
					<ul className='flex items-center gap-1'>
						{NAV.map((item) => (
							<li key={item.href}>
								<a
									href={item.href}
									className={`${LINK} px-3 py-2 text-muted-foreground hover:text-foreground`}
								>
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</nav>
				<div className='flex items-center gap-1 sm:gap-2'>
					<p
						className='flex items-center gap-1.5 rounded-full bg-ink-3 px-3 py-1.5 font-mono text-xs whitespace-nowrap text-orchid'
						aria-live={announce ? 'polite' : 'off'}
					>
						<Heart
							aria-hidden
							className='size-3.5 fill-rose text-rose'
						/>
						<span>
							<span className='sr-only sm:not-sr-only'>
								boops:{' '}
							</span>
							<span data-testid='boop-count'>{boops}</span>
						</span>
					</p>
					<a
						href='#contact'
						className={`${LINK} px-2 py-2 text-rose md:hidden`}
					>
						Contact
					</a>
					{canFeed ? (
						<button
							type='button'
							onClick={() => requestFeed()}
							className={`${LINK} flex items-center gap-1.5 px-2 py-2 text-muted-foreground hover:text-foreground`}
						>
							<Fish aria-hidden className='size-4 text-orchid' />
							Feed the cat
						</button>
					) : null}
					<SoundToggle />
				</div>
			</div>
		</header>
	)
}
