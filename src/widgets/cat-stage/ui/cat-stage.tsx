'use client'

import { stampHearts } from '@/features/boop-cat/lib/stamp-hearts'
import { boop } from '@/features/boop-cat/model/boop'
import { failRoom } from '@/features/cat-room/model/room-store'
import { AmbientSound } from '@/features/cat-room/ui/ambient-sound'
import { RoomLayer } from '@/features/cat-room/ui/room-layer'
import { SceneErrorBoundary } from '@/features/cat-room/ui/scene-error-boundary'

/**
 * Client composition of the live room with the pet reaction and the sound
 * (plan §4.1): features cannot import each other, so the wiring lives here.
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
			<AmbientSound />
		</SceneErrorBoundary>
	)
}
