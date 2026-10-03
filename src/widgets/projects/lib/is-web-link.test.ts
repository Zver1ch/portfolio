import { describe, expect, it } from 'vitest'
import { isWebLink } from './is-web-link'

describe('isWebLink', () => {
	it('accepts http(s) urls', () => {
		expect(isWebLink('https://github.com/Zver1ch')).toBe(true)
		expect(isWebLink('http://localhost:3000')).toBe(true)
	})

	it('rejects placeholders, other schemes and empty values', () => {
		expect(isWebLink('TODO: ссылка на проект')).toBe(false)
		expect(isWebLink('javascript:alert(1)')).toBe(false)
		expect(isWebLink('')).toBe(false)
		expect(isWebLink(undefined)).toBe(false)
	})
})
