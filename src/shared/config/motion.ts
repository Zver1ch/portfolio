/** Full scroll-story experience: wide screen and motion allowed. */
export const STORY_FULL_QUERY =
	'(min-width: 64rem) and (prefers-reduced-motion: no-preference)'
/** Small screens that still allow motion: no pins, lighter scrubbing. */
export const STORY_LITE_QUERY =
	'(max-width: 63.999rem) and (prefers-reduced-motion: no-preference)'
export const STORY_REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
export const FINE_POINTER_QUERY =
	'(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
