'use client'

import { stampHearts } from '@/features/boop-cat/lib/stamp-hearts'
import { boop } from '@/features/boop-cat/model/boop'
import { failRoom } from '@/features/cat-room/model/room-store'
import { RoomLayer } from '@/features/cat-room/ui/room-layer'
import { SceneErrorBoundary } from '@/features/cat-room/ui/scene-error-boundary'

/**
 * Client composition of the live room with the pet reaction: features
 * cannot import each other, so the wiring lives here (plan §4.1).
 */
export function CatStage() {
	return (
		<SceneErrorBoundary
			fallback={null}
			onError={() => failRoom('render error')}
		>
			<RoomLayer
				onPet={(origin) => {
					boop()
					stampHearts(origin)
				}}
			/>
		</SceneErrorBoundary>
	)
}
