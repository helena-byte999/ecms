// Demo-mode tests: sample data, one-click demo logins, protected demo accounts, nightly reset.
// Run with `npm test` from server/.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..');
const PORT = Number(process.env.TEST_PORT_DEMO) || 5098;
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

function startServer(uri) {
	const server = spawn('node', ['index.js'], {
		cwd: SERVER_DIR,
		env: { ...process.env, LocalPort: String(PORT), mongoURL: uri, jwtSecret: 'test-secret', DEMO_MODE: 'true', DEMO_PASSWORD: 'demo-pass' },
	});
	server.log = '';
	server.stdout.on('data', d => server.log += d);
	server.stderr.on('data', d => server.log += d);
	return server;
}

async function waitFor(server, text, ms = 15000) {
	for (let t = 0; t < ms && !server.log.includes(text); t += 200) await new Promise(r => setTimeout(r, 200));
	return server.log.includes(text);
}

(async () => {
	const mongo = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
	const uri = mongo.getUri() + 'ecms';
	let server = startServer(uri);
	check('demo data is seeded on startup', await waitFor(server, 'Demo data reset'));

	const login = async role => (await call('POST', '/api/auth/demo', { body: { role } })).data;
	const admin = await login('admin');
	const caregiver = await login('caregiver');
	const client = await login('client');
	check('one-click demo sign-in works for all three roles', admin?.role === 'admin' && caregiver?.role === 'caregiver' && client?.role === 'client');
	check('unknown demo role is rejected', (await call('POST', '/api/auth/demo', { body: { role: 'superuser' } })).status === 400);

	const clients = await call('GET', '/api/user/show_users/client', { token: admin.token });
	const carers = await call('GET', '/api/user/show_users/caregiver', { token: admin.token });
	check('sample clients and caregivers exist', clients.data?.count === 12 && carers.data?.count === 8, `${clients.data?.count} clients, ${carers.data?.count} caregivers`);
	const statuses = new Set(carers.data.data.map(c => c.status));
	check('sample data shows active, on-leave and deactivated staff', statuses.has('active') && statuses.has('on-leave') && statuses.has('in-active'));
	const contracts = (await call('GET', '/api/user/show_all_contracts', { token: admin.token })).data;
	check('sample contracts include valid, expired and none', contracts.valid.length > 0 && contracts.expired.length > 0 && contracts.noContracts.filter(u => u.role !== 'admin').length > 0);
	const myInvoices = await call('GET', '/api/invoice/show_invoice/client@example.com', { token: client.token });
	check('demo client has their own invoices', myInvoices.data?.count === 6);
	const rotas = await call('GET', '/api/schedule/show_all_schedules', { token: caregiver.token });
	check('this week and last week have rotas', rotas.data?.count === 2);
	const onRota = Object.values(rotas.data.data[0].schedule).flat().map(s => s.email);
	check('rotas only use active caregivers', !onRota.includes('kwame.mensah@example.com') && !onRota.includes('hannah.price@example.com'));

	const allInv = (await call('GET', '/api/invoice/show_invoices', { token: admin.token })).data.data;
	const today = new Date().toISOString().slice(0, 10);
	check('sample invoices include paid, unpaid and overdue', allInv.some(i => i.status === 'paid') && allInv.some(i => i.status === 'unpaid' && i.due_date >= today) && allInv.some(i => i.status === 'unpaid' && i.due_date < today));
	check('demo accounts cannot change their password', (await call('POST', '/api/auth/change_password', { token: client.token, body: { current_password: 'demo-pass', new_password: 'something-new' } })).status === 403);
	const figs = (await call('GET', '/api/user/get_counts', { token: admin.token })).data?.data;
	check('dashboard figures add up', figs && figs.clients === 12 && figs.caregivers === 8 && figs.caregiversActive === 6 && figs.caregiversOnLeave === 1 && figs.contractsValid === figs.caregivers + 8 && figs.clientsWithoutContract === 4 && figs.unpaid === figs.overdue + 10 && figs.contractsExpiringSoon === 2 && figs.outstanding > 0, JSON.stringify(figs));
	const summary = (await call('GET', '/api/invoice/summary?months=6', { token: admin.token })).data?.data;
	const thisMonth = summary?.[summary.length - 1];
	check('chart data: 6 months, this month invoiced but unpaid', summary?.length === 6 && thisMonth.invoiced > 0 && thisMonth.paid === 0 && summary[3].paid > 0, JSON.stringify(summary));
	check('chart data is admin-only', (await call('GET', '/api/invoice/summary', { token: client.token })).status === 403);
	const mine = (await call('GET', '/api/user/get_counts/client@example.com', { token: client.token })).data?.data;
	check('client dashboard: contract state and amount to pay', mine?.contract?.state === 'valid' && mine.outstanding === 2400 && mine.unpaid === 1, JSON.stringify(mine));
	// Care records and family access
	const family = await login('family');
	const me = (await call('GET', '/api/auth/user', { token: family.token })).data;
	check('one-click family sign-in is linked to Margaret Okafor', family?.role === 'family' && me.resident?.email === 'client@example.com');
	const margaretId = (await call('GET', '/api/user/show_user_by_email/client@example.com', { token: family.token })).data?.data?._id;
	const careLog = (await call('GET', `/api/care/${margaretId}/entries`, { token: family.token })).data?.data || [];
	const visit = careLog.find(e => e.type === 'visit');
	check("Margaret's care log has a GP visit that started antibiotics", visit?.visit?.started?.[0]?.name === 'Amoxicillin' && careLog.length > 40, `${careLog.length} entries`);
	const margaretMeds = (await call('GET', `/api/care/${margaretId}/medications`, { token: family.token })).data;
	check('...and the antibiotics are on her medicine list', margaretMeds.active.some(m => m.name === 'Amoxicillin' && m.end_date));
	const careReport = (await call('GET', '/api/care/report', { token: admin.token })).data?.data;
	check('care report: every resident, mostly given, a few refused, an incident or two', careReport?.residents.length === 12 && careReport.totals.completion >= 85 && careReport.totals.refused > 0 && careReport.incidents.length >= 2, JSON.stringify(careReport?.totals));
	check('care report: entries come from caregivers on the rota', careReport.caregivers.length >= 3 && careReport.caregivers.every(c => c.role === 'caregiver'));
	check('a corrected entry is in the sample data', (await call('GET', `/api/care/${careReport.residents.find(r => r.name === 'Edward Lindqvist')._id}/entries?type=meal`, { token: admin.token })).data.data.some(e => e.corrected_by));
	// The daytime top-up refills routine care that has happened, exactly once
	await mongoose.connect(uri);
	const { topUp } = require('../demo');
	const { local: localTime, instant } = require('../utils/time');
	const removed = await mongoose.connection.db.collection('careentries').deleteMany({ type: 'meal', at: { $gte: instant(localTime().date) }, corrects: { $exists: false } });
	const added = await topUp();
	const again = await topUp();
	check('daytime top-up refills routine care exactly once', added === removed.deletedCount && again === 0, `${removed.deletedCount} removed, ${added} added, then ${again}`);
	await mongoose.disconnect();
	check('family can read the care summary', (await call('GET', `/api/care/${margaretId}/summary`, { token: family.token })).data?.data?.visits.length === 1);
	check('regular sign-in works with the demo password', (await call('POST', '/api/auth', { body: { email: 'client@example.com', password: 'demo-pass' } })).data?.auth === true);
	const clientId = myInvoices && (await call('GET', '/api/user/show_user_by_email/client@example.com', { token: admin.token })).data.data._id;
	check('demo sign-in accounts cannot be deactivated', (await call('PATCH', `/api/user/set_status/${clientId}`, { token: admin.token, body: { status: 'in-active' } })).status === 403);
	await call('PATCH', `/api/user/update_user/${clientId}`, { token: admin.token, body: { email: 'hijacked@example.com', role: 'admin', password: 'x', phone: '07700 999999' } });
	const after = (await call('GET', '/api/user/show_user_by_email/client@example.com', { token: admin.token })).data?.data;
	check('demo accounts keep their email, role and password', after?.email === 'client@example.com' && after.role === 'client' && after.phone === '07700 999999');
	check('other people can still be deactivated', (await call('PATCH', `/api/user/set_status/${carers.data.data.find(c => c.email === 'tomas.rivera@example.com')._id}`, { token: admin.token, body: { status: 'in-active' } })).data?.status === true);

	// Nightly reset: a visitor adds someone; once the last reset is older than the boundary, a restart re-seeds
	await call('POST', '/api/user/add_user', { token: admin.token, body: { email: 'visitor@example.com', first_name: 'Visitor', last_name: 'Added', dob: '1950-01-01', role: 'client', address: 'x', phone: 'x', password: 'x' } });
	server.kill();
	await new Promise(r => setTimeout(r, 500));
	await mongoose.connect(uri);
	await mongoose.connection.db.collection('metas').updateOne({ key: 'demo_last_reset' }, { $set: { value: new Date(Date.now() - 2 * 86400000) } });
	await mongoose.disconnect();
	server = startServer(uri);
	check('restart after the nightly boundary re-seeds the demo', await waitFor(server, 'Demo data reset'));
	const admin2 = await login('admin');
	const visitor = await call('GET', '/api/user/show_user_by_email/visitor@example.com', { token: admin2.token });
	const tomas = await call('GET', '/api/user/show_user_by_email/tomas.rivera@example.com', { token: admin2.token });
	check("visitors' changes are wiped by the reset", visitor.status === 400 && tomas.data?.data?.status === 'active');

	// A deploy with newer sample data re-seeds even if tonight's reset hasn't happened
	await call('POST', '/api/user/add_user', { token: admin2.token, body: { email: 'visitor2@example.com', first_name: 'Visitor', last_name: 'Two', dob: '1950-01-01', role: 'client', address: 'x', phone: 'x', password: 'x' } });
	server.kill();
	await new Promise(r => setTimeout(r, 500));
	await mongoose.connect(uri);
	await mongoose.connection.db.collection('metas').updateOne({ key: 'demo_seed_version' }, { $set: { value: 1 } });
	await mongoose.disconnect();
	server = startServer(uri);
	check('newer sample data re-seeds on the next start', await waitFor(server, 'Demo data reset'));
	const admin3 = await login('admin');
	check('...and replaces visitors\' changes', (await call('GET', '/api/user/show_user_by_email/visitor2@example.com', { token: admin3.token })).status === 400);
	server.log = '';
	server.kill();
	await new Promise(r => setTimeout(r, 500));
	server = startServer(uri);
	await waitFor(server, 'Server started');
	await new Promise(r => setTimeout(r, 1500));
	check('a normal restart does not re-seed', !server.log.includes('Demo data reset'));

	server.kill();
	await mongo.stop();
	if (failures) console.log('--- server log ---\n' + server.log);
	console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
	process.exit(failures ? 1 : 0);
})();
