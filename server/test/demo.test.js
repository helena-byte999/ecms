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
	check('demo client has their own invoices', myInvoices.data?.count === 3);
	const rotas = await call('GET', '/api/schedule/show_all_schedules', { token: caregiver.token });
	check('this week and last week have rotas', rotas.data?.count === 2);
	const onRota = Object.values(rotas.data.data[0].schedule).flat().map(s => s.email);
	check('rotas only use active caregivers', !onRota.includes('kwame.mensah@example.com') && !onRota.includes('hannah.price@example.com'));

	const allInv = (await call('GET', '/api/invoice/show_invoices', { token: admin.token })).data.data;
	const today = new Date().toISOString().slice(0, 10);
	check('sample invoices include paid, unpaid and overdue', allInv.some(i => i.status === 'paid') && allInv.some(i => i.status === 'unpaid' && i.due_date >= today) && allInv.some(i => i.status === 'unpaid' && i.due_date < today));
	check('demo accounts cannot change their password', (await call('POST', '/api/auth/change_password', { token: client.token, body: { current_password: 'demo-pass', new_password: 'something-new' } })).status === 403);
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

	server.kill();
	await mongo.stop();
	if (failures) console.log('--- server log ---\n' + server.log);
	console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
	process.exit(failures ? 1 : 0);
})();
