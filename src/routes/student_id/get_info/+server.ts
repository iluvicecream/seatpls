import { json, type RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/config';

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
 * Looks the student up in the PocketBase `student` collection (public read).
 */
export const GET: RequestHandler = async ({ url }) => {
	const studentId = url.searchParams.get('student_id') ?? '';

	if (!/^\d{5}$/.test(studentId)) {
		return json({ error: 'student_id must be exactly 5 digits' }, { status: 400 });
	}

	try {
		const record = await pb.collection('student').getFirstListItem<StudentInfo>(
			`student_id = "${studentId}"`
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
