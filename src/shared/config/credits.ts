/**
 * Attribution for the third-party work on the site (plan §1.2). The finale
 * renders these entries with links; `CREDITS.md` repeats them as plain text,
 * which `creditText()` produces word for word.
 */

export type CreditLink = { label: string; href: string }

export type Credit = {
	id: string
	/** "Sticker artwork rendered from" and the like; empty for the plain form. */
	prefix: string
	title: CreditLink
	author: { name: string; href?: string }
	/** The page the work was taken from; the title links there too. */
	source: string
	licence: CreditLink
	/** Sentence after the licence, with its full stop. */
	note: string
}

const SKETCHFAB_MODEL_A =
	'https://sketchfab.com/3d-models/boykisser-custom-low-poly-avatar-scratch-model-8f695ab60950464db46134f19fd727b5'
const SKETCHFAB_MODEL_B =
	'https://sketchfab.com/3d-models/boy-kisser-2d-6771664a8c4d431185bf012ec83b3e7e'

export const credits: readonly Credit[] = [
	{
		id: 'cat-model',
		prefix: '',
		title: {
			label: 'Boykisser Custom Low Poly Avatar (Scratch Model)',
			href: SKETCHFAB_MODEL_A,
		},
		author: {
			name: 'NEGATIVEMARE',
			href: 'https://sketchfab.com/kakoicapital',
		},
		source: SKETCHFAB_MODEL_A,
		licence: {
			label: 'CC BY 4.0',
			href: 'https://creativecommons.org/licenses/by/4.0/',
		},
		note: 'Modified: compressed for the web, posed and animated in code.',
	},
	{
		id: 'sticker',
		prefix: 'Sticker artwork rendered from',
		title: { label: 'Boy Kisser 2D', href: SKETCHFAB_MODEL_B },
		author: { name: 'Nyamewsis' },
		source: SKETCHFAB_MODEL_B,
		licence: {
			label: 'Sketchfab Standard licence',
			href: 'https://sketchfab.com/licenses',
		},
		note: 'The model file is not distributed.',
	},
]

export const BUILT_WITH =
	'Built with Next.js, three.js, GSAP, Lenis. Typefaces: Unbounded, Onest, JetBrains Mono (SIL OFL).'

/** The exact plain-text form of a credit (plan §1.2), as in `CREDITS.md`. */
export function creditText(credit: Credit): string {
	const author = credit.author.href
		? `${credit.author.name} (${credit.author.href})`
		: credit.author.name
	const head = credit.prefix ? `${credit.prefix} ` : ''
	return credit.id === 'cat-model'
		? `${head}"${credit.title.label}" by ${author}, ${credit.source}, licensed under ${credit.licence.label} (${credit.licence.href}). ${credit.note}`
		: `${head}"${credit.title.label}" by ${author}, ${credit.source} (${credit.licence.label}). ${credit.note}`
}
