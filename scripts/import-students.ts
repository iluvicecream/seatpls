import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The student record shape, matching the `student` collection schema. */
interface StudentRow {
	student_number: string;
	student_id: string;
	student_class: string;
	student_firstname: string;
	student_lastname: string;
}

/** Header the `student` collection requires on requests, per its rule:
 *   @request.headers.backendauthkey = "<the PB_AUTH_KEY env value>"
 * The key comes from the `PB_AUTH_KEY` env var (.env is auto-loaded by bun). */
const BACKEND_AUTH_KEY = process.env.PB_AUTH_KEY ?? '';
if (!BACKEND_AUTH_KEY) {
	console.warn('Warning: PB_AUTH_KEY is not set — requests will be denied by the collection rule');
}

const PB_URL = process.env.PB_URL ?? process.env.PUBLIC_PB_URL ?? 'https://base.seatpls.perr.dev';

// --- load + parse the CSV -------------------------------------------------
const csv = readFileSync(path.join(here, '../src/lib/student.csv'), 'utf-8');
const lines = csv.trim().split('\n');

const rows: StudentRow[] = lines.slice(1).map((line) => {
	const [student_number, student_id, student_class, student_firstname, student_lastname] = line
		.split(',')
		.map((cell) => cell.trim());
	return { student_number, student_id, student_class, student_firstname, student_lastname };
});

console.log(`Parsed ${rows.length} students from student.csv`);

// --- push to PocketBase via the unauthenticated (public) API ---------------
const pb = new PocketBase(PB_URL);

let created = 0;
let failed = 0;

for (const row of rows) {
	try {
		await pb.collection('student').create(row, { headers: { backendauthkey: BACKEND_AUTH_KEY } });
		created++;
	} catch (err) {
		failed++;
		console.error(`Failed to import ${row.student_id}:`, (err as Error).message);
	}
}

console.log(`Done: ${created} created, ${failed} failed (of ${rows.length})`);
process.exit(failed > 0 ? 1 : 0);
