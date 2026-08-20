import PocketBase from 'pocketbase';

/**
 * Creates the full 7×13 seating grid: rows A–G, columns 1–13
 * (seat names A1 … G13, 91 seats total).
 *
 * Requires the admin PIN for the `seats` collection create rule:
 *   PB_ADMIN_PIN=123456 bun run import:seats
 * (PB_URL / PUBLIC_PB_URL are also honored, like the student importer.)
 */
const PB_URL = process.env.PB_URL ?? process.env.PUBLIC_PB_URL ?? 'https://base.seatpls.perr.dev';
const ADMIN_PIN = process.env.PB_ADMIN_PIN ?? '';

if (!ADMIN_PIN) {
	console.error('Missing PB_ADMIN_PIN env var — the admin pin required by the seats create rule.');
	process.exit(1);
}

const pb = new PocketBase(PB_URL);

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const COLS = 13;

const seats: { seat_number: string; status: string }[] = [];
for (const row of ROWS) {
	for (let col = 1; col <= COLS; col++) {
		seats.push({ seat_number: `${row}${col}`, status: 'available' });
	}
}

console.log(`Ensuring ${seats.length} seats (${ROWS[0]}1..${ROWS[ROWS.length - 1]}${COLS})`);

// existing seat numbers → idempotent (re-runs skip already-created seats)
const existing = new Set<string>();
try {
	const records = await pb.collection('seats').getFullList<{ seat_number: string }>({
		fields: 'seat_number',
	});
	for (const r of records) existing.add(r.seat_number);
} catch {
	// ignore — will just re-attempt creates
}

let created = 0;
let skipped = 0;
let failed = 0;

for (const seat of seats) {
	if (existing.has(seat.seat_number)) {
		skipped++;
		continue;
	}
	try {
		await pb.collection('seats').create(seat, { headers: { adminPin: ADMIN_PIN } });
		created++;
	} catch (err) {
		failed++;
		console.error(`Failed ${seat.seat_number}:`, (err as Error).message);
	}
}

console.log(`Done: ${created} created, ${skipped} skipped, ${failed} failed (of ${seats.length})`);
process.exit(failed > 0 ? 1 : 0);
