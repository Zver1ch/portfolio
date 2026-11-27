/**
 * The single edge into three.js (plan §3.6): the scene chunk is requested
 * here and nowhere else, so it never joins the initial route JS. The caller
 * handles rejection; a failed chunk means the static page.
 */
export type RoomSceneModule = typeof import('./scene/create-room-scene')

export function loadRoomScene(): Promise<RoomSceneModule> {
	return import('./scene/create-room-scene')
}
