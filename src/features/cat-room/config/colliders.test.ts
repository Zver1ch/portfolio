import { describe, expect, it } from 'vitest'
import { roomColliders } from './colliders'
import { DESK_TOP, KEYBOARD, LAMP, MOUSE, TOWER } from './room-layout'

const colliders = roomColliders(0.6)
const named = (name: string) => {
	const collider = colliders.find((c) => c.name === name)
	if (!collider) throw new Error(`no collider ${name}`)
	return collider
}

describe('roomColliders', () => {
	it('treats everything under the desk top as inside the desk', () => {
		const desk = named('desk')
		expect(desk.depth([0.25, DESK_TOP + 0.01, -1.15])).toBe(0)
		expect(desk.depth([0.25, DESK_TOP - 0.03, -1.15])).toBeCloseTo(0.03)
		// Off the desk's footprint nothing counts.
		expect(desk.depth([2, DESK_TOP - 0.03, -1.15])).toBe(0)
	})

	it('puts the keycaps on top of the sloping keyboard wedge', () => {
		const keyboard = named('keyboard')
		const [cx, , cz] = KEYBOARD.center
		const topAtCentre =
			DESK_TOP +
			(KEYBOARD.heightBack + KEYBOARD.heightFront) / 2 +
			KEYBOARD.keyHeight
		expect(keyboard.depth([cx, topAtCentre + 0.001, cz])).toBe(0)
		expect(keyboard.depth([cx, topAtCentre - 0.004, cz])).toBeCloseTo(0.004)
		expect(keyboard.depth([cx + 1, DESK_TOP, cz])).toBe(0)
	})

	it('rounds the mouse off towards its rim', () => {
		const mouse = named('mouse')
		const [cx, , cz] = MOUSE.center
		expect(
			mouse.depth([cx, DESK_TOP + MOUSE.size[1] - 0.002, cz]),
		).toBeCloseTo(0.002)
		expect(
			mouse.depth([
				cx + MOUSE.size[0] * 0.49,
				DESK_TOP + MOUSE.size[1] * 0.5,
				cz,
			]),
		).toBe(0)
	})

	it('wraps the lamp in capsules and the tower in a box', () => {
		const shade = named('lamp shade')
		expect(shade.depth(LAMP.head)).toBeCloseTo(LAMP.shadeRadius)
		expect(
			shade.depth([LAMP.head[0], LAMP.head[1] + 0.5, LAMP.head[2]]),
		).toBe(0)
		const tower = named('tower')
		expect(tower.depth(TOWER.center)).toBeCloseTo(TOWER.size[0] / 2)
		expect(
			tower.depth([
				TOWER.center[0] + 1,
				TOWER.center[1],
				TOWER.center[2],
			]),
		).toBe(0)
	})
})
