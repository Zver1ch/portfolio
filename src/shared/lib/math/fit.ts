/**
 * Least-squares fit of `z = c0 + c1 x + c2 y + c3 x² + c4 xy + c5 y²` to
 * samples `[x, y, z]`; returns the fitted surface. Inputs are normalised by
 * their spread first, so the normal equations stay well conditioned.
 * Fewer than six samples (or a degenerate set) fall back to the mean of z.
 */
export function fitQuadratic2(
	samples: readonly (readonly [number, number, number])[],
): (x: number, y: number) => number {
	const n = samples.length
	const mean = n > 0 ? samples.reduce((sum, s) => sum + s[2], 0) / n : 0
	if (n < 6) return () => mean
	let spread = 0
	for (const [x, y] of samples)
		spread = Math.max(spread, Math.abs(x), Math.abs(y))
	if (spread < 1e-12) return () => mean
	const basis = (x: number, y: number) => {
		const u = x / spread
		const v = y / spread
		return [1, u, v, u * u, u * v, v * v]
	}
	// Normal equations A c = b.
	const a: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0))
	const b: number[] = Array(6).fill(0)
	for (const [x, y, z] of samples) {
		const phi = basis(x, y)
		for (let i = 0; i < 6; i++) {
			b[i] += phi[i] * z
			for (let j = 0; j < 6; j++) a[i][j] += phi[i] * phi[j]
		}
	}
	const c = solve(a, b)
	if (!c) return () => mean
	return (x, y) => {
		const phi = basis(x, y)
		let z = 0
		for (let i = 0; i < 6; i++) z += c[i] * phi[i]
		return z
	}
}

/** Gaussian elimination with partial pivoting; `null` when singular. */
function solve(matrix: number[][], rhs: number[]): number[] | null {
	const n = rhs.length
	const a = matrix.map((row, i) => [...row, rhs[i]])
	for (let col = 0; col < n; col++) {
		let pivot = col
		for (let row = col + 1; row < n; row++)
			if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
		if (Math.abs(a[pivot][col]) < 1e-12) return null
		;[a[col], a[pivot]] = [a[pivot], a[col]]
		for (let row = 0; row < n; row++) {
			if (row === col) continue
			const factor = a[row][col] / a[col][col]
			for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k]
		}
	}
	return a.map((row, i) => row[n] / row[i])
}
