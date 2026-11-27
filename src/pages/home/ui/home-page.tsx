import { profile } from '@/shared/config/profile'
import { SmoothScroll } from '@/shared/lib/gsap/smooth-scroll'
import { Statement } from '@/shared/ui/statement'
import { About } from '@/widgets/about/ui/about'
import { CatStage } from '@/widgets/cat-stage/ui/cat-stage'
import { Contact } from '@/widgets/contact/ui/contact'
import { Experience } from '@/widgets/experience/ui/experience'
import { Finale } from '@/widgets/finale/ui/finale'
import { Hero } from '@/widgets/hero/ui/hero'
import { Manifesto } from '@/widgets/manifesto/ui/manifesto'
import { SiteHeader } from '@/widgets/site-header/ui/site-header'
import { Stack } from '@/widgets/stack/ui/stack'

export function HomePage() {
	return (
		<>
			<a
				href='#about'
				className='sr-only z-50 rounded-md bg-ink-2 px-4 py-2 text-sm text-snow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-none focus-visible:ring-3 focus-visible:ring-ring'
			>
				Skip to content
			</a>
			<SmoothScroll />
			<SiteHeader />
			<CatStage />
			<main>
				<Hero>
					<Manifesto />
				</Hero>
				<About />
				<Experience />
				<Stack />
				<Contact />
			</main>
			<Finale>
				<Statement>{profile.footerStatement}</Statement>
			</Finale>
		</>
	)
}
