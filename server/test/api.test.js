// API integration tests: starts the real server against a throwaway in-memory MongoDB.
// Run with `npm test` from server/.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

const path = require('path');
const SERVER_DIR = path.join(__dirname, '..');
const PORT = Number(process.env.TEST_PORT) || 5099;
const BASE = `http://localhost:${PORT}`;
let failures = 0;

function check(name, cond, extra = '') {
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
	if (!cond) failures++;
}

async function call(method, path, { token, body } = {}) {
	const res = await fetch(BASE + path, {
		method,
		headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
		body: body ? JSON.stringify(body) : undefined,
	});
	let data = null;
	try { data = await res.json(); } catch (e) { }
	return { status: res.status, data };
}

const person = (email, role) => ({
	email, role, first_name: 'Test', last_name: email.split('@')[0], dob: '1950-01-01',
	address: '1 Street', phone: '000', password: 'pass1234',
});

(async () => {
	const mongo = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
	const env = {
		...process.env, LocalPort: String(PORT), mongoURL: mongo.getUri() + 'ecms',
		jwtSecret: 'test-secret', ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'adminpass',
	};
	const server = spawn('node', ['index.js'], { cwd: SERVER_DIR, env });
	let log = '';
	server.stdout.on('data', d => log += d);
	server.stderr.on('data', d => log += d);
	let exited = false;
	server.on('exit', () => { exited = true; });

	for (let i = 0; i < 50 && !log.includes('Admin account created'); i++) await new Promise(r => setTimeout(r, 200));
	check('server starts and creates the first admin', log.includes('Admin account created'));

	// Login
	const adminLogin = await call('POST', '/api/auth', { body: { email: 'admin@test.com', password: 'adminpass' } });
	check('admin can log in', adminLogin.data?.auth === true);
	const admin = adminLogin.data?.token;
	const badLogin = await call('POST', '/api/auth', { body: { email: 'admin@test.com', password: 'wrong' } });
	check('wrong password rejected', badLogin.status === 401);

	// Account creation is admin-only
	const anonAdmin = await call('POST', '/api/user/add_user', { body: person('hacker@test.com', 'admin') });
	const hackerLogin = await call('POST', '/api/auth', { body: { email: 'hacker@test.com', password: 'pass1234' } });
	check('anonymous user cannot create an admin account', anonAdmin.data?.status !== true && hackerLogin.status === 401);

	const addClient = await call('POST', '/api/user/add_user', { token: admin, body: person('client@test.com', 'client') });
	check('admin can create a client', addClient.data?.status === true);
	check('created-user response does not leak the password hash', addClient.data?.data && !('password' in addClient.data.data));
	const dup = await call('POST', '/api/user/add_user', { token: admin, body: person('client@test.com', 'client') });
	check('duplicate email rejected', dup.status === 400);
	await call('POST', '/api/user/add_user', { token: admin, body: person('other@test.com', 'client') });

	const client = (await call('POST', '/api/auth', { body: { email: 'client@test.com', password: 'pass1234' } })).data?.token;
	check('client can log in', !!client);

	// Role checks
	check('client cannot list all users', (await call('GET', '/api/user/show_all_users', { token: client })).status === 403);
	check('client cannot list users by role', (await call('GET', '/api/user/show_users/client', { token: client })).status === 403);
	const clientId = (await call('GET', '/api/auth/user', { token: client })).data?._id;
	const promote = await call('PATCH', `/api/user/update_user/${clientId}`, { token: client, body: { role: 'admin' } });
	check('client cannot make themselves admin', promote.status === 403);
	check('client cannot create users', (await call('POST', '/api/user/add_user', { token: client, body: person('x@test.com', 'admin') })).status === 403);
	check('client cannot create invoices', (await call('POST', '/api/invoice/add_invoice', { token: client, body: { email: 'client@test.com', amount: 1 } })).status === 403);
	check('client can read own profile by email', (await call('GET', '/api/user/show_user_by_email/client@test.com', { token: client })).data?.status === true);
	check('client cannot read another user by email', (await call('GET', '/api/user/show_user_by_email/other@test.com', { token: client })).status === 403);
	check('client cannot read another user\'s invoices', (await call('GET', '/api/invoice/show_invoice/other@test.com', { token: client })).status === 403);
	check('client can see schedules', (await call('GET', '/api/schedule/show_all_schedules', { token: client })).data?.status === true);

	// Admin flows
	await call('PATCH', `/api/user/update_user/${clientId}`, { token: admin, body: { Contracts: [{ start_date: '2026-01-01', end_date: '2027-01-01' }] } });
	const inv = await call('POST', '/api/invoice/add_invoice', { token: admin, body: { email: 'client@test.com', amount: 300, type: 'care', description: 'October' } });
	check('admin can create an invoice', inv.data?.status === true, JSON.stringify(inv.data?.reason || ''));
	const counts = await call('GET', '/api/user/get_counts/client@test.com', { token: client });
	check('client dashboard counts its contract (was always 0)', counts.data?.data?.contracts === 1, JSON.stringify(counts.data));
	check('client dashboard counts its invoice', counts.data?.data?.invoices === 1);
	check('admin sees all invoices', (await call('GET', '/api/invoice/show_invoices', { token: admin })).data?.count === 1);

	// Former crash paths
	const missing = await call('PATCH', '/api/user/update_user/000000000000000000000000', { token: admin, body: { phone: '1' } });
	check('updating a missing user returns 400', missing.status === 400);
	const missingInv = await call('PATCH', '/api/invoice/update_invoice', { token: admin, body: { _id: '000000000000000000000000', amount: 1 } });
	check('updating a missing invoice returns 400', missingInv.status === 400);

	// Schedules
	check('anonymous user cannot generate schedules', (await call('POST', '/api/schedule/add_schedule', { body: { first: '2026-10-12', last: '2026-10-18', week: '42' } })).data?.status !== true);
	const none = await call('POST', '/api/schedule/add_schedule', { token: admin, body: { first: '2026-10-12', last: '2026-10-18', week: '42' } });
	check('rota with no active caregivers explains why', none.status === 400 && /at least one active caregiver/.test(none.data?.msg));
	for (let i = 0; i < 7; i++) await call('POST', '/api/user/add_user', { token: admin, body: person(`cg${i}@test.com`, 'caregiver') });
	const s1 = await call('POST', '/api/schedule/add_schedule', { token: admin, body: { first: '2026-10-12', last: '2026-10-18', week: '42' } });
	const s2 = await call('POST', '/api/schedule/add_schedule', { token: admin, body: { first: '2026-10-12', last: '2026-10-18', week: '42' } });
	const all = await call('GET', '/api/schedule/show_all_schedules', { token: admin });
	check('admin can generate a schedule', s1.data?.status === true);
	check('regenerating the same week updates it instead of failing silently', s2.data?.status === true && s2.data?.data?._id === s1.data?.data?._id && all.data?.count === 1);

	// Search and totals
	for (let i = 0; i < 12; i++) await call('POST', '/api/user/add_user', { token: admin, body: person(`resident${i}@test.com`, 'client') });
	const page1 = await call('GET', '/api/user/show_users/client?current=1', { token: admin });
	const page2 = await call('GET', '/api/user/show_users/client?current=2', { token: admin });
	check('client list total counts every client, not just one page', page1.data?.count === 14, String(page1.data?.count));
	check('page 1 has 10 rows, page 2 has the rest', page1.data?.data?.length === 10 && page2.data?.data?.length === 4);
	const found = await call('GET', '/api/user/show_users/client?current=1&search=RESIDENT1', { token: admin });
	check('search matches name/email case-insensitively', found.data?.count === 3, String(found.data?.count));
	const literal = await call('GET', '/api/user/show_users/client?search=' + encodeURIComponent('.*'), { token: admin });
	check('search text is literal, not a regex', literal.data?.count === 0, String(literal.data?.count));
	const invSearch = await call('GET', '/api/invoice/show_invoices?search=octo', { token: admin });
	check('invoice search matches description', invSearch.data?.count === 1);

	// Sorting covers the whole list, not just one page
	const asc = await call('GET', '/api/user/show_users/client?current=1&sort=name&order=asc', { token: admin });
	const desc = await call('GET', '/api/user/show_users/client?current=1&sort=name&order=desc', { token: admin });
	const lastPage = await call('GET', '/api/user/show_users/client?current=2&sort=name&order=asc', { token: admin });
	const allNames = (await call('GET', '/api/user/show_users/client', { token: admin })).data.data.map(u => (u.first_name + ' ' + u.last_name).toLowerCase()).sort();
	const firstOf = r => (r.data.data[0].first_name + ' ' + r.data.data[0].last_name).toLowerCase();
	check('sort by name ascending starts with the alphabetically first of ALL clients', firstOf(asc) === allNames[0], firstOf(asc));
	check('sort by name descending starts with the alphabetically last', firstOf(desc) === allNames[allNames.length - 1], firstOf(desc));
	const lastOfP2 = lastPage.data.data[lastPage.data.data.length - 1];
	check('page 2 continues the sorted order', (lastOfP2.first_name + ' ' + lastOfP2.last_name).toLowerCase() === allNames[allNames.length - 1]);
	const bogus = await call('GET', '/api/user/show_users/client?sort=password&order=asc', { token: admin });
	check('unknown sort key is ignored (no sorting on arbitrary fields)', bogus.data?.status === true && bogus.data.data[0].first_name === asc.data.data[0].first_name);
	await call('POST', '/api/invoice/add_invoice', { token: admin, body: { email: 'client@test.com', amount: 50, description: 'Small' } });
	await call('POST', '/api/invoice/add_invoice', { token: admin, body: { email: 'client@test.com', amount: 9000, description: 'Large' } });
	const byAmount = await call('GET', '/api/invoice/show_invoices?sort=amount&order=desc', { token: admin });
	check('invoices sort by amount numerically', byAmount.data.data[0].amount === 9000 && byAmount.data.data[byAmount.data.data.length - 1].amount === 50);

	// Deactivation
	const cg0 = (await call('GET', '/api/user/show_user_by_email/cg0@test.com', { token: admin })).data.data;
	const cgToken = (await call('POST', '/api/auth', { body: { email: 'cg0@test.com', password: 'pass1234' } })).data.token;
	check('caregiver cannot deactivate anyone', (await call('PATCH', `/api/user/set_status/${clientId}`, { token: cgToken, body: { status: 'in-active' } })).status === 403);
	check('invalid status is rejected', (await call('PATCH', `/api/user/set_status/${cg0._id}`, { token: admin, body: { status: 'deleted' } })).status === 400);
	const adminId = (await call('GET', '/api/auth/user', { token: admin })).data._id;
	check('admin cannot deactivate themselves', (await call('PATCH', `/api/user/set_status/${adminId}`, { token: admin, body: { status: 'in-active' } })).status === 400);
	const off = await call('PATCH', `/api/user/set_status/${cg0._id}`, { token: admin, body: { status: 'in-active' } });
	check('admin can deactivate a caregiver', off.data?.status === true && off.data.data.status === 'in-active');
	const blocked = await call('POST', '/api/auth', { body: { email: 'cg0@test.com', password: 'pass1234' } });
	check('deactivated account cannot sign in', blocked.status === 403 && /deactivated/.test(blocked.data?.msg));
	check('deactivated account loses access with an existing token', (await call('GET', '/api/auth/user', { token: cgToken })).status === 403);
	check('deactivated account cannot read its own data', (await call('GET', '/api/user/get_counts/cg0@test.com', { token: cgToken })).status === 403);
	check('records are kept when deactivated', (await call('GET', '/api/user/show_user_by_email/cg0@test.com', { token: admin })).data?.data?.email === 'cg0@test.com');

	// Rota: every active caregiver, fair shares, nobody twice a day
	const r6 = await call('POST', '/api/schedule/add_schedule', { token: admin, body: { first: '2026-10-19', last: '2026-10-25', week: '43', per_day: 4 } });
	const days = Object.values(r6.data?.data?.schedule || {});
	const perPerson = {};
	days.flat().forEach(s => { perPerson[s.email] = (perPerson[s.email] || 0) + 1; });
	const shares = Object.values(perPerson);
	check('rota uses every active caregiver and skips deactivated ones', Object.keys(perPerson).length === 6 && !perPerson['cg0@test.com'], Object.keys(perPerson).length + ' people');
	check('rota respects caregivers per day', days.length === 7 && days.every(d => d.length === 4));
	check('rota shares differ by at most one shift', Math.max(...shares) - Math.min(...shares) <= 1, shares.join(','));
	check('nobody is on the same day twice', days.every(d => new Set(d.map(s => s.email)).size === d.length));
	const capped = await call('POST', '/api/schedule/add_schedule', { token: admin, body: { first: '2026-10-26', last: '2026-11-01', week: '44', per_day: 50 } });
	check('per-day count is capped at the number of active caregivers', capped.data?.perDay === 6);
	await call('PATCH', `/api/user/set_status/${cg0._id}`, { token: admin, body: { status: 'active' } });
	check('reactivated account can sign in again', (await call('POST', '/api/auth', { body: { email: 'cg0@test.com', password: 'pass1234' } })).data?.auth === true);

	// Errors never leak internals
	const bad = await call('PATCH', '/api/user/update_user/not-an-id', { token: admin, body: { phone: '1' } });
	check('server errors return a generic message', bad.status >= 400 && !/Cast|ObjectId|mongo/i.test(JSON.stringify(bad.data)), JSON.stringify(bad.data));
	check('security headers are set', await fetch(BASE + '/api/user/loggedIn').then(r => r.headers.get('x-content-type-options') === 'nosniff'));
	check('wrong email and wrong password give the same message', (await call('POST', '/api/auth', { body: { email: 'nobody@test.com', password: 'x' } })).data?.msg === (await call('POST', '/api/auth', { body: { email: 'admin@test.com', password: 'x' } })).data?.msg);

	// Rate limiting last: it blocks further sign-ins from this IP
	let limited = false;
	for (let i = 0; i < 30 && !limited; i++) limited = (await call('POST', '/api/auth', { body: { email: 'admin@test.com', password: 'wrong' } })).status === 429;
	check('repeated sign-in attempts are rate limited', limited);

	check('server is still running after all of the above', !exited);
	if (exited || failures) console.log('--- server log ---\n' + log);

	server.kill();
	await mongo.stop();
	console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
	process.exit(failures ? 1 : 0);
})();
