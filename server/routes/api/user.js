const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { auth, requireRole, selfOrAdmin } = require('../../middleware/auth');

// User Model
const Users = require('../../models/User');
const Invoice = require('../../models/Invoice');
const Schedule = require('../../models/Schedule');
const { searchFilter, pageOf, sortOf, collation } = require('../../utils/search');
const demo = require('../../demo');

const USER_SORTS = {
	name: [['first_name', 1], ['last_name', 1]],
	age: [['dob', -1]],
	phone: [['phone', 1]],
	status: [['status', 1]],
	staff_type: [['staff_type', 1]],
};
const BY_NAME = { first_name: 1, last_name: 1 };


//@routes PUT api/user/editProfile
//@desc update user
//@response - status: true or false | error
// Fields an admin may change on a person. Role is fixed after creation; status
// can be active / on-leave / in-active (in-active blocks sign-in, like Deactivate).
const EDITABLE = ['first_name', 'last_name', 'email', 'phone', 'address', 'dob', 'description', 'staff_type', 'status', 'Medical', 'NextOfKin', 'EmergencyContact', 'Contracts', 'password', 'relationship', 'key_worker'];
const REQUIRED = ['first_name', 'last_name', 'email', 'phone', 'address', 'dob'];
const STATUSES = ['active', 'on-leave', 'in-active'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'caregiver', 'client', 'family'];

// A resident's key worker must be a caregiver who hasn't been deactivated.
// Returns { value } (an id, or null to clear it) or { error }.
async function keyWorkerInput(value) {
	if (value === null || value === '' || value === undefined) return { value: null };
	if (!mongoose.isValidObjectId(value)) return { error: 'Choose a caregiver as key worker.' };
	const carer = await Users.findOne({ _id: value, role: 'caregiver', status: { $ne: 'in-active' } }).select('_id');
	return carer ? { value: carer._id } : { error: 'The key worker must be a current caregiver.' };
}

// True if deactivating `user` would leave the home without an active admin
async function lastAdmin(user) {
	if (!user || user.role !== 'admin') return false;
	return !(await Users.exists({ role: 'admin', status: { $ne: 'in-active' }, _id: { $ne: user._id } }));
}

//@routes PATCH api/user/update_user/:id
//@desc Update a person's details (admin)
//@response - status: true, data: updated user | status: false, msg
router.patch('/update_user/:id', auth, requireRole('admin'), async (req, res) => {
	const { id } = req.params;
	try {
		const existing = await Users.findById(id);
		if (!existing) return res.status(404).send({ status: false, msg: 'Person not found.' });

		const data = {};
		for (const key of EDITABLE) if (req.body[key] !== undefined) data[key] = req.body[key];

		// keep the shared demo logins working for the next visitor
		if (demo.enabled() && demo.isDemoAccount(existing)) {
			delete data.email;
			delete data.status;
			delete data.password;
		}

		for (const key of REQUIRED) {
			if (key in data && !String(data[key] ?? '').trim()) {
				return res.status(400).send({ status: false, msg: `${key.replace('_', ' ')} can't be empty.` });
			}
		}
		if ('status' in data) {
			if (!STATUSES.includes(data.status)) return res.status(400).send({ status: false, msg: 'Status must be active, on-leave or in-active.' });
			if (data.status !== 'active' && String(existing._id) === String(req.currentUser._id)) {
				return res.status(400).send({ status: false, msg: "You can't change your own status." });
			}
			if (data.status === 'in-active' && await lastAdmin(existing)) {
				return res.status(400).send({ status: false, msg: 'There must always be at least one active admin.' });
			}
		}
		if ('email' in data) {
			data.email = String(data.email).trim().toLowerCase();
			if (!EMAIL.test(data.email)) return res.status(400).send({ status: false, msg: 'Enter a valid email address.' });
			if (data.email !== existing.email && await Users.exists({ email: data.email, _id: { $ne: existing._id } })) {
				return res.status(400).send({ status: false, msg: 'Another person already uses that email.' });
			}
		}
		if ('key_worker' in data) {
			if (existing.role !== 'client') delete data.key_worker;
			else {
				const kw = await keyWorkerInput(data.key_worker);
				if (kw.error) return res.status(400).send({ status: false, msg: kw.error });
				data.key_worker = kw.value;
			}
		}
		// password: blank means "keep the current one"
		if (!data.password) delete data.password;
		else if (String(data.password).length < 8) return res.status(400).send({ status: false, msg: 'New password must be at least 8 characters.' });
		else data.password = await bcrypt.hash(String(data.password), await bcrypt.genSalt(10));

		const user = await Users.findByIdAndUpdate(id, data, { new: true }).select('-password');

		// invoices and rotas refer to people by email and name, so keep them in step
		const emailChanged = data.email && data.email !== existing.email;
		const nameChanged = (data.first_name && data.first_name !== existing.first_name) || (data.last_name && data.last_name !== existing.last_name);
		if (emailChanged) await Invoice.updateMany({ email: existing.email }, { email: user.email });
		if (emailChanged || nameChanged) {
			const name = `${user.first_name} ${user.last_name}`;
			const schedules = await Schedule.find({});
			for (const sch of schedules) {
				let touched = false;
				const days = sch.schedule && typeof sch.schedule === 'object' ? sch.schedule : {};
				for (const day of Object.keys(days)) {
					for (const slot of days[day] || []) {
						if (slot.email === existing.email) { slot.email = user.email; slot.name = name; touched = true; }
					}
				}
				if (touched) { sch.markModified('schedule'); await sch.save(); }
			}
		}

		res.status(200).send({ status: true, message: 'Saved', data: user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ msg: 'Something went wrong. Please try again.' });
	}
});

//@routes POST api/user/add_user
//@desc Create an account (admin): admin, caregiver, client (resident) or family member.
// Family members need { resident: <client id>, relationship } and only contact details.
router.post('/add_user', auth, requireRole('admin'), async (req, res) => {
	const body = req.body || {};
	const role = body.role;
	if (!ROLES.includes(role)) return res.status(400).send({ status: false, msg: 'Role must be admin, caregiver, client or family.' });
	const needed = role === 'family'
		? ['first_name', 'last_name', 'email', 'phone', 'password']
		: role === 'client'
			? ['first_name', 'last_name', 'email', 'dob', 'address', 'phone']
			: ['first_name', 'last_name', 'email', 'dob', 'address', 'phone', 'password'];
	if (needed.some(key => !String(body[key] ?? '').trim())) return res.status(400).send({ status: false, msg: 'Some fields are empty!' });
	const email = String(body.email).trim().toLowerCase();
	if (!EMAIL.test(email)) return res.status(400).send({ status: false, msg: 'Enter a valid email address.' });
	try {
		if (await Users.exists({ email })) return res.status(400).send({ status: false, msg: 'User Already Exist' });

		let data;
		if (role === 'family') {
			const resident = mongoose.isValidObjectId(body.resident) && await Users.findOne({ _id: body.resident, role: 'client' }).select('_id');
			if (!resident) return res.status(400).send({ status: false, msg: 'Choose the resident this family member is linked to.' });
			data = {
				role, email, resident: resident._id,
				first_name: String(body.first_name).trim(), last_name: String(body.last_name).trim(),
				phone: String(body.phone).trim(), relationship: String(body.relationship || '').trim().slice(0, 40),
			};
		} else {
			data = { ...body, role, email };
			delete data.resident;
			delete data.relationship;
			delete data._id;
			delete data.key_worker;
			if (role === 'client' && body.key_worker) {
				const kw = await keyWorkerInput(body.key_worker);
				if (kw.error) return res.status(400).send({ status: false, msg: kw.error });
				data.key_worker = kw.value;
			}
		}
		// residents never sign in, so they get a random password nobody knows
		const password = role === 'client' ? require('crypto').randomBytes(24).toString('hex') : String(body.password);
		data.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
		const newUser = await new Users(data).save();
		const { password: _hash, ...saved } = newUser.toObject();
		return res.status(200).send({ msg: 'Account created successfuly!', status: true, data: saved });
	} catch (err) {
		console.error(err);
		return res.status(500).send({ status: false, msg: 'Account Not Created!' });
	}
});

//@routes GET api/user/family/:residentId
//@desc Family members linked to a resident (admin)
router.get('/family/:residentId', auth, requireRole('admin'), async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.residentId)) return res.status(404).send({ status: false, msg: 'Resident not found.' });
	try {
		const family = await Users.find({ role: 'family', resident: req.params.residentId }).select('-password').sort(BY_NAME);
		res.status(200).send({ status: true, data: family, count: family.length });
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: false, msg: 'Something went wrong. Please try again.' });
	}
});

//@routes PATCH api/user/set_status/:id
//@desc Deactivate or reactivate an account (records are kept; nothing is deleted)
//@access Admin
router.patch('/set_status/:id', auth, requireRole('admin'), async (req, res) => {
	const { status } = req.body;
	if (!['active', 'in-active'].includes(status)) {
		return res.status(400).send({ status: false, msg: 'Status must be active or in-active.' });
	}
	if (req.params.id === String(req.currentUser._id)) {
		return res.status(400).send({ status: false, msg: "You can't deactivate your own account." });
	}
	try {
		if (demo.enabled() && demo.isDemoAccount(await Users.findById(req.params.id).select('email'))) {
			return res.status(403).send({ status: false, msg: 'Demo sign-in accounts stay active so the next visitor can use them. Try another person.' });
		}
		if (status === 'in-active' && await lastAdmin(await Users.findById(req.params.id).select('role'))) {
			return res.status(400).send({ status: false, msg: 'There must always be at least one active admin.' });
		}
		const user = await Users.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
		if (!user) return res.status(404).send({ status: false, msg: 'User not found.' });
		res.status(200).send({ status: true, data: user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ msg: 'Something went wrong. Please try again.' });
	}
});

router.get('/show_users/:role', auth, requireRole('admin'), async (req, res) => {
	const { role } = req.params;
	try {
		const { skip, take } = pageOf(req.query);
		const filter = { role, ...searchFilter(req.query.search, ['first_name', 'last_name', 'email']) };
		const users = await Users.find(filter).select('-password').sort(sortOf(req.query, USER_SORTS, BY_NAME)).collation(collation).skip(skip).limit(take);
		const count = await Users.countDocuments(filter);
		res.status(200).send({ status: true, data: users, count });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});

router.get('/show_all_users', auth, requireRole('admin'), async (req, res) => {
	try {
		const { skip, take } = pageOf(req.query);
		const filter = searchFilter(req.query.search, ['first_name', 'last_name', 'email']);
		const users = await Users.find(filter).select('-password').sort(sortOf(req.query, USER_SORTS, BY_NAME)).collation(collation).skip(skip).limit(take);
		const count = await Users.countDocuments(filter);
		res.status(200).send({ status: true, data: users, count });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});

// A contract counts until the end of its end date; one that hasn't started yet
// is signed, so it counts too (the UI labels it "Starts soon")
function checkDates(start1, end1) {
	if (!start1 || !end1) return false;
	return new Date() <= new Date(end1 + 'T23:59:59Z');
}


router.get('/show_all_contracts', auth, requireRole('admin'), async (req, res) => {
	const { current, search } = req.query;
	try {
		let noContracts = [];
		let valid = [];
		let expired = [];

		let skip = 0;
		let take = 100; //in the case current page is not specified
		if (current) {
			skip = (current - 1) * 10;
			take = 10;
		}
		// let caregiver = await CareGiver.find({ $or: [{ email: search }, { first_name: search }, { last_name: search }] }).skip(skip).limit(take);
		let users = await Users.find({ role: { $ne: 'family' } }).select('-password');

		users.map((user) => {
			if (user.Contracts.length > 0) {
				checkDates(user.Contracts[0].start_date, user.Contracts[0].end_date) ? valid = [...valid, user] : expired = [...expired, user];
			} else {
				noContracts = [...noContracts, user];
			}
			user.Contracts.map((c) => {

			});
		});
		if (!users) { res.status(400).send({ status: false, error: 'Problem with the query or user not found' }); };
		res.status(200).send({ status: true, data: users, count: users.length || 0, noContracts, valid, expired });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});




router.get('/show_user_by_email/:email', auth, selfOrAdmin, async (req, res) => {
	const { email } = req.params;
	try {
		// let caregiver = await CareGiver.find({ $or: [{ email: search }, { first_name: search }, { last_name: search }] }).skip(skip).limit(take);
		let users = await Users.findOne({ email }).select('-password');
		if (!users) { return res.status(400).send({ status: false, msg: 'User not found' }); };
		return res.status(200).send({ status: true, data: users });

	} catch (err) {
		console.error(err);
		return res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});


// Unpaid total, how many invoices are unpaid, and how many of those are past due
async function outstanding(filter = {}) {
	const today = new Date().toISOString().slice(0, 10);
	const unpaid = await Invoice.find({ ...filter, status: { $ne: 'paid' } }).select('amount due_date');
	return {
		outstanding: unpaid.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
		unpaid: unpaid.length,
		overdue: unpaid.filter(i => i.due_date && i.due_date < today).length,
	};
}

// The person's current (newest) contract: 'valid' (incl. not started yet), 'expired' or 'none'
function contractState(u) {
	const c = u.Contracts && u.Contracts[0];
	if (!c) return 'none';
	return checkDates(c.start_date, c.end_date) ? 'valid' : 'expired';
}

//@routes GET api/user/get_counts
//@desc Admin dashboard figures
router.get('/get_counts', auth, requireRole('admin'), async (req, res) => {
	try {
		const users = await Users.find().select('role status Contracts');
		const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
		const clients = users.filter(u => u.role === 'client');
		const carers = users.filter(u => u.role === 'caregiver');
		const people = users.filter(u => u.role === 'client' || u.role === 'caregiver');
		const valid = people.filter(u => contractState(u) === 'valid');
		return res.status(200).send({
			status: true,
			data: {
				users: users.length,
				contracts: users.reduce((n, u) => n + (u.Contracts?.length || 0), 0),
				clients: clients.length,
				clientsWithoutContract: clients.filter(u => contractState(u) !== 'valid').length,
				caregivers: carers.length,
				caregiversActive: carers.filter(u => u.status === 'active').length,
				caregiversOnLeave: carers.filter(u => u.status === 'on-leave').length,
				contractsValid: valid.length,
				contractsExpiringSoon: valid.filter(u => u.Contracts[0].end_date <= soon).length,
				...(await outstanding()),
			},
		});
	} catch (err) {
		console.error(err);
		return res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});

//@routes GET api/user/get_counts/:email
//@desc Figures for a client's or caregiver's own dashboard
router.get('/get_counts/:email', auth, selfOrAdmin, async (req, res) => {
	try {
		const { email } = req.params;
		const invoices = await Invoice.countDocuments({ email });
		const person = await Users.findOne({ email }).select('Contracts');
		const current = person?.Contracts?.[0] || null;
		return res.status(200).send({
			status: true,
			data: {
				invoices,
				contracts: person?.Contracts?.length || 0,
				contract: current && { start_date: current.start_date, end_date: current.end_date, state: contractState(person) },
				...(await outstanding({ email })),
			},
		});
	} catch (err) {
		console.error(err);
		return res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});


//@routes GET api/user/loggedIn
//@desc Check if a user is loggedIn
router.get('/loggedIn', async (req, res) => {
	try {
		const token = req.headers.authorization;
		//check for token
		if (!token) {
			res.status(200).send(false);
		} else {
			jwt.verify(token, process.env.jwtSecret, function (err) {
				if (err) { res.status(200).send({ status: false }); }
				else { res.status(200).send(true); };
			});

		}
		//verify token

	} catch (e) {
		console.error(e);
		res.status(500).send({ status: false });
	}
});




module.exports = router;