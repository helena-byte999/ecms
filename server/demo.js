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
	client: 'client@example.com',
	family: 'family@example.com', // Margaret Okafor's daughter
};
const isDemoAccount = (user) => !!user && Object.values(ACCOUNTS).includes(user.email);

const RESET_HOUR_UTC = 3;
// Bump when the sample data changes, so the next deploy re-seeds straight away
const SEED_VERSION = 4;
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
	{ blood_group: 'O+', genotype: 'AA', allergy: 'Penicillin', others: 'Type 2 diabetes; needs reminders at mealtimes' },
	{ blood_group: 'A-', genotype: 'AS', allergy: 'None known', others: 'Mild hearing loss; uses a walking frame' },
	{ blood_group: 'B+', genotype: 'AA', allergy: 'Shellfish', others: 'High blood pressure; low-salt diet' },
	{ blood_group: 'AB+', genotype: 'AA', allergy: 'Latex', others: 'Early-stage dementia; prefers morning visits' },
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

// A week of care records written by the caregivers on each day's rota, medicine
// lists for every resident, and a GP visit for Margaret Okafor (the demo client)
async function seedCare(residents, caregivers, rotas, now) {
	const today = local(new Date(now));
	const nowMin = minutes(today.time);
	const byEmail = Object.fromEntries(caregivers.map(c => [c.email, c]));
	const onShift = (date) => {
		const r = rotas.find(x => x.first <= date && date <= x.last);
		const day = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
		const people = (r?.rota[day] || []).map(p => byEmail[p.email]).filter(Boolean);
		return people.length ? people : caregivers;
	};
	const author = (u) => ({ id: u._id, name: `${u.first_name} ${u.last_name}`, role: u.role });
	const entries = [];
	const meds = [];
	const add = (resident, date, time, by, fields) => {
		if (date === today.date && minutes(time) > nowMin - 5) return null; // not yet happened
		const e = { _id: new mongoose.Types.ObjectId(), resident: resident._id, at: instant(date, time), author: author(by), ...fields };
		e.created_at = new Date(e.at.getTime() + 2 * 60000);
		entries.push(e);
		return e;
	};
	const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
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
		const rand = seeded(1000 + i * 97);
		const mine = meds.filter(m => String(m.resident) === String(r._id));
		const ill = (date) => r === margaret && date >= addDays(today.date, -4) && date <= addDays(today.date, -2);
		for (let back = 6; back >= 0; back--) {
			const date = addDays(today.date, -back);
			const staff = onShift(date);
			const pick = () => staff[Math.floor(rand() * staff.length)];

			add(r, date, '07:40', pick(), { type: 'care', care: { tasks: ['wash', 'dress', 'oral_care', ...(back % 3 === i % 3 ? ['shower'] : []), ...(i % 4 === 3 ? ['continence'] : [])] } });
			for (const [meal, time, ml] of [['breakfast', '08:30', 200], ['lunch', '12:30', 150], ['dinner', '17:30', 200]]) {
				const eaten = ill(date) ? (rand() < 0.5 ? 'little' : 'half') : ['all', 'all', 'most', 'all', 'half'][Math.floor(rand() * 5)];
				add(r, date, time, pick(), { type: 'meal', meal: { meal, eaten, drink_ml: ml } });
			}
			add(r, date, '15:30', pick(), { type: 'meal', meal: { meal: 'drink', drink_ml: ill(date) ? 300 : 200 }, note: ill(date) ? 'Encouraged extra fluids.' : '' });
			if (rand() < 0.5) add(r, date, '14:30', pick(), { type: 'activity', activity: { name: ACTIVITIES[(i + back) % ACTIVITIES.length] } });
			add(r, date, '19:30', pick(), { type: 'wellbeing', wellbeing: { mood: ill(date) ? 'low' : MOODS[(i * 3 + back) % MOODS.length], unwell: ill(date) } });

			// doses: nearly all given; the odd refusal, a missed dose, and a few left unrecorded
			for (const m of mine) {
				if (m.as_needed || date < m.start_date || (m.end_date && date > m.end_date)) continue;
				for (const t of m.times) {
					if (`${date} ${t}` < `${local(m.added_at).date} ${local(m.added_at).time}`) continue;
					const late = date === today.date && minutes(t) > nowMin - 90; // leave the last hour or so for the round
					if (late || rand() < 0.015) continue;
					const roll = rand();
					const outcome = roll < 0.04 ? 'refused' : roll < 0.05 ? 'missed' : 'given';
					const note = outcome === 'refused' ? 'Refused. Offered again 30 minutes later, still refused.' : outcome === 'missed' ? 'Out at a hospital appointment.' : '';
					add(r, date, hhmm(minutes(t) + 5 + Math.floor(rand() * 20)), pick(), { type: 'dose', note, dose: { medication: m._id, name: m.name, dose: m.dose, date, time: t, outcome } });
				}
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

// Free hosting sleeps when idle, so check on startup as well as every 15 minutes
function start(mongoose) {
	if (!enabled()) return;
	mongoose.connection.once('open', resetIfDue);
	setInterval(resetIfDue, 15 * 60 * 1000).unref();
}

module.exports = { enabled, ACCOUNTS, isDemoAccount, resetDemoData, start };
