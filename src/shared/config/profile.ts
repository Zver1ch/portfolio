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
	skills: string[]
	projects: ProfileProject[]
	links: ProfileLink[]
}

export const profile: Profile = {
	name: 'TODO: имя',
	handle: 'Zver1ch',
	role: 'TODO: роль',
	about: 'TODO: коротко о себе',
	location: 'TODO: город',
	skills: ['TODO: навык 1', 'TODO: навык 2', 'TODO: навык 3'],
	projects: [
		{
			title: 'TODO: проект 1',
			description: 'TODO: описание проекта',
			href: 'TODO: ссылка на проект',
			tags: ['TODO: тег'],
		},
		{
			title: 'TODO: проект 2',
			description: 'TODO: описание проекта',
			tags: ['TODO: тег', 'TODO: тег'],
		},
	],
	links: [{ label: 'GitHub', href: 'https://github.com/Zver1ch' }],
}
