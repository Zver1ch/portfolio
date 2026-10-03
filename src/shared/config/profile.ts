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
	about: 'Верстаю на HTML и CSS, сейчас прокачиваю JavaScript, React, Next.js и TypeScript. Дерзкий, командный, в стрессе не теряюсь.',
	location: 'Удалённо',
	languages: ['RU', 'EN'],
	skills: ['HTML', 'CSS', 'SCSS', 'CSS Modules'],
	learning: ['JavaScript', 'React', 'Next.js', 'TypeScript'],
	lookingFor: ['Стажировки', 'Junior-роли', 'Заказы на вёрстку (HTML/CSS)'],
	now: 'Личный сайт: в работе',
	projects: [],
	links: [
		{ label: 'GitHub', href: 'https://github.com/Zver1ch' },
		{ label: 'Telegram', href: 'https://t.me/Zver1ch' },
	],
}
