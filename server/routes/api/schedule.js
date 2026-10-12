const express = require('express');
const router = express.Router();

const { auth, requireRole } = require('../../middleware/auth');

// Schedule Model
const Users = require('../../models/User');
const Schedule = require('../../models/Schedule');
const { searchFilter, pageOf, sortOf } = require('../../utils/search');
const { buildRota } = require('../../utils/rota');

// week is stored as text, so both columns sort by the ISO start date
const SCHEDULE_SORTS = {
	week: [['start_date', 1]],
	dates: [['start_date', 1]],
};

// How many caregivers each day needs unless the admin asks for a different number
const DEFAULT_PER_DAY = Number(process.env.ROTA_PER_DAY) || 5;

//@routes POST api/schedule/add_schedule
//@desc Generate (or regenerate) a week's rota from every active caregiver (rules in utils/rota.js)
router.post('/add_schedule', auth, requireRole('admin'), async (req, res) => {
	const { first, last, week } = req.body;
	if (!first || !last || !week) {
		return res.status(400).send({ status: false, msg: 'Choose a start date to generate the rota.' });
	}
	try {
		const caregivers = await Users.find({ role: 'caregiver', status: 'active' }).select('first_name last_name email');
		if (caregivers.length === 0) {
			return res.status(400).send({ status: false, msg: 'Add at least one active caregiver before generating a rota.' });
		}
		const requested = parseInt(req.body.per_day, 10) || DEFAULT_PER_DAY;
		const { rota, perDay } = buildRota(caregivers, requested);

		let saved = await Schedule.findOne({ week, start_date: first });
		if (saved) {
			saved.schedule = rota;
			saved.end_date = last;
			await saved.save();
		} else {
			saved = await new Schedule({ start_date: first, end_date: last, week, schedule: rota }).save();
		}
		return res.status(200).send({ status: true, data: saved, perDay, caregivers: caregivers.length });
	} catch (err) {
		console.error(err);
		res.status(500).send({ msg: 'Something went wrong. Please try again.', status: false });
	}
});

router.get('/show_all_schedules', auth, async (req, res) => {
	try {
		const { skip, take } = pageOf(req.query);
		const filter = searchFilter(req.query.search, ['week', 'start_date', 'end_date']);
		const sch = await Schedule.find(filter).sort(sortOf(req.query, SCHEDULE_SORTS, { start_date: -1 })).skip(skip).limit(take);
		const count = await Schedule.countDocuments(filter);
		res.status(200).send({ status: true, data: sch, count });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});



module.exports = router;