import { inflateSync } from 'node:zlib'

export type Rgba = {
	width: number
	height: number
	at(x: number, y: number): [number, number, number, number]
}

/**
 * A small PNG reader for screenshot clips: 8-bit grey, grey+alpha, RGB and
 * RGBA, no interlace,
 * all five filter types. Enough to sample a few pixels in a test without a
 * dependency.
 */
export function decodePng(buffer: Buffer): Rgba {
	let offset = 8
	let width = 0
	let height = 0
	let channels = 0
	const idat: Buffer[] = []
	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset)
		const type = buffer.toString('ascii', offset + 4, offset + 8)
		const data = buffer.subarray(offset + 8, offset + 8 + length)
		if (type === 'IHDR') {
			width = data.readUInt32BE(0)
			height = data.readUInt32BE(4)
			// IHDR: width, height, depth, colour type, compression, filter, interlace.
			const depth = data[8]
			const colour = data[9]
			if (depth !== 8 || data[12] !== 0)
				throw new Error(
					`unsupported PNG: depth ${depth}, interlace ${data[12]}`,
				)
			// Chromium picks the smallest type: greyscale when a clip has no colour.
			channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour] ?? 0
			if (!channels)
				throw new Error(`unsupported PNG colour type ${colour}`)
		} else if (type === 'IDAT') idat.push(data)
		else if (type === 'IEND') break
		offset += 12 + length
	}
	const raw = inflateSync(Buffer.concat(idat))
	const stride = width * channels
	const pixels = Buffer.alloc(stride * height)
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)]
		const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
		const out = y * stride
		const prev = (y - 1) * stride
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? pixels[out + x - channels] : 0
			const b = y > 0 ? pixels[prev + x] : 0
			const c = y > 0 && x >= channels ? pixels[prev + x - channels] : 0
			let value = row[x]
			if (filter === 1) value += a
			else if (filter === 2) value += b
			else if (filter === 3) value += (a + b) >> 1
			else if (filter === 4) {
				const p = a + b - c
				const pa = Math.abs(p - a)
				const pb = Math.abs(p - b)
				const pc = Math.abs(p - c)
				value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
			}
			pixels[out + x] = value & 0xff
		}
	}
	return {
		width,
		height,
		at(x, y) {
			const i = (y * width + x) * channels
			if (channels <= 2)
				return [
					pixels[i],
					pixels[i],
					pixels[i],
					channels === 2 ? pixels[i + 1] : 255,
				]
			return [
				pixels[i],
				pixels[i + 1],
				pixels[i + 2],
				channels === 4 ? pixels[i + 3] : 255,
			]
		},
	}
}
