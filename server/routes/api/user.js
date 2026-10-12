const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
const EDITABLE = ['first_name', 'last_name', 'email', 'phone', 'address', 'dob', 'description', 'staff_type', 'status', 'Medical', 'NextOfKin', 'EmergencyContact', 'Contracts', 'password'];
const REQUIRED = ['first_name', 'last_name', 'email', 'phone', 'address', 'dob'];
const STATUSES = ['active', 'on-leave', 'in-active'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
		}
		if ('email' in data) {
			data.email = String(data.email).trim().toLowerCase();
			if (!EMAIL.test(data.email)) return res.status(400).send({ status: false, msg: 'Enter a valid email address.' });
			if (data.email !== existing.email && await Users.exists({ email: data.email, _id: { $ne: existing._id } })) {
				return res.status(400).send({ status: false, msg: 'Another person already uses that email.' });
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

//@routes POST api/users/register
//@desc Register new user
//@access public
router.post('/add_user', auth, requireRole('admin'), async (req, res) => {
	const { first_name, email, last_name, dob, role, address, phone, password } = req.body;
	if (email == undefined || first_name == undefined || last_name == undefined || dob == undefined || role == undefined || address == undefined || phone == undefined || password == undefined) {
		return res.status(400).send({ msg: 'Some fields are empty!' });
	}
	try {
		const user = await Users.findOne({ email: email });

		//if user already exist
		if (user) { return res.status(400).send({ msg: 'User Already Exist' }); };

		//creating new user
		const newUser = new Users(req.body);

		//Create salt and hash
		const salt = await bcrypt.genSalt(10);

		newUser.password = await bcrypt.hash(req.body.password || "", salt);

		try {
			await newUser.save(); //save the data to db
			const { password: _hash, ...data } = newUser.toObject();
			return res
				.status(200)
				.send({ msg: 'Account created successfuly!', status: true, data });
		} catch (error) {
			return res.status(500).send({ msg: 'Account Not Created!' });
		}
	} catch (err) {
		console.log(err);
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
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
		let users = await Users.find().select('-password');

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


router.get('/get_counts', auth, requireRole('admin'), async (req, res) => {
	try {
		// let caregiver = await CareGiver.find({ $or: [{ email: search }, { first_name: search }, { last_name: search }] }).skip(skip).limit(take);
		let users = await Users.find();
		let clients = await Users.countDocuments({ role: "client" });
		let contracts = 0;
		if (!users) { return res.status(400).send({ status: false, msg: 'User not found' }); };
		users.map((u) => {
			contracts += u.Contracts.length || 0;
		});
		return res.status(200).send({ status: true, data: { users: users.length, contracts, clients } });

	} catch (err) {
		console.error(err);
		return res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});

router.get('/get_counts/:email', auth, selfOrAdmin, async (req, res) => {
	try {
		const { email } = req.params;
		// let caregiver = await CareGiver.find({ $or: [{ email: search }, { first_name: search }, { last_name: search }] }).skip(skip).limit(take);
		let invoices = await Invoice.countDocuments({ email });
		let client = await Users.findOne({ email });
		let contracts = client?.Contracts?.length || 0;

		return res.status(200).send({ status: true, data: { invoices, contracts } });

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