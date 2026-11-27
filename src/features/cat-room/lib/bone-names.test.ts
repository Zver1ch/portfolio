import { describe, expect, it } from 'vitest'
import { normalizeBoneName } from './bone-names'

describe('normalizeBoneName', () => {
	it.each([
		['Head_017', 'head'],
		['spine_02', 'spine'],
		['Tail.001_05', 'tail001'],
		['Tail001_05', 'tail001'],
		['TailRoot_03', 'tailroot'],
		['Tail.003_end_099', 'tail003_end'],
		['hair.027_end_00', 'hair027_end'],
		['Leg_L_08', 'leg_l'],
		['Foot_L_end_0100', 'foot_l_end'],
		['Ear_L.001_019', 'ear_l001'],
		['LeftEye_024', 'lefteye'],
		['jaw_058', 'jaw'],
		['Shoulder_L_059', 'shoulder_l'],
		['Thumb_L.002_end_0121', 'thumb_l002_end'],
		['popka.001_098', 'popka001'],
		['_rootJoint', '_rootjoint'],
		['  Bow Tie 3  ', 'bow_tie'],
	])('%s → %s', (name, key) => {
		expect(normalizeBoneName(name)).toBe(key)
	})

	it('strips only one trailing numeric group', () => {
		expect(normalizeBoneName('Index_L.002_068')).toBe('index_l002')
	})

	it('maps the authored and the loader-sanitised spelling to one key', () => {
		for (const [authored, sanitised] of [
			['Tail.001_05', 'Tail001_05'],
			['hair.013_037', 'hair013_037'],
			['Ear_R.002_end_0103', 'Ear_R002_end_0103'],
		])
			expect(normalizeBoneName(authored)).toBe(
				normalizeBoneName(sanitised),
			)
	})
})
