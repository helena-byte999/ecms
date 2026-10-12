const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { auth, requireRole, selfOrAdmin } = require('../../middleware/auth');

// User Model
const Users = require('../../models/User');
const Invoice = require('../../models/Invoice');
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
router.patch('/update_user/:id', auth, requireRole('admin'), async (req, res) => {
	const { id } = req.params;

	try {
		let data = req.body;
		// keep the shared demo logins working for the next visitor
		if (demo.enabled() && demo.isDemoAccount(await Users.findById(id).select('email'))) {
			delete data.email;
			delete data.role;
			delete data.status;
			delete data.password;
		}
		if (data.password) {
			const salt = await bcrypt.genSalt(10);
			data.password = await bcrypt.hash(data.password, salt);
		}

		const user = await Users.findByIdAndUpdate(id, req.body);
		console.log(user);
		if (!user) { return res.status(400).send({ status: false, error: 'Problem with the update query' }); };

		//add change to system
		res.status(200).send({ status: true, message: "Profile Updated" });

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

function checkDates(start1, end1) {
	if (!start1 || !end1) {
		return false;
	}
	const date = new Date();

	const start = new Date(start1);
	const end = new Date(end1);
	let result = null;

	if (date > start && date < end) {
		result = true;
	} else {
		result = false;
	}
	return result;
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