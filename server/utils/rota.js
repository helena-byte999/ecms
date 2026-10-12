// Rota rules shared by the API and the demo data.

// Deal caregivers round-robin across the 7 days, so everyone's share of the week
// differs by at most one shift and nobody is on the same day twice.
// `perDay` is capped at the number of caregivers.
function buildRota(caregivers, perDay) {
	const shuffled = caregivers
		.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value);
	const size = Math.min(Math.max(perDay, 1), shuffled.length);
	const rota = {};
	let next = 0;
	for (let day = 0; day < 7; day++) {
		rota[day] = [];
		for (let slot = 0; slot < size; slot++) {
			const c = shuffled[next % shuffled.length];
			rota[day].push({ name: `${c.first_name} ${c.last_name}`, email: c.email });
			next++;
		}
	}
	return { rota, perDay: size };
}

// Monday–Sunday week containing `date`, numbered the same way as the admin
// "Generate rota" form (client/src/views/admin/Schedule.js).
function weekOf(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dDay = d.getUTCDay() > 0 ? d.getUTCDay() : 7;
	const monday = new Date(d);
	monday.setUTCDate(d.getUTCDate() - dDay + 1);
	const sunday = new Date(monday);
	sunday.setUTCDate(monday.getUTCDate() + 6);
	const jan1 = new Date(Date.UTC(sunday.getUTCFullYear(), 0, 1));
	const dayNr = Math.ceil((sunday - jan1) / 86400000);
	const week = Math.ceil((dayNr + jan1.getUTCDay()) / 7);
	const ymd = x => x.toISOString().slice(0, 10);
	return { first: ymd(monday), last: ymd(sunday), week: String(week) };
}

module.exports = { buildRota, weekOf };
