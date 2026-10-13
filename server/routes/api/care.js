const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const Users = require('../../models/User');
const Medications = require('../../models/Medication');
const CareEntries = require('../../models/CareEntry');
const { local, instant, addDays, minutes, DATE, TIME } = require('../../utils/time');
const care = require('../../utils/care');

const STAFF = ['admin', 'caregiver'];
const fail = (res, code, msg) => res.status(code).send({ status: false, msg });
const oops = (res, err) => { console.error(err); fail(res, 500, 'Something went wrong. Please try again.'); };
const residentInfo = (r) => ({
	_id: r._id, first_name: r.first_name, last_name: r.last_name, email: r.email, dob: r.dob,
	allergy: r.Medical?.allergy || '', conditions: r.Medical?.others || '',
	gp: r.Medical?.gp_name || '', gp_phone: r.Medical?.gp_phone || '',
});

async function signedIn(req, res) {
	const me = await Users.findById(req.user.id).select('-password');
	if (!me || me.status === 'in-active') { fail(res, 403, 'You do not have permission to do this'); return null; }
	return me;
}

// Loads the signed-in user and the resident in :id. Staff can read and write for
// any resident; a resident can read their own records, family their relative's.
function careAccess(mode) {
	return async (req, res, next) => {
		try {
			const me = await signedIn(req, res);
			if (!me) return;
			if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Resident not found.');
			const resident = await Users.findById(req.params.id).select('-password');
			if (!resident || resident.role !== 'client') return fail(res, 404, 'Resident not found.');
			const staff = STAFF.includes(me.role);
			const own = String(me._id) === String(resident._id);
			const family = me.role === 'family' && String(me.resident) === String(resident._id);
			const allowed = mode === 'write' ? staff : mode === 'report' ? me.role === 'admin' || own || family : staff || own || family;
			if (!allowed) return fail(res, 403, 'You do not have permission to do this');
			req.currentUser = me;
			req.resident = resident;
			next();
		} catch (err) { oops(res, err); }
	};
}

function staffOnly(roles = STAFF) {
	return async (req, res, next) => {
		try {
			const me = await signedIn(req, res);
			if (!me) return;
			if (!roles.includes(me.role)) return fail(res, 403, 'You do not have permission to do this');
			req.currentUser = me;
			next();
		} catch (err) { oops(res, err); }
	};
}

// ?from=YYYY-MM-DD&to=YYYY-MM-DD (local dates), default the last 7 days, at most 92 days
function rangeOf(query, days = 7) {
	const today = local().date;
	const to = DATE.test(query.to || '') ? query.to : today;
	let from = DATE.test(query.from || '') ? query.from : addDays(to, -(days - 1));
	if (from > to) return { error: 'The start date must be before the end date.' };
	if (addDays(from, 92) <= to) from = addDays(to, -91);
	return { from, to, start: instant(from), end: instant(addDays(to, 1)) };
}

const medsFor = (ids) => Medications.find({ resident: { $in: ids } }).sort({ name: 1 }).lean();
const doseEntriesFor = (ids, from, to) => CareEntries.find({
	resident: { $in: ids }, type: 'dose', 'dose.date': { $gte: from, $lte: to },
}).sort({ created_at: 1 }).lean();

const slotOut = (s) => ({
	medication: { _id: s.medication._id, name: s.medication.name, dose: s.medication.dose, instructions: s.medication.instructions },
	date: s.date, time: s.time, status: s.status,
	entry: s.entry && { _id: s.entry._id, outcome: s.entry.dose.outcome, author: s.entry.author, at: s.entry.at, note: s.entry.note },
});

//@routes GET api/care/residents
//@desc Residents the signed-in user can see, with today's medicine round progress for staff
router.get('/residents', auth, async (req, res) => {
	try {
		const me = await signedIn(req, res);
		if (!me) return;
		let residents;
		if (STAFF.includes(me.role)) residents = await Users.find({ role: 'client', status: { $ne: 'in-active' } }).select('-password').sort({ first_name: 1, last_name: 1 });
		else if (me.role === 'family') residents = await Users.find({ _id: me.resident, role: 'client' }).select('-password');
		else if (me.role === 'client') residents = [me];
		else residents = [];

		const ids = residents.map(r => r._id);
		const today = local().date;
		const [meds, doses, latest] = await Promise.all([
			medsFor(ids),
			doseEntriesFor(ids, today, today),
			CareEntries.aggregate([{ $match: { resident: { $in: ids } } }, { $group: { _id: '$resident', at: { $max: '$at' } } }]),
		]);
		const lastAt = Object.fromEntries(latest.map(l => [String(l._id), l.at]));
		const data = residents.map(r => {
			const mine = meds.filter(m => String(m.resident) === String(r._id));
			const slots = care.doseSlots(mine, doses.filter(d => String(d.resident) === String(r._id)), today, today);
			const late = slots.filter(s => s.status === 'late').length;
			return {
				...residentInfo(r),
				medicines: mine.filter(m => m.status === 'active').length,
				today: { ...care.tallyDoses(slots), late },
				last_entry: lastAt[String(r._id)] || null,
			};
		});
		res.send({ status: true, data });
	} catch (err) { oops(res, err); }
});

//@routes GET api/care/round?date=YYYY-MM-DD
//@desc Every scheduled dose across the home for a day (today by default), for staff
router.get('/round', auth, staffOnly(), async (req, res) => {
	try {
		const today = local().date;
		const date = DATE.test(req.query.date || '') && req.query.date <= today ? req.query.date : today;
		const residents = await Users.find({ role: 'client', status: { $ne: 'in-active' } }).select('first_name last_name Medical').sort({ first_name: 1, last_name: 1 });
		const ids = residents.map(r => r._id);
		const [meds, doses] = await Promise.all([medsFor(ids), doseEntriesFor(ids, date, date)]);
		const slots = [];
		const asNeeded = [];
		for (const r of residents) {
			const mine = meds.filter(m => String(m.resident) === String(r._id));
			const who = { _id: r._id, name: care.name(r), allergy: r.Medical?.allergy || '' };
			const day = care.doseSlots(mine, doses.filter(d => String(d.resident) === String(r._id)), date, date, new Date(), { upcoming: true });
			for (const s of day) slots.push({ resident: who, ...slotOut(s) });
			for (const m of mine) if (m.as_needed && m.status === 'active') asNeeded.push({ resident: who, medication: { _id: m._id, name: m.name, dose: m.dose, instructions: m.instructions, reason: m.reason } });
		}
		slots.sort((a, b) => a.time.localeCompare(b.time) || a.resident.name.localeCompare(b.resident.name));
		res.send({ status: true, data: { date, now: local().time, slots, as_needed: asNeeded, totals: care.tallyDoses(slots.filter(s => s.status !== 'upcoming')) } });
	} catch (err) { oops(res, err); }
});

//@routes GET api/care/:id/entries?from&to&type
//@desc A resident's care log, newest first. Corrected entries are marked, not hidden.
router.get('/:id/entries', auth, careAccess('read'), async (req, res) => {
	const range = rangeOf(req.query);
	if (range.error) return fail(res, 400, range.error);
	try {
		const filter = { resident: req.resident._id, at: { $gte: range.start, $lt: range.end } };
		if (CareEntries.ENTRY_TYPES.includes(req.query.type)) filter.type = req.query.type;
		const entries = await CareEntries.find(filter).sort({ at: -1, created_at: -1 }).limit(1000).lean();
		const corrections = await CareEntries.find({ corrects: { $in: entries.map(e => e._id) } }).select('corrects').lean();
		const replacedBy = Object.fromEntries(corrections.map(c => [String(c.corrects), c._id]));
		res.send({
			status: true,
			data: entries.map(e => ({ ...e, corrected_by: replacedBy[String(e._id)] || null })),
			resident: residentInfo(req.resident),
			from: range.from, to: range.to,
		});
	} catch (err) { oops(res, err); }
});

// A dose for a scheduled time (once per time; changes are corrections) or an "as needed" dose
async function doseInput(body, resident, correcting) {
	const d = body.dose || {};
	if (!care.OUTCOMES.includes(d.outcome)) return { error: 'Choose given, refused or missed.' };
	if (!mongoose.isValidObjectId(d.medication)) return { error: 'Choose a medicine.' };
	const med = await Medications.findOne({ _id: d.medication, resident: resident._id });
	if (!med) return { error: 'That medicine is not on this resident\'s list.' };
	const now = local();
	const date = d.date || now.date;
	if (!DATE.test(date) || date > now.date) return { error: 'Choose a valid date.' };
	const time = med.as_needed ? '' : d.time;
	if (!med.as_needed && (!TIME.test(time || '') || !med.times.includes(time))) return { error: `Choose one of the times for ${med.name}.` };
	if (date < med.start_date || (med.end_date && date > med.end_date)) return { error: `${med.name} isn't prescribed on that date.` };
	if (med.status === 'stopped' && !correcting) {
		const stopped = local(med.stopped_at);
		if (med.as_needed || `${date} ${time}` >= `${stopped.date} ${stopped.time}`) return { error: `${med.name} has been stopped.` };
	}
	if (time && date === now.date && minutes(time) - minutes(now.time) > care.LATE_AFTER_MIN) {
		return { error: `The ${time} dose of ${med.name} isn't due yet.` };
	}
	if (med.as_needed && d.outcome === 'given' && !care.text(body.note, 1000)) return { error: 'Say why the "as needed" dose was given.' };
	if (time) {
		const existing = await CareEntries.find({ resident: resident._id, type: 'dose', 'dose.medication': med._id, 'dose.date': date, 'dose.time': time }).lean();
		const latest = care.current(existing).pop();
		if (latest && (!correcting || String(latest._id) !== String(correcting._id))) {
			return { error: `The ${time} dose of ${med.name} is already recorded. Correct that entry instead.`, code: 409 };
		}
	}
	return { data: { type: 'dose', note: care.text(body.note, 1000), dose: { medication: med._id, name: med.name, dose: med.dose, date, time, outcome: d.outcome } } };
}

//@routes POST api/care/:id/entries
//@desc Add a care entry or record a dose (staff). { corrects: id } replaces an earlier entry.
router.post('/:id/entries', auth, careAccess('write'), async (req, res) => {
	try {
		let correcting = null;
		if (req.body.corrects) {
			if (!mongoose.isValidObjectId(req.body.corrects)) return fail(res, 400, 'That entry was not found.');
			correcting = await CareEntries.findOne({ _id: req.body.corrects, resident: req.resident._id });
			if (!correcting) return fail(res, 400, 'That entry was not found.');
			if (correcting.type === 'visit') return fail(res, 400, "Doctor's visits can't be corrected here. Add a note instead.");
			if (correcting.type !== req.body.type) return fail(res, 400, 'A correction must be the same type of entry.');
			if (await CareEntries.exists({ corrects: correcting._id })) return fail(res, 409, 'That entry has already been corrected. Correct the newest version.');
		}
		const input = req.body.type === 'dose' ? await doseInput(req.body, req.resident, correcting) : care.entryInput(req.body);
		if (input.error) return fail(res, input.code || 400, input.error);
		const when = care.whenInput(req.body.at);
		if (when.error) return fail(res, 400, when.error);
		const entry = await new CareEntries({
			...input.data,
			resident: req.resident._id,
			at: correcting ? correcting.at : when.at,
			author: care.author(req.currentUser),
			corrects: correcting?._id,
		}).save();
		res.status(201).send({ status: true, data: entry });
	} catch (err) { oops(res, err); }
});

//@routes GET api/care/:id/medications
//@desc Current medicines and the ones that were stopped
router.get('/:id/medications', auth, careAccess('read'), async (req, res) => {
	try {
		const meds = await Medications.find({ resident: req.resident._id }).sort({ name: 1 }).lean();
		res.send({
			status: true,
			resident: residentInfo(req.resident),
			active: meds.filter(m => m.status === 'active'),
			stopped: meds.filter(m => m.status === 'stopped').sort((a, b) => b.stopped_at - a.stopped_at),
		});
	} catch (err) { oops(res, err); }
});

//@routes POST api/care/:id/medications
//@desc Add a medicine to a resident's list (staff)
router.post('/:id/medications', auth, careAccess('write'), async (req, res) => {
	const input = care.medicineInput(req.body, local().date);
	if (input.error) return fail(res, 400, input.error);
	try {
		const med = await new Medications({ ...input.data, resident: req.resident._id, added_by: care.author(req.currentUser) }).save();
		res.status(201).send({ status: true, data: med });
	} catch (err) { oops(res, err); }
});

//@routes POST api/care/:id/medications/:medId/stop
//@desc Stop a medicine (staff). It stays in the history.
router.post('/:id/medications/:medId/stop', auth, careAccess('write'), async (req, res) => {
	const reason = care.text(req.body.reason, 200);
	if (!reason) return fail(res, 400, 'Say why the medicine is being stopped.');
	if (!mongoose.isValidObjectId(req.params.medId)) return fail(res, 404, 'Medicine not found.');
	try {
		const med = await Medications.findOne({ _id: req.params.medId, resident: req.resident._id });
		if (!med) return fail(res, 404, 'Medicine not found.');
		if (med.status === 'stopped') return fail(res, 409, 'That medicine has already been stopped.');
		Object.assign(med, { status: 'stopped', stopped_at: new Date(), stopped_by: care.author(req.currentUser), stop_reason: reason });
		await med.save();
		res.send({ status: true, data: med });
	} catch (err) { oops(res, err); }
});

//@routes POST api/care/:id/visits
//@desc Record a doctor's visit (staff). Medicines started or stopped and changes to
// allergies and conditions are applied to the resident's records straight away.
router.post('/:id/visits', auth, careAccess('write'), async (req, res) => {
	const b = req.body;
	const visit = { professional: care.text(b.professional, 120), reason: care.text(b.reason, 300), outcome: care.text(b.outcome, 1000), follow_up: care.text(b.follow_up, 300) };
	if (!visit.professional) return fail(res, 400, 'Enter who visited, for example "Dr Patel, GP".');
	if (!visit.reason) return fail(res, 400, 'Enter the reason for the visit.');
	if (!visit.outcome) return fail(res, 400, 'Enter the outcome of the visit.');
	const when = care.whenInput(b.at);
	if (when.error) return fail(res, 400, when.error);
	const visitDate = local(when.at).date;
	try {
		// check everything before changing anything
		const starts = [];
		for (const m of Array.isArray(b.start) ? b.start : []) {
			const input = care.medicineInput({ start_date: visitDate, ...m }, visitDate);
			if (input.error) return fail(res, 400, input.error);
			starts.push(input.data);
		}
		const stops = [];
		for (const s of Array.isArray(b.stop) ? b.stop : []) {
			const med = mongoose.isValidObjectId(s.id) && await Medications.findOne({ _id: s.id, resident: req.resident._id, status: 'active' });
			if (!med) return fail(res, 400, 'A medicine to stop is not on the current list.');
			stops.push({ med, reason: care.text(s.reason, 200) });
		}
		const profile = b.profile || {};
		const medical = { ...(req.resident.Medical || {}) };
		const changes = [];
		for (const [key, field] of [['allergy', 'allergy'], ['conditions', 'others']]) {
			if (profile[key] === undefined) continue;
			const to = care.text(profile[key], 300);
			const from = medical[field] || '';
			if (to !== from) { changes.push({ field: key, from, to }); medical[field] = to; }
		}
		const by = care.author(req.currentUser);
		const entryId = new mongoose.Types.ObjectId();
		// changes take effect from the time of the visit
		const started = await Medications.insertMany(starts.map(m => ({ ...m, resident: req.resident._id, added_by: by, added_at: when.at, visit: entryId })));
		const stopReason = (r) => r || `Stopped at a visit by ${visit.professional}`;
		for (const s of stops) Object.assign(s.med, { status: 'stopped', stopped_at: when.at, stopped_by: by, stop_reason: stopReason(s.reason) });
		await Promise.all(stops.map(s => s.med.save()));
		if (changes.length) await Users.updateOne({ _id: req.resident._id }, { Medical: medical });

		const entry = await new CareEntries({
			_id: entryId,
			resident: req.resident._id,
			type: 'visit',
			at: when.at,
			author: by,
			note: care.text(b.note, 1000),
			visit: {
				...visit,
				started: started.map(m => ({ id: m._id, name: m.name, dose: m.dose, reason: m.reason })),
				stopped: stops.map(s => ({ id: s.med._id, name: s.med.name, dose: s.med.dose, reason: s.med.stop_reason })),
				changes,
			},
		}).save();
		res.status(201).send({ status: true, data: entry });
	} catch (err) { oops(res, err); }
});

// Figures for one resident's care summary
async function summaryFor(resident, range) {
	const [meds, doses, entries] = await Promise.all([
		medsFor([resident._id]),
		doseEntriesFor([resident._id], range.from, range.to),
		CareEntries.find({ resident: resident._id, at: { $gte: range.start, $lt: range.end } }).sort({ at: 1 }).lean(),
	]);
	const slots = care.doseSlots(meds, doses, range.from, range.to);
	const kept = care.current(entries);
	const ofType = (t) => kept.filter(e => e.type === t);
	const inRange = (d) => d && d >= range.start && d < range.end;

	const medicines = meds
		.filter(m => m.as_needed || slots.some(s => String(s.medication._id) === String(m._id)) || inRange(m.added_at) || inRange(m.stopped_at) || m.status === 'active')
		.map(m => {
			const mine = slots.filter(s => String(s.medication._id) === String(m._id));
			const asNeeded = ofType('dose').filter(e => String(e.dose.medication) === String(m._id) && !e.dose.time && e.dose.outcome === 'given').length;
			return { _id: m._id, name: m.name, dose: m.dose, times: m.times, as_needed: m.as_needed, status: m.status, ...care.tallyDoses(mine), as_needed_given: asNeeded };
		});
	const changes = [
		...meds.filter(m => inRange(m.added_at)).map(m => ({ at: m.added_at, kind: 'started', name: m.name, dose: m.dose, by: m.added_by?.name, reason: m.reason })),
		...meds.filter(m => inRange(m.stopped_at)).map(m => ({ at: m.stopped_at, kind: 'stopped', name: m.name, dose: m.dose, by: m.stopped_by?.name, reason: m.stop_reason })),
	].sort((a, b) => a.at - b.at);

	const wellbeing = ofType('wellbeing');
	const temps = wellbeing.map(e => e.wellbeing?.temperature).filter(t => typeof t === 'number');
	const moods = {};
	for (const e of wellbeing) if (e.wellbeing?.mood) moods[e.wellbeing.mood] = (moods[e.wellbeing.mood] || 0) + 1;
	const unwellDays = new Set(wellbeing.filter(e => e.wellbeing?.unwell).map(e => local(e.at).date));
	const meals = ofType('meal');
	const eaten = {};
	for (const e of meals) if (e.meal?.eaten) eaten[e.meal.eaten] = (eaten[e.meal.eaten] || 0) + 1;
	const drinkDays = {};
	for (const e of meals) if (e.meal?.drink_ml) drinkDays[local(e.at).date] = (drinkDays[local(e.at).date] || 0) + e.meal.drink_ml;
	const drinkValues = Object.values(drinkDays);
	const byType = {};
	const byAuthor = {};
	for (const e of kept) {
		byType[e.type] = (byType[e.type] || 0) + 1;
		const who = e.author?.name || 'Unknown';
		byAuthor[who] = (byAuthor[who] || 0) + 1;
	}

	return {
		resident: residentInfo(resident),
		from: range.from,
		to: range.to,
		doses: { ...care.tallyDoses(slots), as_needed_given: medicines.reduce((n, m) => n + m.as_needed_given, 0) },
		medicines,
		changes,
		incidents: ofType('incident').map(e => ({ _id: e._id, at: e.at, ...e.incident, note: e.note, author: e.author?.name })),
		visits: ofType('visit').map(e => ({ _id: e._id, at: e.at, ...e.visit, note: e.note, author: e.author?.name })),
		wellbeing: {
			readings: wellbeing.length,
			days_unwell: unwellDays.size,
			max_temperature: temps.length ? Math.max(...temps) : null,
			moods,
		},
		meals: {
			recorded: meals.filter(e => e.meal?.meal !== 'drink').length,
			eaten,
			drink_ml_per_day: drinkValues.length ? Math.round(drinkValues.reduce((a, b) => a + b, 0) / drinkValues.length) : null,
		},
		entries: {
			total: kept.length,
			by_type: byType,
			by_author: Object.entries(byAuthor).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
		},
	};
}

//@routes GET api/care/:id/summary?from&to
//@desc One resident's care summary (admins, the resident and their family)
router.get('/:id/summary', auth, careAccess('report'), async (req, res) => {
	const range = rangeOf(req.query);
	if (range.error) return fail(res, 400, range.error);
	try {
		res.send({ status: true, data: await summaryFor(req.resident, range) });
	} catch (err) { oops(res, err); }
});

// A dose counts as "on time" if it was recorded within an hour of its time
const ON_TIME_MIN = 60;
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
const daysBetween = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };

// A resident's completion over the period: one point a day for short periods, one a
// week (counted back from the last day) for longer ones, so a single refused dose
// doesn't make the line jump from 100% to 50%
function trendPoints(days) {
	const size = days.length > 14 ? 7 : 1;
	const points = [];
	for (let end = days.length; end > 0; end -= size) {
		const chunk = days.slice(Math.max(0, end - size), end);
		const expected = chunk.reduce((n, d) => n + d.expected, 0);
		const given = chunk.reduce((n, d) => n + d.given, 0);
		points.unshift(expected ? Math.round((given / expected) * 100) : null);
	}
	return points;
}

// Figures for a period across the given residents: totals, one row per day, and per resident
function periodStats(residents, meds, doses, entries, from, to) {
	const days = daysBetween(from, to);
	const blank = () => ({ expected: 0, given: 0, refused: 0, missed: 0, not_recorded: 0, due: 0, recorded: 0, on_time: 0, incidents: 0, visits: 0, entries: 0 });
	const daily = Object.fromEntries(days.map(d => [d, { date: d, ...blank() }]));
	const totals = blank();
	const kept = care.current(entries).filter(e => { const d = local(e.at).date; return d >= from && d <= to; });
	const perResident = {};
	const unwell = new Set();
	const moods = {};
	const incidentKinds = {};
	const byMedicine = {};
	for (const r of residents) perResident[String(r._id)] = { ...blank(), daily: Object.fromEntries(days.map(d => [d, { expected: 0, given: 0 }])), unwell_days: 0 };

	for (const r of residents) {
		const id = String(r._id);
		const slots = care.doseSlots(meds.filter(m => String(m.resident) === id), doses.filter(d => String(d.resident) === id), from, to);
		for (const sl of slots) {
			const buckets = [totals, daily[sl.date], perResident[id]];
			if (sl.status === 'due' || sl.status === 'late') { for (const b of buckets) b.due++; continue; }
			for (const b of buckets) { b.expected++; b[sl.status]++; }
			const med = byMedicine[sl.medication.name] = byMedicine[sl.medication.name] || { name: sl.medication.name, expected: 0, given: 0, refused: 0, missed: 0, not_recorded: 0, residents: new Set() };
			med.expected++;
			med[sl.status]++;
			med.residents.add(id);
			perResident[id].daily[sl.date].expected++;
			if (sl.status === 'given') perResident[id].daily[sl.date].given++;
			if (sl.entry) {
				const late = Math.abs(new Date(sl.entry.at) - instant(sl.date, sl.time)) / 60000;
				for (const b of buckets) { b.recorded++; if (late <= ON_TIME_MIN) b.on_time++; }
			}
		}
	}
	for (const e of kept) {
		const d = local(e.at).date;
		const id = String(e.resident);
		const buckets = [totals, daily[d], perResident[id]].filter(Boolean);
		for (const b of buckets) b.entries++;
		if (e.type === 'incident') {
			for (const b of buckets) b.incidents++;
			incidentKinds[e.incident?.kind || 'other'] = (incidentKinds[e.incident?.kind || 'other'] || 0) + 1;
		}
		if (e.type === 'visit') for (const b of buckets) b.visits++;
		if (e.type === 'wellbeing') {
			if (e.wellbeing?.unwell) unwell.add(`${id}|${d}`);
			if (e.wellbeing?.mood) moods[e.wellbeing.mood] = (moods[e.wellbeing.mood] || 0) + 1;
		}
	}
	for (const key of unwell) { const id = key.split('|')[0]; if (perResident[id]) perResident[id].unwell_days++; }
	const rate = (b) => ({ ...b, completion: pct(b.given, b.expected), on_time_rate: pct(b.on_time, b.recorded) });
	return {
		totals: { ...rate(totals), unwell_days: unwell.size, residents_unwell: new Set([...unwell].map(k => k.split('|')[0])).size },
		daily: days.map(d => rate(daily[d])),
		perResident,
		moods,
		incidentKinds,
		medicines: Object.values(byMedicine).map(m => ({ ...m, residents: m.residents.size, completion: pct(m.given, m.expected) })),
		kept,
	};
}

//@routes GET api/care/report?from&to
//@desc Care analytics for the home (admin): totals against the previous period of the
// same length, one row per day, per resident (with a daily trend), incidents by kind,
// moods, staff activity and the incident list
router.get('/report', auth, staffOnly(['admin']), async (req, res) => {
	const range = rangeOf(req.query);
	if (range.error) return fail(res, 400, range.error);
	try {
		const length = daysBetween(range.from, range.to).length;
		const prev = { from: addDays(range.from, -length), to: addDays(range.from, -1) };
		const residents = await Users.find({ role: 'client', status: { $ne: 'in-active' } }).select('-password').sort({ first_name: 1, last_name: 1 });
		const ids = residents.map(r => r._id);
		const [meds, doses, entries] = await Promise.all([
			medsFor(ids),
			doseEntriesFor(ids, prev.from, range.to),
			CareEntries.find({ resident: { $in: ids }, at: { $gte: instant(prev.from), $lt: range.end } }).lean(),
		]);
		const now = periodStats(residents, meds, doses, entries, range.from, range.to);
		const before = periodStats(residents, meds, doses, entries, prev.from, prev.to);

		const rows = residents.map(r => {
			const p = now.perResident[String(r._id)];
			return {
				_id: r._id,
				name: care.name(r),
				scheduled: p.expected + p.due,
				given: p.given, refused: p.refused, missed: p.missed, not_recorded: p.not_recorded, due: p.due,
				completion: pct(p.given, p.expected) === null ? null : Math.round(pct(p.given, p.expected)),
				on_time_rate: pct(p.on_time, p.recorded),
				incidents: p.incidents, visits: p.visits, entries: p.entries, unwell_days: p.unwell_days,
				trend: trendPoints(Object.values(p.daily)),
			};
		});
		const t = now.totals;
		const totals = {
			scheduled: t.expected + t.due, given: t.given, refused: t.refused, missed: t.missed, not_recorded: t.not_recorded, due: t.due,
			incidents: t.incidents, visits: t.visits, entries: t.entries,
			completion: t.completion === null ? null : Math.round(t.completion),
			completion_exact: t.completion, on_time_rate: t.on_time_rate, unwell_days: t.unwell_days, residents_unwell: t.residents_unwell,
		};
		const b = before.totals;
		const caregivers = {};
		for (const e of now.kept) {
			const who = e.author?.name || 'Unknown';
			caregivers[who] = caregivers[who] || { name: who, role: e.author?.role, entries: 0, doses: 0 };
			caregivers[who].entries++;
			if (e.type === 'dose') caregivers[who].doses++;
		}
		const kinds = [...new Set([...Object.keys(now.incidentKinds), ...Object.keys(before.incidentKinds)])];
		const names = Object.fromEntries(residents.map(r => [String(r._id), care.name(r)]));
		res.send({
			status: true,
			data: {
				from: range.from,
				to: range.to,
				days: length,
				residents: rows,
				totals,
				previous: {
					from: prev.from, to: prev.to,
					totals: { completion: b.completion, on_time_rate: b.on_time_rate, refused: b.refused, missed: b.missed, not_recorded: b.not_recorded, incidents: b.incidents, visits: b.visits, entries: b.entries, unwell_days: b.unwell_days, expected: b.expected, given: b.given },
					daily: before.daily.map(d => ({ date: d.date, completion: d.completion })),
				},
				daily: now.daily,
				incidents_by_kind: kinds.map(k => ({ kind: k, count: now.incidentKinds[k] || 0, previous: before.incidentKinds[k] || 0 })).sort((x, y) => y.count - x.count),
				moods: now.moods,
				// which medicines are refused or missed most: candidates for a GP medication review
				medicines: now.medicines.sort((x, y) => (y.refused + y.missed) - (x.refused + x.missed) || x.name.localeCompare(y.name)),
				caregivers: Object.values(caregivers).sort((x, y) => y.entries - x.entries),
				incidents: now.kept.filter(e => e.type === 'incident').sort((x, y) => y.at - x.at)
					.map(e => ({ _id: e._id, at: e.at, resident: names[String(e.resident)], ...e.incident, note: e.note, author: e.author?.name })),
			},
		});
	} catch (err) { oops(res, err); }
});

module.exports = router;
