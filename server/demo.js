// Demo mode (DEMO_MODE=true): the database holds sample data that anyone can try
// through one-click demo logins, and it is wiped and re-seeded every night.
// Never enable this on a database with real care records.
const bcrypt = require('bcryptjs');
const Users = require('./models/User');
const Invoices = require('./models/Invoice');
const Schedule = require('./models/Schedule');
const Meta = require('./models/Meta');
const { buildRota, weekOf } = require('./utils/rota');

const enabled = () => process.env.DEMO_MODE === 'true';

// The accounts behind the "Try as …" buttons; they also accept DEMO_PASSWORD
const ACCOUNTS = {
	admin: 'admin@example.com',
	caregiver: 'caregiver@example.com',
	client: 'client@example.com',
};
const isDemoAccount = (user) => !!user && Object.values(ACCOUNTS).includes(user.email);

const RESET_HOUR_UTC = 3;
// Bump when the sample data changes, so the next deploy re-seeds straight away
const SEED_VERSION = 2;
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

// [first, last, email, contract: 'valid' | 'expired' | 'none', monthly amount]
const clients = [
	['Margaret', 'Okafor', ACCOUNTS.client, 'valid', 2400],
	['Edward', 'Lindqvist', 'edward.lindqvist@example.com', 'valid', 2150],
	['Agnes', 'Mensah', 'agnes.mensah@example.com', 'valid', 2850],
	['Harold', 'Brennan', 'harold.brennan@example.com', 'expired', 1950],
	['Winifred', 'Shaw', 'winifred.shaw@example.com', 'valid', 3100],
	['Arthur', 'Kowalski', 'arthur.kowalski@example.com', 'valid', 2600],
	['Beatrice', 'Eze', 'beatrice.eze@example.com', 'none', 0],
	['Leonard', 'Fitzgerald', 'leonard.fitzgerald@example.com', 'valid', 2250],
	['Dorothy', 'Hughes', 'dorothy.hughes@example.com', 'expired', 2700],
	['Samuel', 'Achebe', 'samuel.achebe@example.com', 'valid', 1850],
	['Irene', 'Novak', 'irene.novak@example.com', 'none', 0],
	['Walter', 'Grant', 'walter.grant@example.com', 'valid', 3200],
];

const medical = [
	{ blood_group: 'O+', genotype: 'AA', allergy: 'Penicillin', others: 'Type 2 diabetes; needs help with insulin timing' },
	{ blood_group: 'A-', genotype: 'AS', allergy: 'None known', others: 'Mild hearing loss; uses a walking frame' },
	{ blood_group: 'B+', genotype: 'AA', allergy: 'Shellfish', others: 'High blood pressure; low-salt diet' },
	{ blood_group: 'AB+', genotype: 'AA', allergy: 'Latex', others: 'Early-stage dementia; prefers morning visits' },
];
const relatives = ['Daughter', 'Son', 'Niece', 'Spouse', 'Grandson'];

const ymd = (d) => d.toISOString().slice(0, 10);
const monthName = (d) => d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function contractFor(kind, now) {
	if (kind === 'none') return [];
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

	await Promise.all([Users.deleteMany({}), Invoices.deleteMany({}), Schedule.deleteMany({})]);

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

	// Three monthly invoices for every client who has (or had) a contract: earlier
	// months paid, this month unpaid; clients with an expired contract still owe last month
	const invoices = [];
	clients.forEach(([, , email, kind, amount]) => {
		if (kind === 'none') return;
		for (let back = 2; back >= 0; back--) {
			const d = new Date(now);
			const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1, 9));
			const due = new Date(month.getTime() + 14 * DAY);
			const paid = back === 2 || (back === 1 && kind !== 'expired');
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
	for (const when of [new Date(now - 7 * DAY), new Date(now)]) {
		const { first, last, week } = weekOf(when);
		const { rota } = buildRota(active, 4);
		await new Schedule({ start_date: first, end_date: last, week, schedule: rota }).save();
	}

	await Meta.findOneAndUpdate({ key: 'demo_last_reset' }, { value: new Date(now) }, { upsert: true });
	await Meta.findOneAndUpdate({ key: 'demo_seed_version' }, { value: SEED_VERSION }, { upsert: true });
	console.log(`Demo data reset: ${created.length} people, ${invoices.length} invoices, 2 rotas`);
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
