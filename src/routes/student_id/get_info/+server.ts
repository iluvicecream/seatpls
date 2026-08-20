import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { pb } from '$lib/config';

/**
 * Header the `student` collection requires on reads, per its rule:
 *   @request.headers.backendauthkey = "<the PB_AUTH_KEY env value>"
 * The key comes from the `PB_AUTH_KEY` env var (see .env / wrangler vars).
 * This route runs server-side only, so it never reaches the client.
 */
const BACKEND_AUTH_KEY = env.PB_AUTH_KEY ?? '';

/**
 * Shape of the student info returned by this endpoint.
 */
export interface StudentInfo {
	student_id: string;
	student_firstname: string;
	student_lastname: string;
	student_class: string;
	student_number: string;
}

/**
 * GET /student_id/get_info?student_id=32046
 *
 * Looks the student up in the PocketBase `student` collection via the
 * unauthenticated (public) API.
 */
export const GET: RequestHandler = async ({ url }) => {
	const studentId = url.searchParams.get('student_id') ?? '';

	if (!/^\d{5}$/.test(studentId)) {
		return json({ error: 'student_id must be exactly 5 digits' }, { status: 400 });
	}

	try {
		const record = await pb.collection('student').getFirstListItem<StudentInfo>(
			`student_id = "${studentId}"`,
			{ headers: { backendauthkey: BACKEND_AUTH_KEY } }
		);
		const { student_id, student_firstname, student_lastname, student_class, student_number } =
			record;
		return json(
			{ student_id, student_firstname, student_lastname, student_class, student_number } satisfies StudentInfo
		);
	} catch {
		return json({ error: 'student not found' }, { status: 404 });
	}
};
