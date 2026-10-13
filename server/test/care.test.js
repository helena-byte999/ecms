// Care records and account rules: who can read and write, corrections, doctor's visits,
// reports, family access and the dose schedule. Run with `npm test` from server/.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');
const { local, instant, addDays } = require('../utils/time');
const { doseSlots, tallyDoses, current } = require('../utils/care');

const SERVER_DIR = path.join(__dirname, '..');
const PORT = Number(process.env.TEST_PORT_CARE) || 5096;
const BASE = `http://localhost:${PORT}`;
let failures = 0;

function check(name, cond, extra = '') {
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
	if (!cond) failures++;
}

async function call(method, p, { token, body } = {}) {
	const res = await fetch(BASE + p, {
		method,
		headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
		body: body ? JSON.stringify(body) : undefined,
	});
	let data = null;
	try { data = await res.json(); } catch (e) { }
	return { status: res.status, data };
}

const person = (email, role, extra = {}) => ({
	email, role, first_name: 'Test', last_name: email.split('@')[0], dob: '1940-01-01',
	address: '1 Street', phone: '000', password: 'pass1234', ...extra,
});

function scheduleChecks() {
	// A medicine at 08:00 and 20:00, added two days ago at 09:00, on a fixed "now"
	const day = '2026-03-10';
	const now = instant(day, '12:30');
	const med = { _id: 'm1', name: 'Test', times: ['08:00', '20:00'], start_date: addDays(day, -2), status: 'active', added_at: instant(addDays(day, -2), '09:00') };
	const dose = (date, time, outcome, id, extra = {}) => ({ _id: id, type: 'dose', dose: { medication: 'm1', date, time, outcome }, ...extra });
	const entries = [
		dose(addDays(day, -1), '08:00', 'given', 'e1'),
		dose(addDays(day, -1), '20:00', 'given', 'e2'),
		dose(addDays(day, -1), '20:00', 'refused', 'e3', { corrects: 'e2' }),
	];
	const slots = doseSlots([med], entries, addDays(day, -2), day, now);
	const at = (d, t) => slots.find(s => s.date === d && s.time === t)?.status;
	check('schedule: a dose before the medicine was added does not count', !at(addDays(day, -2), '08:00'));
	check('schedule: an unrecorded past dose is "not recorded"', at(addDays(day, -2), '20:00') === 'not_recorded');
	check('schedule: a correction replaces the original outcome', at(addDays(day, -1), '20:00') === 'refused' && current(entries).length === 2);
	check('schedule: a dose more than an hour overdue today is "late"', at(day, '08:00') === 'late');
	check('schedule: doses later today are not counted yet', !at(day, '20:00'));
	const withUpcoming = doseSlots([med], entries, day, day, now, { upcoming: true });
	check('schedule: the round also lists the rest of today as "upcoming"', withUpcoming.find(s => s.time === '20:00')?.status === 'upcoming');
	const early = doseSlots([med], [dose(day, '20:00', 'given', 'e4')], day, day, now);
	check('schedule: a dose recorded early counts as given', early.find(s => s.time === '20:00')?.status === 'given');
	const t = tallyDoses(slots);
	check('schedule: totals and completion', t.scheduled === 4 && t.given === 1 && t.refused === 1 && t.not_recorded === 1 && t.due === 1 && t.completion === 33, JSON.stringify(t));
	const stopped = { ...med, status: 'stopped', stopped_at: instant(addDays(day, -1), '12:00') };
	const s2 = doseSlots([stopped], [], addDays(day, -1), day, now);
	check('schedule: nothing is due after a medicine is stopped', s2.length === 1 && s2[0].time === '08:00');
	const course = { ...med, end_date: addDays(day, -1) };
	check('schedule: nothing is due after a course ends', !doseSlots([course], [], day, day, now).length);
}

(async () => {
	scheduleChecks();

	const mongo = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
	const server = spawn('node', ['index.js'], {
		cwd: SERVER_DIR,
		env: { ...process.env, LocalPort: String(PORT), mongoURL: mongo.getUri() + 'ecms', jwtSecret: 'test-secret', ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'adminpass' },
	});
	let log = '';
	server.stdout.on('data', d => log += d);
	server.stderr.on('data', d => log += d);
	for (let i = 0; i < 60 && !log.includes('Admin account created'); i++) await new Promise(r => setTimeout(r, 200));

	const signIn = async (email, password = 'pass1234') => (await call('POST', '/api/auth', { body: { email, password } })).data?.token;
	const admin = await signIn('admin@test.com', 'adminpass');
	const add = (body) => call('POST', '/api/user/add_user', { token: admin, body });

	// ---- Accounts
	check('unknown roles are rejected', (await add(person('odd@test.com', 'superuser'))).status === 400);
	check('an admin can add another admin', (await add(person('admin2@test.com', 'admin'))).data?.status === true && !!(await signIn('admin2@test.com')));
	const resident = (await add(person('res@test.com', 'client'))).data.data;
	const other = (await add(person('other@test.com', 'client'))).data.data;
	await add(person('carer@test.com', 'caregiver'));
	check('a family member must be linked to a resident', (await add({ email: 'fam0@test.com', role: 'family', first_name: 'A', last_name: 'B', phone: '1', password: 'pass1234' })).status === 400);
	const famRes = await add({ email: 'fam@test.com', role: 'family', first_name: 'Fam', last_name: 'Ily', phone: '1', password: 'pass1234', resident: resident._id, relationship: 'Son' });
	check('family member added with contact details only (no date of birth or address)', famRes.data?.status === true && famRes.data.data.relationship === 'Son');
	const caregiver = await signIn('carer@test.com');
	const family = await signIn('fam@test.com');
	check('residents cannot sign in (their family members do)', !(await signIn('res@test.com')));
	await add({ email: 'otherfam@test.com', role: 'family', first_name: 'Other', last_name: 'Family', phone: '1', password: 'pass1234', resident: other._id });
	const otherLogin = await signIn('otherfam@test.com');
	const me = (await call('GET', '/api/auth/user', { token: family })).data;
	check('family sign-in returns the linked resident', me?.role === 'family' && me.resident?.email === 'res@test.com');
	check('admin can list a resident\'s family', (await call('GET', `/api/user/family/${resident._id}`, { token: admin })).data?.count === 1);
	check('family can read their resident\'s invoices and figures', (await call('GET', '/api/invoice/show_invoice/res@test.com', { token: family })).status === 200 && (await call('GET', '/api/user/get_counts/res@test.com', { token: family })).status === 200);
	check('family cannot read another resident\'s invoices', (await call('GET', '/api/invoice/show_invoice/other@test.com', { token: family })).status === 403);
	const contracts = (await call('GET', '/api/user/show_all_contracts', { token: admin })).data;
	check('family members are not listed as people without contracts', !contracts.noContracts.some(u => u.role === 'family'));
	check('family members cannot change account status', (await call('PATCH', `/api/user/set_status/${me._id}`, { token: family, body: { status: 'in-active' } })).status === 403);

	// ---- Medicines
	const R = `/api/care/${resident._id}`;
	const now = local().time;
	const medBody = { name: 'Metformin', dose: '500 mg', times: [now], instructions: 'With food' };
	check('families cannot add medicines', (await call('POST', `${R}/medications`, { token: family, body: medBody })).status === 403);
	check('a medicine needs a time or "as needed"', (await call('POST', `${R}/medications`, { token: caregiver, body: { name: 'X', dose: '1' } })).status === 400);
	const med = (await call('POST', `${R}/medications`, { token: caregiver, body: medBody })).data?.data;
	check('a caregiver can add a medicine', med?.name === 'Metformin' && med.added_by?.name);
	const prn = (await call('POST', `${R}/medications`, { token: admin, body: { name: 'Paracetamol', dose: '1 g', as_needed: true } })).data?.data;
	const toStop = (await call('POST', `${R}/medications`, { token: admin, body: { name: 'Old pill', dose: '1 tablet', times: ['23:59'] } })).data?.data;

	// ---- Doses and the round
	const doseBody = (outcome, extra = {}) => ({ type: 'dose', dose: { medication: med._id, time: now, outcome }, ...extra });
	const given = await call('POST', `${R}/entries`, { token: caregiver, body: doseBody('given') });
	check('a caregiver records a dose', given.status === 201 && given.data.data.author.role === 'caregiver');
	check('the same dose cannot be recorded twice', (await call('POST', `${R}/entries`, { token: caregiver, body: doseBody('given') })).status === 409);
	const round = (await call('GET', '/api/care/round', { token: caregiver })).data?.data;
	const slot = round?.slots.find(s => s.medication._id === med._id && s.time === now);
	check('today\'s round shows the dose as given', slot?.status === 'given' && slot.resident.name.includes('res'), JSON.stringify(slot));
	check('"as needed" medicines are listed separately on the round', round?.as_needed.some(a => a.medication._id === prn._id));
	check('the round is for staff only', (await call('GET', '/api/care/round', { token: family })).status === 403);
	const fix = await call('POST', `${R}/entries`, { token: admin, body: doseBody('refused', { corrects: given.data.data._id, note: 'Recorded by mistake; she refused it.' }) });
	check('a dose can be corrected', fix.status === 201);
	check('a corrected entry cannot be corrected again', (await call('POST', `${R}/entries`, { token: admin, body: doseBody('missed', { corrects: given.data.data._id }) })).status === 409);
	const round2 = (await call('GET', '/api/care/round', { token: admin })).data.data;
	check('the round shows the corrected outcome', round2.slots.find(s => s.medication._id === med._id && s.time === now)?.status === 'refused');
	check('an "as needed" dose needs a reason', (await call('POST', `${R}/entries`, { token: caregiver, body: { type: 'dose', dose: { medication: prn._id, outcome: 'given' } } })).status === 400);
	check('an "as needed" dose with a reason is recorded', (await call('POST', `${R}/entries`, { token: caregiver, body: { type: 'dose', note: 'Headache', dose: { medication: prn._id, outcome: 'given' } } })).status === 201);

	// ---- Other entries
	const post = (body, token = caregiver) => call('POST', `${R}/entries`, { token, body });
	check('a meal needs how much was eaten', (await post({ type: 'meal', meal: { meal: 'lunch' } })).status === 400);
	check('an incident needs a description', (await post({ type: 'incident', incident: { kind: 'fall', severity: 'minor' } })).status === 400);
	check('entries cannot be in the future', (await post({ type: 'note', note: 'x', at: new Date(Date.now() + 3600000).toISOString() })).status === 400);
	check('temperature must be realistic', (await post({ type: 'wellbeing', wellbeing: { temperature: 50 } })).status === 400);
	const okEntries = await Promise.all([
		post({ type: 'meal', meal: { meal: 'lunch', eaten: 'most', drink_ml: 200 } }),
		post({ type: 'care', care: { tasks: ['wash', 'dress', 'not-a-task'] } }),
		post({ type: 'wellbeing', wellbeing: { mood: 'content', temperature: 37.9, unwell: true } }),
		post({ type: 'incident', note: 'Slipped in the bathroom.', incident: { kind: 'fall', severity: 'minor', action: 'Checked, no injury', family_informed: true } }),
		post({ type: 'activity', activity: { name: 'Garden walk' } }),
	]);
	check('meal, personal care, wellbeing, incident and activity entries are recorded', okEntries.every(r => r.status === 201) && okEntries[1].data.data.care.tasks.length === 2);
	check('family cannot add entries', (await post({ type: 'note', note: 'hi' }, family)).status === 403);
	const log1 = (await call('GET', `${R}/entries`, { token: family })).data;
	check('family can read their resident\'s care log', log1?.data?.length >= 8, String(log1?.data?.length));
	check('the corrected original stays in the log, marked as corrected', log1.data.some(e => e._id === given.data.data._id && e.corrected_by));
	check("another resident's family cannot read this care log", (await call('GET', `${R}/entries`, { token: otherLogin })).status === 403);
	check('care log can be filtered by type', (await call('GET', `${R}/entries?type=incident`, { token: admin })).data.data.length === 1);
	check('there is no way to delete an entry', (await call('DELETE', `${R}/entries/${given.data.data._id}`, { token: admin })).status === 404);

	// ---- Stopping medicines and doctor's visits
	check('stopping a medicine needs a reason', (await call('POST', `${R}/medications/${toStop._id}/stop`, { token: caregiver, body: {} })).status === 400);
	check('a medicine can be stopped', (await call('POST', `${R}/medications/${toStop._id}/stop`, { token: caregiver, body: { reason: 'No longer needed' } })).data?.data?.status === 'stopped');
	check('a stopped medicine takes no new doses', (await call('POST', `${R}/entries`, { token: caregiver, body: { type: 'dose', dose: { medication: toStop._id, time: '23:59', outcome: 'given' } } })).status === 400);
	check('a stopped medicine cannot be stopped again', (await call('POST', `${R}/medications/${toStop._id}/stop`, { token: caregiver, body: { reason: 'x' } })).status === 409);
	check('a visit needs an outcome', (await call('POST', `${R}/visits`, { token: caregiver, body: { professional: 'Dr Lee, GP', reason: 'Cough' } })).status === 400);
	const visit = await call('POST', `${R}/visits`, {
		token: caregiver,
		body: {
			professional: 'Dr Lee, GP', reason: 'Cough and fever', outcome: 'Chest infection, antibiotics for a week',
			start: [{ name: 'Amoxicillin', dose: '500 mg', times: ['08:00', '14:00', '20:00'], end_date: addDays(local().date, 6), reason: 'Chest infection' }],
			stop: [{ id: med._id }],
			profile: { allergy: 'Penicillin', conditions: 'Chest infection' },
		},
	});
	check('a doctor\'s visit is recorded', visit.status === 201 && visit.data.data.visit.started.length === 1 && visit.data.data.visit.stopped.length === 1);
	const meds = (await call('GET', `${R}/medications`, { token: family })).data;
	check('the visit starts and stops medicines automatically', meds.active.some(m => m.name === 'Amoxicillin' && m.visit === visit.data.data._id) && meds.stopped.some(m => m._id === med._id && m.stop_reason.includes('Dr Lee')));
	const profile = (await call('GET', '/api/user/show_user_by_email/res@test.com', { token: admin })).data.data;
	check('the visit updates the medical profile', profile.Medical?.allergy === 'Penicillin' && profile.Medical?.others === 'Chest infection');
	check('the visit records what changed', visit.data.data.visit.changes.length === 2 && visit.data.data.visit.changes[0].from === '');
	check('a visit cannot stop a medicine that is not on the list', (await call('POST', `${R}/visits`, { token: admin, body: { professional: 'Dr X', reason: 'r', outcome: 'o', stop: [{ id: toStop._id }] } })).status === 400);

	// ---- Reports
	const summary = await call('GET', `${R}/summary`, { token: family });
	const sd = summary.data?.data;
	check('family can download their resident\'s care summary', summary.status === 200 && sd.doses.refused === 1 && sd.doses.as_needed_given === 1 && sd.incidents.length === 1 && sd.visits.length === 1, JSON.stringify(sd?.doses));
	check('summary includes wellbeing, meals and medicine changes', sd.wellbeing.max_temperature === 37.9 && sd.wellbeing.days_unwell === 1 && sd.meals.recorded === 1 && sd.changes.some(c => c.kind === 'started' && c.name === 'Amoxicillin'));
	check('caregivers cannot download summaries', (await call('GET', `${R}/summary`, { token: caregiver })).status === 403);
	const report = await call('GET', '/api/care/report', { token: admin });
	const row = report.data?.data?.residents.find(r => r._id === resident._id);
	check('admin home overview has a row per resident', report.status === 200 && report.data.data.residents.length === 2 && row.refused === 1 && row.incidents === 1 && row.visits === 1);
	// the caregiver's dose was replaced by the admin's correction, so 7 of their entries count
	check('home overview counts entries per caregiver', report.data.data.caregivers.some(c => c.role === 'caregiver' && c.entries === 7));
	const an = report.data.data;
	check('analytics: one row per day and the previous period of the same length', an.daily.length === 7 && an.previous.daily.length === 7 && an.previous.from < an.from);
	check('analytics: resident trend and on-time rate', row.trend.length === 7 && row.on_time_rate === 100, JSON.stringify({ trend: row.trend, on_time: row.on_time_rate }));
	check('analytics: incidents by kind and moods', an.incidents_by_kind.some(k => k.kind === 'fall' && k.count === 1) && an.moods.content === 1);
	check('analytics: refusals by medicine', an.medicines[0]?.name === 'Metformin' && an.medicines[0].refused === 1);
	check('analytics: days unwell', an.totals.unwell_days === 1 && an.totals.residents_unwell === 1);
	check('home overview is admin-only', (await call('GET', '/api/care/report', { token: caregiver })).status === 403);
	check('a bad date range is rejected', (await call('GET', `${R}/summary?from=2026-05-01&to=2026-04-01`, { token: admin })).status === 400);

	// ---- Key worker and care team (shown to families)
	const carerId = (await call('GET', '/api/user/show_user_by_email/carer@test.com', { token: admin })).data.data._id;
	check('a key worker must be a caregiver', (await call('PATCH', `/api/user/update_user/${resident._id}`, { token: admin, body: { key_worker: me._id } })).status === 400);
	const assigned = await call('PATCH', `/api/user/update_user/${resident._id}`, { token: admin, body: { key_worker: carerId } });
	check('admin assigns a key worker to a resident', assigned.data?.data?.key_worker === carerId);
	const famView = (await call('GET', '/api/care/residents', { token: family })).data;
	check("family sees their relative's key worker by name", famView.data[0].key_worker?.name === 'Test carer' && Array.isArray(famView.on_shift_today), JSON.stringify(famView.data[0].key_worker));
	check('the care log names the key worker too', (await call('GET', `${R}/entries`, { token: family })).data.resident.key_worker?.name === 'Test carer');
	check('a key worker can be cleared', (await call('PATCH', `/api/user/update_user/${resident._id}`, { token: admin, body: { key_worker: '' } })).data?.data?.key_worker == null);

	// ---- Who sees which residents
	const list = async (token) => (await call('GET', '/api/care/residents', { token })).data?.data || [];
	check('staff see every resident', (await list(caregiver)).length === 2);
	check('family see only their resident', (await list(family)).map(r => r.email).join() === 'res@test.com');
	check("another family sees only their own resident", (await list(otherLogin)).map(r => r.email).join() === 'other@test.com');

	server.kill();
	await mongo.stop();
	if (failures) console.log('--- server log ---\n' + log);
	console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
	process.exit(failures ? 1 : 0);
})();
