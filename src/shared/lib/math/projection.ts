import {
	add,
	cross,
	dot,
	normalize,
	scale,
	sub,
	type Vec2,
	type Vec3,
} from './vec3'

/** A look-at camera: the same pose drives the three.js camera and the DOM warp. */
export type CameraPose = {
	position: Vec3
	target: Vec3
	/** Vertical field of view in degrees. */
	fov: number
}

/**
 * Where a world point lands in a `width × height` CSS-pixel viewport seen by
 * `cam` (up = +Y, `lookAt(target)`, `updateProjectionMatrix()`), or `null`
 * when it is behind the camera. Matches three's PerspectiveCamera to
 * floating-point precision.
 */
export function projectPoint(
	point: Vec3,
	cam: CameraPose,
	width: number,
	height: number,
): Vec2 | null {
	const f = normalize(sub(cam.target, cam.position))
	const r = normalize(cross(f, [0, 1, 0]))
	const u = cross(r, f)
	const v = sub(point, cam.position)
	const depth = dot(v, f)
	if (depth <= 1e-4) return null
	const t = Math.tan((cam.fov * Math.PI) / 360)
	return [
		((dot(v, r) / (depth * t * (width / height)) + 1) / 2) * width,
		((1 - dot(v, u) / (depth * t)) / 2) * height,
	]
}

/**
 * The world point `depth` metres in front of the camera along the ray through
 * a CSS pixel: the inverse of `projectPoint` for one depth.
 */
export function unprojectPoint(
	pixel: Vec2,
	cam: CameraPose,
	width: number,
	height: number,
	depth: number,
): Vec3 {
	const f = normalize(sub(cam.target, cam.position))
	const r = normalize(cross(f, [0, 1, 0]))
	const u = cross(r, f)
	const t = Math.tan((cam.fov * Math.PI) / 360)
	const x = ((pixel[0] / width) * 2 - 1) * t * (width / height)
	const y = (1 - (pixel[1] / height) * 2) * t
	return add(
		cam.position,
		scale(add(add(f, scale(r, x)), scale(u, y)), depth),
	)
}
