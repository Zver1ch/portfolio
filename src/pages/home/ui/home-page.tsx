import { SmoothScroll } from '@/shared/lib/gsap/smooth-scroll'
import { ChapterTrail } from '@/shared/ui/chapter-trail'
import { StoryAbout } from '@/widgets/about/ui/about'
import { StoryContact } from '@/widgets/contact/ui/contact'
import { StoryFooter } from '@/widgets/footer/ui/footer'
import { StoryHeader } from '@/widgets/header/ui/header'
import { StoryProjects } from '@/widgets/projects/ui/projects'
import { StoryPrologue } from '@/widgets/prologue/ui/prologue'
import { StoryStack } from '@/widgets/stack/ui/stack'

export function HomePage() {
	return (
		<>
			<SmoothScroll />
			<StoryHeader />
			<main>
				<StoryPrologue />
				<ChapterTrail />
				<StoryAbout />
				<ChapterTrail />
				<StoryStack />
				<ChapterTrail />
				<StoryProjects />
				<ChapterTrail />
				<StoryContact />
			</main>
			<StoryFooter />
		</>
	)
}
