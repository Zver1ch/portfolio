/**
 * Stable keys for the cat's bones.
 *
 * Sketchfab suffixes every node with a running number (`Head_017`,
 * `Tail.001_05`) and three's GLTFLoader strips the dots from node names
 * (`Tail001_05`), so neither spelling works as an identifier. The key is the
 * name lower-cased, whitespace turned into `_`, dots dropped and one trailing
 * `_<digits>` group removed: `Head_017` → `head`, `Tail.001_05` and
 * `Tail001_05` → `tail001`, `Thumb_L.002_end_0121` → `thumb_l002_end`.
 *
 * Kept free of imports: the asset scripts load it straight into Node.
 */
export function normalizeBoneName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/\./g, '')
		.replace(/_\d+$/, '')
}
