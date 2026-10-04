import {
	Color,
	DoubleSide,
	type IUniform,
	type Material,
	MeshBasicMaterial,
	NoBlending,
	ShaderMaterial,
	SRGBColorSpace,
} from 'three'
import { SHADING } from '../../config/tuning'

/**
 * The palette of `app/globals.css`, mirrored for the scene. Room colours are
 * these tokens or mixes of them; the cat keeps its authored colours.
 */
export const PALETTE = {
	rose: 0xda85af,
	orchid: 0xeab8e3,
	blush: 0xe5d4de,
	snow: 0xf4f4f8,
	lavender: 0xc3b9e3,
	ink: 0x120d16,
	ink2: 0x1a1320,
	ink3: 0x241a2b,
} as const

export type Hex = number
/** sRGB components 0..1, before conversion to the linear working space. */
export type Rgb = readonly [number, number, number]

export function hexToRgb(hex: Hex): Rgb {
	return [
		((hex >> 16) & 255) / 255,
		((hex >> 8) & 255) / 255,
		(hex & 255) / 255,
	]
}

/** Linear interpolation of two hex colours in sRGB, like CSS `color-mix` in srgb. */
export function mixHex(a: Hex, b: Hex, t: number): Hex {
	const ca = hexToRgb(a)
	const cb = hexToRgb(b)
	const to = (i: number) => Math.round((ca[i] + (cb[i] - ca[i]) * t) * 255)
	return (to(0) << 16) | (to(1) << 8) | to(2)
}

/** A colour and its dawn counterpart. */
export type Paint = { night: Hex; dawn: Hex }

export function paint(night: Hex, dawn: Hex = night): Paint {
	return { night, dawn }
}

/** Converts an sRGB hex (scaled by `tone` in sRGB space) to linear components. */
export function toLinear(hex: Hex, tone = 1): [number, number, number] {
	const [r, g, b] = hexToRgb(hex)
	const color = new Color().setRGB(
		r * tone,
		g * tone,
		b * tone,
		SRGBColorSpace,
	)
	return [color.r, color.g, color.b]
}

/** Uniforms shared by every patched material of a scene. */
export type SceneUniforms = {
	uDawn: IUniform<number>
	uKeyDir: IUniform<[number, number, number]>
	uToneSteps: IUniform<[number, number]>
	uToneLevels: IUniform<[number, number]>
}

export function createSceneUniforms(): SceneUniforms {
	return {
		uDawn: { value: 0 },
		uKeyDir: {
			value: [...SHADING.keyDirection] as [number, number, number],
		},
		uToneSteps: { value: [SHADING.litAbove, SHADING.shadeBelow] },
		uToneLevels: { value: [SHADING.mid, SHADING.shade] },
	}
}

export type PatchOptions = {
	uniforms: SceneUniforms
	/** The geometry carries a `colorDawn` attribute (vec3, or vec4 with alpha). */
	dawnAttribute?: 'vec3' | 'vec4'
	/** Multiply by a two-step tone from the flat normal (shading variant B). */
	tone?: boolean
	/** Warm the colour towards dawn (the cat has no `colorDawn` attribute). */
	dawnTint?: boolean
}

const TONE_VERTEX = /* glsl */ `
	vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

const TONE_FRAGMENT = /* glsl */ `
	{
		// Flat normal of the visible side, from screen-space derivatives:
		// no NORMAL attribute needed, and double-sided faces tone correctly.
		vec3 flatNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
		float key = dot(flatNormal, normalize(uKeyDir));
		float tone = key > uToneSteps.x ? 1.0 : (key > uToneSteps.y ? uToneLevels.x : uToneLevels.y);
		diffuseColor.rgb *= tone;
	}
`

const DAWN_TINT_FRAGMENT = /* glsl */ `
	diffuseColor.rgb *= mix(vec3(1.0), vec3(1.0, 0.95, 0.9), uDawn);
`

/**
 * Hooks the scene uniforms into a built-in material: the night/dawn vertex
 * colour mix, the flat two-step tone of shading variant B, the dawn tint.
 */
export function patchMaterial<T extends Material>(
	material: T,
	{ uniforms, dawnAttribute, tone, dawnTint }: PatchOptions,
): T {
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, uniforms)
		let vertex = shader.vertexShader
		let fragment = shader.fragmentShader
		const vertexHead: string[] = ['uniform float uDawn;']
		const fragmentHead: string[] = ['uniform float uDawn;']
		if (dawnAttribute) {
			vertexHead.push(`attribute ${dawnAttribute} colorDawn;`)
			// three keeps `vColor` a vec4 whatever the attribute size.
			vertex = vertex.replace(
				'#include <color_vertex>',
				dawnAttribute === 'vec4'
					? 'vColor = mix(color, colorDawn, uDawn);'
					: 'vColor = vec4(mix(color, colorDawn, uDawn), 1.0);',
			)
		}
		if (tone) {
			vertexHead.push('varying vec3 vWorldPos;')
			fragmentHead.push(
				'varying vec3 vWorldPos;',
				'uniform vec3 uKeyDir;',
				'uniform vec2 uToneSteps;',
				'uniform vec2 uToneLevels;',
			)
			vertex = vertex.replace(
				'#include <project_vertex>',
				`#include <project_vertex>\n${TONE_VERTEX}`,
			)
			fragment = fragment.replace(
				'#include <color_fragment>',
				`#include <color_fragment>\n${TONE_FRAGMENT}`,
			)
		}
		if (dawnTint)
			fragment = fragment.replace(
				'#include <color_fragment>',
				`#include <color_fragment>\n${DAWN_TINT_FRAGMENT}`,
			)
		shader.vertexShader = `${vertexHead.join('\n')}\n${vertex}`
		shader.fragmentShader = `${fragmentHead.join('\n')}\n${fragment}`
	}
	material.customProgramCacheKey = () =>
		`cat-room:${dawnAttribute ?? ''}:${tone ? 'tone' : ''}:${dawnTint ? 'tint' : ''}`
	return material
}

/** The merged static room: vertex colours, night and dawn. */
export function createRoomMaterial(uniforms: SceneUniforms, tone: boolean) {
	// Double-sided: the painted room is a thousand triangles, and large
	// single quads (walls, the sky, light pools) must show whatever their winding.
	return patchMaterial(
		new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }),
		{
			uniforms,
			dawnAttribute: 'vec3',
			tone,
		},
	)
}

/** Painted light: transparent quads with per-vertex alpha, never writing depth. */
export function createGlowMaterial(uniforms: SceneUniforms) {
	return patchMaterial(
		new MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			side: DoubleSide,
		}),
		{ uniforms, dawnAttribute: 'vec4' },
	)
}

/**
 * The screen in full mode: a hole in the premultiplied canvas through which
 * the DOM page shows, still occluding what is behind it in the scene.
 */
export function createHoleMaterial() {
	return new ShaderMaterial({
		blending: NoBlending,
		depthWrite: true,
		depthTest: true,
		vertexShader: /* glsl */ `
			void main() {
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: /* glsl */ `
			void main() {
				gl_FragColor = vec4(0.0);
			}
		`,
	})
}
