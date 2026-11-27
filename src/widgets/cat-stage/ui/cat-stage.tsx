'use client'

import { stampHearts } from '@/features/boop-cat/lib/stamp-hearts'
import { boop } from '@/features/boop-cat/model/boop'
import { failRoom, useRoomState } from '@/features/cat-room/model/room-store'
import { AmbientSound } from '@/features/cat-room/ui/ambient-sound'
import { RoomLayer } from '@/features/cat-room/ui/room-layer'
import { SceneErrorBoundary } from '@/features/cat-room/ui/scene-error-boundary'
import { SoundPrompt } from '@/features/toggle-sound/ui/sound-prompt'

/**
 * Client composition of the live room with the pet reaction and the sound
 * (plan §4.1): features cannot import each other, so the wiring lives here.
 * The "Enable sound" prompt appears once the room runs (plan §2), hanging
 * under the header below the first section's corner captions: out of the
 * bottom band, where the gags play and the credits end. Under the sound
 * toggle on the right from `sm` up; on phones at the left, since the lite
 * dawn framing puts the cat's head under the header on the right.
 */
export function CatStage() {
	const { status } = useRoomState()
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
			{status === 'ready' ? (
				<SoundPrompt className='fixed top-[7.5rem] left-4 z-50 sm:right-6 sm:left-auto' />
			) : null}
		</SceneErrorBoundary>
	)
}
