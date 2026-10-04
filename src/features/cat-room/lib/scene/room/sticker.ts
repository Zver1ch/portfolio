import {
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	SRGBColorSpace,
	type Texture,
	TextureLoader,
} from 'three'
import { STICKER } from '../../../config/room-layout'

export const STICKER_URL = '/stickers/cat-sticker.png'

export type Sticker = { mesh: Mesh; dispose(): void }

/** The 2D face render, stuck on the tower's front panel at a slight tilt. */
export async function createSticker(url = STICKER_URL): Promise<Sticker> {
	const texture: Texture = await new TextureLoader().loadAsync(url)
	texture.colorSpace = SRGBColorSpace
	texture.anisotropy = 4
	const material = new MeshBasicMaterial({
		map: texture,
		transparent: true,
		alphaTest: 0.02,
	})
	const geometry = new PlaneGeometry(STICKER.size, STICKER.size)
	const mesh = new Mesh(geometry, material)
	mesh.position.set(...STICKER.center)
	mesh.rotation.z = (STICKER.tiltDeg * Math.PI) / 180
	return {
		mesh,
		dispose() {
			geometry.dispose()
			material.dispose()
			texture.dispose()
		},
	}
}
