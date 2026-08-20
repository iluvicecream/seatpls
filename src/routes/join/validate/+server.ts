import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { pb } from '$lib/config';

const BACKEND_AUTH_KEY = env.PB_AUTH_KEY ?? '';

/** Room fields returned to the client after a successful code check. */
interface RoomInfo {
	id: string;
	join_code: string;
	room_name: string;
}

/**
 * GET /join/validate?code=abc123
 *
 * Checks that the code matches an existing room's `join_code`.
 */
export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code') ?? '';

	if (!/^[a-z0-9]{6}$/.test(code)) {
		return json({ error: 'invalid code format' }, { status: 400 });
	}

	try {
		const record = await pb.collection('rooms').getFirstListItem<RoomInfo>(
			`join_code = "${code}"`,
			{ headers: { backendauthkey: BACKEND_AUTH_KEY } }
		);
		const { id, join_code, room_name } = record;
		return json({ id, join_code, room_name } satisfies RoomInfo);
	} catch {
		return json({ error: 'room not found' }, { status: 404 });
	}
};
