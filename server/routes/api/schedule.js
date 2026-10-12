const express = require('express');
const router = express.Router();

const { auth, requireRole } = require('../../middleware/auth');

// Schedule Model
const Users = require('../../models/User');
const Schedule = require('../../models/Schedule');
const { searchFilter, pageOf } = require('../../utils/search');

router.post('/add_schedule', auth, requireRole('admin'), async (req, res) => {
	const { first, last, week } = req.body;
	try {

		let found = await Schedule.findOne({ week, start_date: first });

		let user_randoms = {};
		let total_shifts = 7;
		let users = await Users.find({ role: "caregiver", status: "active" }).select("first_name last_name email").limit(7);
		//shuffle users;
		users = users
			.map(value => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value)

		if (users.length != 7) {
			return res.status(400).send({ status: false, msg: "Ensure 7 staffs are active" });
		}
		let current = 0;
		for (var i = 0; i < total_shifts; i++) {
			let staffs = [];
			for (var x = 0; x < 5; x++) {
				staffs.push({ name: users[current].first_name + " " + users[current].last_name, email: users[current].email });
				current++;
				if (current == 7) {
					current = 0;
				}
			}
			user_randoms[i] = staffs;
		};

		if (found) {
			found.schedule = user_randoms;
			await found.save();
			return res.status(200).send({ status: true, data: found })
		} else {
			const new_schedule = new Schedule({ start_date: first, end_date: last, week, schedule: user_randoms });
			await new_schedule.save();
			return res.status(200).send({ status: true, data: new_schedule });
		}



	} catch (err) {
		console.log(err);
		res.status(500).send({ msg: err, status: false });
	}
});

router.get('/show_all_schedules', auth, async (req, res) => {
	try {
		const { skip, take } = pageOf(req.query);
		const filter = searchFilter(req.query.search, ['week', 'start_date', 'end_date']);
		const sch = await Schedule.find(filter).sort({ start_date: -1, week: -1 }).skip(skip).limit(take);
		const count = await Schedule.countDocuments(filter);
		res.status(200).send({ status: true, data: sch, count });

	} catch (err) {
		res.status(400).json({ msg: err });
	}
});



module.exports = router;