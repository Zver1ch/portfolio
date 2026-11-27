export type ProfileProject = {
	title: string
	description: string
	href?: string
	tags: string[]
}

export type ProfileJob = {
	place: string
	period: string
	summary: string
}

export type ProfileLink = {
	label: string
	href: string
}

export type Profile = {
	name: string
	handle: string
	role: string
	/** One line under the name in the hero. */
	tagline: string
	/** The giant statement right after the dive into the monitor. */
	statement: string
	/** The giant statement of the finale, before the credits. */
	footerStatement: string
	about: string
	location: string
	languages: string[]
	/** Newest first; the same entries as the owner's resume. */
	experience: ProfileJob[]
	/** Used in real work today. */
	skills: string[]
	/** In progress; leave empty when nothing is. */
	learning: string[]
	lookingFor: string[]
	now: string
	/** Only projects that exist and have a live demo. */
	projects: ProfileProject[]
	links: ProfileLink[]
}

export const profile: Profile = {
	name: 'Dmitriy Gorbunov',
	handle: 'Zver1ch',
	role: 'Frontend developer',
	tagline: 'Building interfaces with React and Next.js. Supervised by a cat.',
	statement: 'I build layouts. The cat sits on them.',
	footerStatement: "Let's build something. The cat approves.",
	about: 'I build web interfaces with React, Next.js and TypeScript. Started with HTML and CSS layouts for freelance clients, then joined a product team.',
	location: 'Remote',
	languages: ['RU', 'EN'],
	experience: [
		{
			place: 'Commercial project under NDA',
			period: 'Sep – Nov 2026',
			summary:
				"A photo and video generation service built by a team of ten. Moved my share of the pages from jQuery to Next.js, following the tech lead's architecture, and helped package the service in Docker. The Lighthouse performance score went to 90+ after the move.",
		},
		{
			place: 'Freelance',
			period: '2025 – 2026',
			summary:
				'About a year of direct work with clients: landing pages built from Figma mockups, new features for existing sites in plain HTML and CSS, React and Next.js, and fixes in legacy code.',
		},
	],
	skills: [
		'HTML',
		'CSS',
		'SCSS',
		'CSS Modules',
		'JavaScript',
		'TypeScript',
		'React',
		'Next.js',
		'Git',
		'Docker',
		'Figma',
		'Claude Code',
	],
	learning: [],
	lookingFor: ['Junior frontend roles', 'Internships'],
	now: 'Open to full-time remote work',
	projects: [],
	links: [
		{ label: 'GitHub', href: 'https://github.com/Zver1ch' },
		{ label: 'Telegram', href: 'https://t.me/Zver1ch' },
	],
}
