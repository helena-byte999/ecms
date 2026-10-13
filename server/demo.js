// Demo mode (DEMO_MODE=true): the database holds sample data that anyone can try
// through one-click demo logins, and it is wiped and re-seeded every night.
// Never enable this on a database with real care records.
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Users = require('./models/User');
const Invoices = require('./models/Invoice');
const Schedule = require('./models/Schedule');
const Meta = require('./models/Meta');
const Medications = require('./models/Medication');
const CareEntries = require('./models/CareEntry');
const { buildRota, weekOf } = require('./utils/rota');
const { local, instant, addDays, minutes } = require('./utils/time');

const enabled = () => process.env.DEMO_MODE === 'true';

// The accounts behind the "Try as …" buttons; they also accept DEMO_PASSWORD
const ACCOUNTS = {
	admin: 'admin@example.com',
	caregiver: 'caregiver@example.com',
	client: 'margaret.okafor@example.com', // Margaret Okafor: a resident record (residents don't sign in)
	family: 'family@example.com', // Margaret's daughter
};
// The one-click sign-in buttons
const SIGN_IN_ROLES = ['admin', 'caregiver', 'family'];
const isDemoAccount = (user) => !!user && Object.values(ACCOUNTS).includes(user.email);

const RESET_HOUR_UTC = 3;
// Days of sample care history, enough to compare a 30-day period with the one before
const HISTORY_DAYS = 60;
// Bump when the sample data changes, so the next deploy re-seeds straight away
const SEED_VERSION = 7;
const DAY = 86400000;

const caregivers = [
	['Grace', 'Adeyemi', ACCOUNTS.caregiver, 'active', 'Permanent'],
	['Tomás', 'Rivera', 'tomas.rivera@example.com', 'active', 'Permanent'],
	['Priya', 'Nair', 'priya.nair@example.com', 'active', 'Contract'],
	['Daniel', 'Osei', 'daniel.osei@example.com', 'active', 'Permanent'],
	['Sophie', 'Clarke', 'sophie.clarke@example.com', 'active', 'Contract'],
	['Yusuf', 'Bello', 'yusuf.bello@example.com', 'active', 'Permanent'],
	['Hannah', 'Price', 'hannah.price@example.com', 'on-leave', 'Permanent'],
	['Kwame', 'Mensah', 'kwame.mensah@example.com', 'in-active', 'Volunteer'],
];

// [first, last, email, contract: 'valid' | 'soon' (ends within 30 days) | 'expired' | 'none', monthly amount]
const clients = [
	['Margaret', 'Okafor', ACCOUNTS.client, 'valid', 2400],
	['Edward', 'Lindqvist', 'edward.lindqvist@example.com', 'valid', 2150],
	['Agnes', 'Mensah', 'agnes.mensah@example.com', 'valid', 2850],
	['Harold', 'Brennan', 'harold.brennan@example.com', 'expired', 1950],
	['Winifred', 'Shaw', 'winifred.shaw@example.com', 'soon', 3100],
	['Arthur', 'Kowalski', 'arthur.kowalski@example.com', 'valid', 2600],
	['Beatrice', 'Eze', 'beatrice.eze@example.com', 'none', 0],
	['Leonard', 'Fitzgerald', 'leonard.fitzgerald@example.com', 'soon', 2250],
	['Dorothy', 'Hughes', 'dorothy.hughes@example.com', 'expired', 2700],
	['Samuel', 'Achebe', 'samuel.achebe@example.com', 'valid', 1850],
	['Irene', 'Novak', 'irene.novak@example.com', 'none', 0],
	['Walter', 'Grant', 'walter.grant@example.com', 'valid', 3200],
];

const medical = [
	{ gp_name: 'Dr Amara Patel, Riverside Surgery', gp_phone: '0113 496 0101', allergy: 'Penicillin', others: 'Type 2 diabetes; needs reminders at mealtimes' },
	{ gp_name: 'Dr Tom Hughes, Kirkgate Medical Centre', gp_phone: '0113 496 0202', allergy: 'None known', others: 'Mild hearing loss; uses a walking frame' },
	{ gp_name: 'Dr Amara Patel, Riverside Surgery', gp_phone: '0113 496 0101', allergy: 'Shellfish', others: 'High blood pressure; low-salt diet' },
	{ gp_name: 'Dr Sara Khan, Headingley Health Centre', gp_phone: '0113 496 0303', allergy: 'Latex', others: 'Early-stage dementia; prefers morning visits' },
];
const relatives = ['Daughter', 'Son', 'Niece', 'Spouse', 'Grandson'];

const ymd = (d) => d.toISOString().slice(0, 10);
const monthName = (d) => d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function contractFor(kind, now) {
	if (kind === 'none') return [];
	if (kind === 'soon') {
		return [{ start_date: ymd(new Date(now - 345 * DAY)), end_date: ymd(new Date(now + 20 * DAY)), description: 'Residential care agreement' }];
	}
	if (kind === 'expired') {
		return [{ start_date: ymd(new Date(now - 395 * DAY)), end_date: ymd(new Date(now - 30 * DAY)), description: 'Residential care agreement' }];
	}
	return [{ start_date: ymd(new Date(now - 200 * DAY)), end_date: ymd(new Date(now + 165 * DAY)), description: 'Residential care agreement' }];
}

async function resetDemoData() {
	const now = Date.now();
	const password = await bcrypt.hash(process.env.DEMO_PASSWORD || 'ecms-demo', 10);
	const base = (first, last, email, i) => ({
		email,
		first_name: first,
		last_name: last,
		password,
		address: `${12 + i} Willow Lane, Leeds LS${(i % 9) + 1}`,
		phone: `07700 900${String(100 + i).padStart(3, '0')}`,
	});

	await Promise.all([Users.deleteMany({}), Invoices.deleteMany({}), Schedule.deleteMany({}), Medications.deleteMany({}), CareEntries.deleteMany({})]);

	const people = [
		{ ...base('Olivia', 'Bennett', ACCOUNTS.admin, 0), role: 'admin', dob: '1984-06-21', description: 'Care home manager' },
		...caregivers.map(([first, last, email, status, staff_type], i) => ({
			...base(first, last, email, i + 1),
			role: 'caregiver',
			status,
			staff_type,
			dob: `${1979 + (i % 14)}-0${(i % 9) + 1}-14`,
			description: 'Senior care assistant',
			Contracts: contractFor('valid', now),
		})),
		...clients.map(([first, last, email, kind], i) => ({
			...base(first, last, email, i + 20),
			role: 'client',
			dob: `${1934 + (i % 13)}-${String((i % 12) + 1).padStart(2, '0')}-09`,
			description: 'Residential care with daily living support',
			Medical: medical[i % medical.length],
			NextOfKin: { name: `${['Chidi', 'Anna', 'James', 'Ruth', 'Tunde'][i % 5]} ${last}`, phone: `07700 901${String(100 + i).padStart(3, '0')}`, address: 'Leeds', relationship: relatives[i % relatives.length] },
			EmergencyContact: { name: `${['Chidi', 'Anna', 'James', 'Ruth', 'Tunde'][i % 5]} ${last}`, phone: `07700 901${String(100 + i).padStart(3, '0')}`, address: 'Leeds', relationship: relatives[i % relatives.length] },
			Contracts: contractFor(kind, now),
		})),
	];
	const created = await Users.insertMany(people);
	const residents = created.filter(u => u.role === 'client');
	const family = residents.slice(0, 5).map((r, i) => {
		const [first, last] = r.NextOfKin.name.split(' ');
		return {
			...base(first, last, i === 0 ? ACCOUNTS.family : `${first}.${last}.family@example.com`.toLowerCase(), i + 40),
			role: 'family', resident: r._id, relationship: r.NextOfKin.relationship,
			dob: undefined, address: undefined,
		};
	});
	const familyMembers = await Users.insertMany(family);

	// Six monthly invoices for every client who has (or had) a contract: earlier
	// months paid, this month unpaid; clients with an expired contract still owe last month
	const invoices = [];
	clients.forEach(([, , email, kind, amount]) => {
		if (kind === 'none') return;
		for (let back = 5; back >= 0; back--) {
			const d = new Date(now);
			const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1, 9));
			const due = new Date(month.getTime() + 14 * DAY);
			const paid = back >= 2 || (back === 1 && kind !== 'expired');
			invoices.push({
				email, amount, type: 'Monthly care', description: `${monthName(month)} care package`,
				date_created: month, due_date: ymd(due),
				status: paid ? 'paid' : 'unpaid',
				paid_at: paid ? new Date(month.getTime() + 9 * DAY) : undefined,
			});
		}
	});
	await Invoices.insertMany(invoices);

	// This week's and last week's rota from the active caregivers
	const active = created.filter(u => u.role === 'caregiver' && u.status === 'active');
	const rotas = [];
	for (const when of [new Date(now - 7 * DAY), new Date(now)]) {
		const { first, last, week } = weekOf(when);
		const { rota } = buildRota(active, 4);
		rotas.push({ first, last, rota });
		await new Schedule({ start_date: first, end_date: last, week, schedule: rota }).save();
	}

	const care = await seedCare(residents, active, rotas, now);

	await Meta.findOneAndUpdate({ key: 'demo_last_reset' }, { value: new Date(now) }, { upsert: true });
	await Meta.findOneAndUpdate({ key: 'demo_seed_version' }, { value: SEED_VERSION }, { upsert: true });
	console.log(`Demo data reset: ${created.length + familyMembers.length} people, ${invoices.length} invoices, 2 rotas, ${care.medicines} medicines, ${care.entries} care entries`);
}

// Medicines by care profile (same order as `medical`): [name, dose, times or null for "as needed", reason, instructions]
const MEDICINES = [
	[['Metformin', '500 mg', ['08:00', '18:00'], 'Type 2 diabetes', 'With food'], ['Atorvastatin', '20 mg', ['20:00'], 'Cholesterol', '']],
	[['Calcium and vitamin D', '1 tablet', ['12:00'], 'Bone health', 'Chewable'], ['Paracetamol', '1 g', null, 'Joint pain', 'No more than 4 doses in 24 hours']],
	[['Amlodipine', '5 mg', ['08:00'], 'High blood pressure', ''], ['Furosemide', '40 mg', ['08:00'], 'Ankle swelling', 'In the morning']],
	[['Donepezil', '10 mg', ['20:00'], 'Dementia', 'At bedtime'], ['Sertraline', '50 mg', ['08:00'], 'Low mood', '']],
];
const ACTIVITIES = ['Chair exercises', 'Music afternoon', 'Garden walk', 'Bingo', 'Reminiscence group', 'Baking club'];
const MOODS = ['content', 'settled', 'content', 'settled', 'low', 'content', 'anxious'];

// Small repeatable random numbers, so the sample week looks the same each reset
function seeded(seed) {
	let x = seed % 2147483647 || 1;
	return () => (x = (x * 16807) % 2147483647) / 2147483647;
}
const dayNumber = (date) => Math.floor(Date.parse(date + 'T12:00:00Z') / DAY);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const stamp = (d) => { const l = local(d); return `${l.date} ${l.time}`; };

// One resident's routine day: personal care, meals, drinks, maybe an activity,
// wellbeing, and their doses (nearly all given; the odd refusal, missed dose or gap).
// Times and outcomes are repeatable for a given resident and date, so the nightly
// reset and the daytime top-up produce the same entries.
// `back` is how many days ago it was: older weeks were a little less tidy (more gaps
// and late recording, the odd minor incident), so the analytics show an improvement.
// Returns [{ time, slot (dose time, for doses), by, fields }]
const OLD_INCIDENTS = [
	['fall', 'Found sitting on the floor in the lounge; said they lost their balance.', 'Checked for injuries: none. Physio referral made.'],
	['skin', 'Small bruise on the shin noticed during personal care.', 'Recorded on the body map. Checked daily.'],
	['behaviour', 'Became distressed in the evening and wanted to go home.', 'Reassured with a drink and music. Settled after 20 minutes.'],
	['injury', 'Knocked a hand on the door frame.', 'Cold compress applied. No swelling the next day.'],
];
function routineDay(i, date, meds, staff, ill, back = 0) {
	const older = Math.min(back, 56) / 56;
	const rand = seeded(dayNumber(date) * 131 + i * 97 + 7);
	const n = dayNumber(date);
	const pick = () => staff[Math.floor(rand() * staff.length)];
	const out = [];
	out.push({ time: '07:40', by: pick(), fields: { type: 'care', care: { tasks: ['wash', 'dress', 'oral_care', ...(n % 3 === i % 3 ? ['shower'] : []), ...(i % 4 === 3 ? ['continence'] : [])] } } });
	for (const [meal, time, ml] of [['breakfast', '08:30', 200], ['lunch', '12:30', 150], ['dinner', '17:30', 200]]) {
		const eaten = ill ? (rand() < 0.5 ? 'little' : 'half') : ['all', 'all', 'most', 'all', 'half'][Math.floor(rand() * 5)];
		out.push({ time, by: pick(), fields: { type: 'meal', meal: { meal, eaten, drink_ml: ml } } });
	}
	out.push({ time: '15:30', by: pick(), fields: { type: 'meal', meal: { meal: 'drink', drink_ml: ill ? 300 : 200 }, note: ill ? 'Encouraged extra fluids.' : '' } });
	if (rand() < 0.5) out.push({ time: '14:30', by: pick(), fields: { type: 'activity', activity: { name: ACTIVITIES[(i + n) % ACTIVITIES.length] } } });
	const offDay = back >= 7 && rand() < 0.012;
	out.push({ time: '19:30', by: pick(), fields: { type: 'wellbeing', wellbeing: { mood: ill || offDay ? 'low' : MOODS[(i * 3 + n) % MOODS.length], unwell: ill || offDay, ...(offDay ? { temperature: 38 + Math.round(rand() * 4) / 10 } : {}) }, ...(offDay ? { note: 'A bit under the weather; plenty of fluids and an early night.' } : {}) } });
	if (back >= 7 && rand() < 0.007) {
		const [kind, note, action] = OLD_INCIDENTS[Math.floor(rand() * OLD_INCIDENTS.length)];
		out.push({ time: '16:20', by: pick(), fields: { type: 'incident', note, incident: { kind, severity: 'minor', action, family_informed: true } } });
	}

	for (const m of meds) {
		if (m.as_needed || date < m.start_date || (m.end_date && date > m.end_date)) continue;
		for (const t of m.times) {
			const key = `${date} ${t}`;
			if (key < stamp(m.added_at) || (m.status === 'stopped' && m.stopped_at && key >= stamp(m.stopped_at))) continue;
			const by = pick();
			// usually recorded within half an hour; sometimes much later (more often in older weeks)
			const offset = rand() < 0.03 + 0.08 * older ? 65 + Math.floor(rand() * 60) : 5 + Math.floor(rand() * 20);
			if (rand() < 0.012 + 0.035 * older) continue; // left unrecorded
			const roll = rand();
			const outcome = roll < 0.04 ? 'refused' : roll < 0.05 ? 'missed' : 'given';
			const note = outcome === 'refused' ? 'Refused. Offered again 30 minutes later, still refused.' : outcome === 'missed' ? 'Out at a hospital appointment.' : '';
			out.push({ time: hhmm(minutes(t) + offset), slot: t, by, fields: { type: 'dose', note, dose: { medication: m._id, name: m.name, dose: m.dose, date, time: t, outcome } } });
		}
	}
	return out;
}

// Has it happened yet? Doses from the last 50 minutes are left for visitors to record
// (with the 15-minute top-up they show as "due", rarely "late").
function happened(x, date, today) {
	if (date < today.date) return true;
	const nowMin = minutes(today.time);
	return x.slot ? minutes(x.slot) <= nowMin - 50 : minutes(x.time) <= nowMin - 5;
}

const author = (u) => ({ id: u._id, name: `${u.first_name} ${u.last_name}`, role: u.role });
const careEntry = (resident, date, x) => {
	const at = instant(date, x.time);
	return { _id: new mongoose.Types.ObjectId(), resident: resident._id, at, created_at: new Date(at.getTime() + 2 * 60000), author: author(x.by), ...x.fields };
};

// Caregivers on the rota for a date (everyone active if there's no rota)
function onShiftFrom(rotas, caregivers) {
	const byEmail = Object.fromEntries(caregivers.map(c => [c.email, c]));
	return (date) => {
		const r = rotas.find(x => x.first <= date && date <= x.last);
		const day = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
		const people = (r?.rota[day] || []).map(p => byEmail[p.email]).filter(Boolean);
		return people.length ? people : caregivers;
	};
}
// Margaret (resident 0) had a chest infection 2-4 days before the last reset
const isIll = (i, date, resetDay) => i === 0 && date >= addDays(resetDay, -4) && date <= addDays(resetDay, -2);

// A week of care records written by the caregivers on each day's rota, medicine
// lists for every resident, and a GP visit for Margaret Okafor (the demo client)
async function seedCare(residents, caregivers, rotas, now) {
	const today = local(new Date(now));
	const onShift = onShiftFrom(rotas, caregivers);
	const entries = [];
	const meds = [];
	const add = (resident, date, time, by, fields) => {
		const x = { time, by, fields };
		if (!happened(x, date, today)) return null;
		const e = careEntry(resident, date, x);
		entries.push(e);
		return e;
	};
	const longAgo = addDays(today.date, -120);

	residents.forEach((r, i) => {
		for (const [name, dose, times, reason, instructions] of MEDICINES[i % MEDICINES.length]) {
			meds.push({
				_id: new mongoose.Types.ObjectId(), resident: r._id, name, dose, times: times || [], as_needed: !times,
				reason, instructions, start_date: longAgo, added_at: instant(longAgo, '09:00'), added_by: { name: 'Olivia Bennett' },
			});
		}
	});

	// Margaret: chest infection four days ago, GP visit three days ago, antibiotics since
	const margaret = residents[0];
	const visitDate = addDays(today.date, -3);
	const visitId = new mongoose.Types.ObjectId();
	const amoxicillin = {
		_id: new mongoose.Types.ObjectId(), resident: margaret._id, name: 'Amoxicillin', dose: '500 mg',
		times: ['08:00', '14:00', '20:00'], as_needed: false, reason: 'Chest infection', instructions: 'Finish the full course',
		start_date: visitDate, end_date: addDays(visitDate, 6), added_at: instant(visitDate, '11:20'), visit: visitId,
	};
	meds.push(amoxicillin);

	residents.forEach((r, i) => {
		const mine = meds.filter(m => String(m.resident) === String(r._id));
		for (let back = HISTORY_DAYS - 1; back >= 0; back--) {
			const date = addDays(today.date, -back);
			for (const x of routineDay(i, date, mine, onShift(date), isIll(i, date, today.date), back)) {
				if (happened(x, date, today)) entries.push(careEntry(r, date, x));
			}
		}
	});

	// Margaret's illness and GP visit
	const M = margaret;
	const nurse = (date) => onShift(date)[0];
	add(M, addDays(today.date, -4), '18:10', nurse(addDays(today.date, -4)), { type: 'wellbeing', wellbeing: { mood: 'low', temperature: 38.1, unwell: true }, note: 'Coughing and off her food. GP surgery called for a visit tomorrow.' });
	add(M, visitDate, '08:15', nurse(visitDate), { type: 'wellbeing', wellbeing: { temperature: 38.3, unwell: true }, note: 'Temperature still raised this morning.' });
	const conditions = medical[0].others;
	const month = new Date(visitDate + 'T12:00:00Z').toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
	const newConditions = `${conditions}; chest infection (${month}, on antibiotics)`;
	entries.push({
		_id: visitId, resident: M._id, type: 'visit', at: instant(visitDate, '11:00'), created_at: instant(visitDate, '11:20'),
		author: author(nurse(visitDate)),
		note: 'Daughter informed by phone.',
		visit: {
			professional: 'Dr Amara Patel, GP',
			reason: 'Cough and a raised temperature since yesterday',
			outcome: 'Chest infection. Start a 7-day course of amoxicillin, encourage fluids, and check her temperature twice a day.',
			follow_up: 'Review in 7 days, or sooner if her breathing gets worse.',
			started: [{ id: amoxicillin._id, name: amoxicillin.name, dose: amoxicillin.dose, reason: amoxicillin.reason }],
			stopped: [],
			changes: [{ field: 'conditions', from: conditions, to: newConditions }],
		},
	});
	add(M, addDays(today.date, -2), '08:20', nurse(addDays(today.date, -2)), { type: 'wellbeing', wellbeing: { temperature: 37.6, unwell: true }, note: 'Cough a little better.' });
	add(M, addDays(today.date, -1), '08:20', nurse(addDays(today.date, -1)), { type: 'wellbeing', wellbeing: { mood: 'settled', temperature: 37.2 } });
	add(M, today.date, '08:10', nurse(today.date), { type: 'wellbeing', wellbeing: { mood: 'content', temperature: 36.9 }, note: 'Ate all her breakfast.' });
	add(M, addDays(today.date, -1), '16:00', nurse(addDays(today.date, -1)), { type: 'note', note: 'Her daughter visited this afternoon. They looked through old photos together.' });
	await Users.updateOne({ _id: M._id }, { 'Medical.others': newConditions });

	// A minor fall, a skin tear, an "as needed" painkiller, and one corrected entry
	const harold = residents[3];
	add(harold, addDays(today.date, -2), '06:40', nurse(addDays(today.date, -2)), {
		type: 'incident', note: 'Found sitting on the floor beside his bed. Said he slipped while getting up for the toilet.',
		incident: { kind: 'fall', severity: 'minor', action: 'Checked for injuries with two staff: none found. Helped up with the hoist. Hourly checks for 24 hours. Bed lowered and sensor mat added.', family_informed: true },
	});
	const agnes = residents[2];
	add(agnes, addDays(today.date, -5), '10:15', nurse(addDays(today.date, -5)), {
		type: 'incident', note: 'Small skin tear on the left forearm from the arm of her chair.',
		incident: { kind: 'skin', severity: 'minor', action: 'Cleaned and dressed. Chair arm padded. Dressing checked daily.', family_informed: true },
	});
	const edward = residents[1];
	const paracetamol = meds.find(m => String(m.resident) === String(edward._id) && m.as_needed);
	add(edward, addDays(today.date, -2), '14:10', nurse(addDays(today.date, -2)), { type: 'dose', note: 'Knee pain after his walk in the garden.', dose: { medication: paracetamol._id, name: paracetamol.name, dose: paracetamol.dose, date: addDays(today.date, -2), time: '', outcome: 'given' } });
	const wrong = add(edward, addDays(today.date, -1), '12:31', nurse(addDays(today.date, -1)), { type: 'meal', meal: { meal: 'lunch', eaten: 'all', drink_ml: 150 } });
	if (wrong) {
		entries.push({
			resident: edward._id, type: 'meal', at: wrong.at, created_at: new Date(wrong.at.getTime() + 40 * 60000),
			author: wrong.author, corrects: wrong._id, note: 'Corrected: recorded the wrong resident\'s plate. Edward ate about half.',
			meal: { meal: 'lunch', eaten: 'half', drink_ml: 150 },
		});
	}

	await Medications.insertMany(meds);
	await CareEntries.insertMany(entries);
	return { medicines: meds.length, entries: entries.length };
}

// Most recent RESET_HOUR_UTC boundary at or before `now`
function lastBoundary(now = new Date()) {
	const b = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC));
	if (b > now) b.setUTCDate(b.getUTCDate() - 1);
	return b;
}

async function resetIfDue() {
	try {
		const meta = await Meta.findOne({ key: 'demo_last_reset' });
		const version = await Meta.findOne({ key: 'demo_seed_version' });
		const stale = !meta || new Date(meta.value) < lastBoundary();
		if (stale || version?.value !== SEED_VERSION) await resetDemoData();
	} catch (err) {
		console.error('Demo reset failed', err);
	}
}

// Through the day the sample staff keep recording routine care and doses, so the
// demo doesn't fill up with late doses. Anything already recorded (by the reset or a
// visitor) is skipped, and the last 50 minutes of doses are left for visitors.
// Returns how many entries were added.
async function topUp(now = new Date()) {
	try {
		const reset = await Meta.findOne({ key: 'demo_last_reset' });
		if (!reset) return 0;
		const today = local(now);
		const residents = await Users.find({ role: 'client', status: { $ne: 'in-active' } });
		const caregivers = await Users.find({ role: 'caregiver', status: 'active' });
		const rota = await Schedule.findOne({ start_date: { $lte: today.date }, end_date: { $gte: today.date } }).lean();
		const onShift = onShiftFrom(rota ? [{ first: rota.start_date, last: rota.end_date, rota: rota.schedule }] : [], caregivers);
		const ids = residents.map(r => r._id);
		const meds = await Medications.find({ resident: { $in: ids } }).lean();
		const existing = await CareEntries.find({ resident: { $in: ids }, at: { $gte: instant(today.date) } }).select('resident type at dose').lean();
		const doseDone = new Set(existing.filter(e => e.type === 'dose' && e.dose?.date === today.date).map(e => `${e.dose.medication}|${e.dose.time}`));
		const atDone = new Set(existing.map(e => `${e.resident}|${e.type}|${new Date(e.at).getTime()}`));
		const resetDay = local(reset.value).date;
		const fresh = [];
		for (const r of residents) {
			const i = clients.findIndex(c => c[2] === r.email);
			if (i < 0) continue;
			const mine = meds.filter(m => String(m.resident) === String(r._id));
			for (const x of routineDay(i, today.date, mine, onShift(today.date), isIll(i, today.date, resetDay))) {
				if (!happened(x, today.date, today)) continue;
				const done = x.slot ? doseDone.has(`${x.fields.dose.medication}|${x.slot}`) : atDone.has(`${r._id}|${x.fields.type}|${instant(today.date, x.time).getTime()}`);
				if (!done) fresh.push(careEntry(r, today.date, x));
			}
		}
		if (fresh.length) await CareEntries.insertMany(fresh);
		return fresh.length;
	} catch (err) {
		console.error('Demo top-up failed', err);
		return 0;
	}
}

// Free hosting sleeps when idle, so check on startup as well as every 15 minutes
function start(mongoose) {
	if (!enabled()) return;
	const tick = async () => {
		await resetIfDue();
		await topUp();
	};
	mongoose.connection.once('open', tick);
	setInterval(tick, 15 * 60 * 1000).unref();
}

module.exports = { enabled, ACCOUNTS, SIGN_IN_ROLES, isDemoAccount, resetDemoData, topUp, start };
