import { afterEach, describe, expect, it } from 'vitest'
import {
	getPhoneVariant,
	PHONE_TRAITS,
	readPhoneVariant,
	resetPhoneVariant,
} from './phone-variant'

function memoryStorage(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial))
	return {
		store,
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value)
		},
		removeItem: (key: string) => {
			store.delete(key)
		},
	}
}

describe('readPhoneVariant', () => {
	it('takes the variant from the URL and remembers it', () => {
		const storage = memoryStorage()
		expect(readPhoneVariant('?phone=b', storage)).toBe('b')
		expect([...storage.store.values()]).toEqual(['b'])
	})

	it('falls back to the remembered variant without a parameter', () => {
		const storage = memoryStorage()
		readPhoneVariant('?phone=c', storage)
		expect(readPhoneVariant('', storage)).toBe('c')
		expect(readPhoneVariant('?other=1', storage)).toBe('c')
	})

	it('any other value is the default and forgets the remembered one', () => {
		const storage = memoryStorage()
		readPhoneVariant('?phone=a', storage)
		expect(readPhoneVariant('?phone=nope', storage)).toBe('default')
		expect(storage.store.size).toBe(0)
		expect(readPhoneVariant('', storage)).toBe('default')
	})

	it('survives a storage that throws, and no storage at all', () => {
		const broken = {
			getItem: () => {
				throw new Error('blocked')
			},
			setItem: () => {
				throw new Error('blocked')
			},
			removeItem: () => {
				throw new Error('blocked')
			},
		}
		expect(readPhoneVariant('?phone=a', broken)).toBe('a')
		expect(readPhoneVariant('', broken)).toBe('default')
		expect(readPhoneVariant('?phone=b', null)).toBe('b')
		expect(readPhoneVariant('', null)).toBe('default')
	})
})

describe('getPhoneVariant', () => {
	afterEach(() => {
		resetPhoneVariant()
		window.sessionStorage.clear()
		window.history.replaceState(null, '', '/')
	})

	it('resolves once per page from the location', () => {
		window.history.replaceState(null, '', '/?phone=c')
		expect(getPhoneVariant()).toBe('c')
		window.history.replaceState(null, '', '/?phone=a')
		expect(getPhoneVariant()).toBe('c')
		resetPhoneVariant()
		expect(getPhoneVariant()).toBe('a')
	})

	it('is the default on a plain URL', () => {
		expect(getPhoneVariant()).toBe('default')
	})
})

describe('PHONE_TRAITS', () => {
	it('the default is the round-5 lite: a painted page, nothing else', () => {
		expect(PHONE_TRAITS.default).toEqual({
			domPage: false,
			portraitMonitor: false,
			card: false,
			backdrop: false,
		})
	})

	it('only the card variant turns the monitor portrait, and only the real-page variants warp it', () => {
		expect(PHONE_TRAITS.c.card && PHONE_TRAITS.c.domPage).toBe(true)
		expect(PHONE_TRAITS.b.domPage && !PHONE_TRAITS.b.card).toBe(true)
		expect(PHONE_TRAITS.a.backdrop && !PHONE_TRAITS.a.domPage).toBe(true)
		expect(
			Object.values(PHONE_TRAITS).filter((t) => t.portraitMonitor),
		).toEqual([PHONE_TRAITS.c])
	})
})
