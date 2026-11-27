export type ProfileProject = {
	title: string
	description: string
	href?: string
	tags: string[]
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
	/** Used in real work today. */
	skills: string[]
	/** In progress: moves to `skills` once there is a live demo. */
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
	role: 'Frontend developer · in progress',
	tagline: 'Building layouts. Learning the rest. Supervised by a cat.',
	statement: 'I build layouts. The cat sits on them.',
	footerStatement: "Let's build something. The cat approves.",
	about: "I build layouts with HTML and CSS and I'm leveling up in JavaScript, React, Next.js and TypeScript.",
	location: 'Remote',
	languages: ['RU', 'EN'],
	skills: ['HTML', 'CSS', 'SCSS', 'CSS Modules'],
	learning: ['JavaScript', 'React', 'Next.js', 'TypeScript'],
	lookingFor: ['Internships', 'Junior roles', 'HTML/CSS layout gigs'],
	now: 'Personal site: in progress',
	projects: [],
	links: [
		{ label: 'GitHub', href: 'https://github.com/Zver1ch' },
		{ label: 'Telegram', href: 'https://t.me/Zver1ch' },
	],
}
