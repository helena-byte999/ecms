// Care records: input checks, the dose schedule and report figures.
const { local, addDays, minutes, DATE, TIME } = require('./time');

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
const EATEN = ['all', 'most', 'half', 'little', 'none'];
const CARE_TASKS = ['wash', 'shower', 'dress', 'oral_care', 'continence', 'reposition', 'hair', 'nails', 'skin_check'];
const MOODS = ['content', 'settled', 'low', 'anxious', 'agitated', 'drowsy'];
const INCIDENTS = ['fall', 'injury', 'skin', 'behaviour', 'medication', 'other'];
const SEVERITY = ['minor', 'moderate', 'serious'];
const OUTCOMES = ['given', 'refused', 'missed'];
// A dose not recorded this long after its time shows as "late"
const LATE_AFTER_MIN = 60;

const text = (v, max) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const name = (u) => `${u.first_name} ${u.last_name}`;
const author = (u) => ({ id: u._id, name: name(u), role: u.role });

// Checks a medicine from a form; returns { error } or { data }
function medicineInput(body, today) {
	const data = {
		name: text(body.name, 80),
		dose: text(body.dose, 60),
		instructions: text(body.instructions, 200),
		reason: text(body.reason, 120),
		as_needed: !!body.as_needed,
		start_date: body.start_date || today,
		end_date: body.end_date || undefined,
	};
	if (!data.name) return { error: 'Enter the medicine name.' };
	if (!data.dose) return { error: `Enter the dose for ${data.name}.` };
	const times = Array.isArray(body.times) ? [...new Set(body.times.map(String))].sort() : [];
	if (data.as_needed) data.times = [];
	else {
		if (!times.length) return { error: `Add at least one time of day for ${data.name}, or mark it "as needed".` };
		if (times.length > 6 || !times.every(t => TIME.test(t))) return { error: 'Times must be like 08:00, up to six a day.' };
		data.times = times;
	}
	if (!DATE.test(data.start_date)) return { error: 'Start date must be a valid date.' };
	if (data.end_date && (!DATE.test(data.end_date) || data.end_date < data.start_date)) {
		return { error: 'End date must be on or after the start date.' };
	}
	return { data };
}

// Checks a care entry (not a dose or visit) from a form; returns { error } or { data }
function entryInput(body) {
	const type = body.type;
	const data = { type, note: text(body.note, 1000) };
	const pick = (v, list) => (list.includes(v) ? v : null);
	if (type === 'meal') {
		const m = body.meal || {};
		const meal = pick(m.meal, MEALS);
		if (!meal) return { error: 'Choose which meal or drink.' };
		const eaten = meal === 'drink' ? undefined : pick(m.eaten, EATEN);
		if (meal !== 'drink' && !eaten) return { error: 'Choose how much was eaten.' };
		const ml = m.drink_ml === undefined || m.drink_ml === '' ? undefined : Number(m.drink_ml);
		if (ml !== undefined && !(ml >= 0 && ml <= 3000)) return { error: 'Drink must be between 0 and 3000 ml.' };
		data.meal = { meal, eaten, drink_ml: ml };
	} else if (type === 'care') {
		const tasks = (Array.isArray(body.care?.tasks) ? body.care.tasks : []).filter(t => CARE_TASKS.includes(t));
		if (!tasks.length) return { error: 'Tick at least one personal care task.' };
		data.care = { tasks: [...new Set(tasks)] };
	} else if (type === 'wellbeing') {
		const w = body.wellbeing || {};
		const temp = w.temperature === undefined || w.temperature === '' ? undefined : Number(w.temperature);
		if (temp !== undefined && !(temp >= 34 && temp <= 43)) return { error: 'Temperature must be between 34 and 43 °C.' };
		const mood = w.mood ? pick(w.mood, MOODS) : undefined;
		if (w.mood && !mood) return { error: 'Choose a mood from the list.' };
		if (!mood && temp === undefined && !w.unwell && !data.note) return { error: 'Record a mood, a temperature or a note.' };
		data.wellbeing = { mood, temperature: temp, unwell: !!w.unwell };
	} else if (type === 'activity') {
		const activity = text(body.activity?.name, 80);
		if (!activity) return { error: 'Enter the activity.' };
		data.activity = { name: activity };
	} else if (type === 'incident') {
		const i = body.incident || {};
		const kind = pick(i.kind, INCIDENTS);
		const severity = pick(i.severity, SEVERITY);
		if (!kind) return { error: 'Choose what kind of incident it was.' };
		if (!severity) return { error: 'Choose how serious it was.' };
		if (!data.note) return { error: 'Describe what happened.' };
		data.incident = { kind, severity, action: text(i.action, 500), family_informed: !!i.family_informed };
	} else if (type === 'note') {
		if (!data.note) return { error: 'Write the note.' };
	} else {
		return { error: 'Choose a type of entry.' };
	}
	return { data };
}

// When it happened: defaults to now; can't be in the future or more than 7 days back
function whenInput(at, now = new Date()) {
	if (at === undefined || at === null || at === '') return { at: now };
	const d = new Date(at);
	if (Number.isNaN(d.getTime())) return { error: 'Enter a valid date and time.' };
	if (d.getTime() > now.getTime() + 5 * 60000) return { error: "That time is in the future." };
	if (d.getTime() < now.getTime() - 7 * 86400000) return { error: 'Entries can be back-dated by up to 7 days.' };
	return { at: d };
}

// Keeps only the newest version of each entry (corrections replace what they correct)
function current(entries) {
	const replaced = new Set(entries.filter(e => e.corrects).map(e => String(e.corrects)));
	return entries.filter(e => !replaced.has(String(e._id)));
}

const slotKey = (med, date, time) => `${med}|${date}|${time}`;
const stamp = (d) => { const l = local(d); return `${l.date} ${l.time}`; };

// Every scheduled dose of `meds` between `from` and `to` (inclusive, local dates),
// with its status: given / refused / missed (recorded), due, late or not_recorded,
// and with { upcoming: true } also 'upcoming' for the rest of today.
// An unrecorded dose only counts from when the medicine was added to ECMS until it
// was stopped; a recorded dose always counts.
function doseSlots(meds, doseEntries, from, to, now = new Date(), { upcoming = false } = {}) {
	const recorded = new Map();
	for (const e of current(doseEntries)) {
		if (e.dose?.time) recorded.set(slotKey(e.dose.medication, e.dose.date, e.dose.time), e);
	}
	const today = local(now);
	const nowMin = minutes(today.time);
	const slots = [];
	for (const m of meds) {
		if (m.as_needed) continue;
		const added = stamp(m.added_at || 0);
		const stopped = m.status === 'stopped' && m.stopped_at ? stamp(m.stopped_at) : null;
		for (let d = from; d <= to && d <= today.date; d = addDays(d, 1)) {
			if (d < m.start_date || (m.end_date && d > m.end_date)) continue;
			for (const t of m.times) {
				const key = `${d} ${t}`;
				const entry = recorded.get(slotKey(m._id, d, t)) || null;
				if (!entry && (key < added || (stopped && key >= stopped))) continue;
				const later = d === today.date && minutes(t) > nowMin;
				if (later && !entry && !upcoming) continue;
				let status = 'not_recorded';
				if (entry) status = entry.dose.outcome;
				else if (later) status = 'upcoming';
				else if (d === today.date) status = nowMin - minutes(t) > LATE_AFTER_MIN ? 'late' : 'due';
				slots.push({ medication: m, date: d, time: t, status, entry });
			}
		}
	}
	return slots;
}

function tallyDoses(slots) {
	const t = { scheduled: slots.length, given: 0, refused: 0, missed: 0, not_recorded: 0, due: 0 };
	for (const s of slots) {
		if (s.status === 'late' || s.status === 'due') t.due++;
		else t[s.status]++;
	}
	// completion: share of doses that should have been recorded by now that were given
	const expected = t.scheduled - t.due;
	t.completion = expected ? Math.round((t.given / expected) * 100) : null;
	return t;
}

module.exports = {
	MEALS, EATEN, CARE_TASKS, MOODS, INCIDENTS, SEVERITY, OUTCOMES,
	LATE_AFTER_MIN, text, name, author, medicineInput, entryInput, whenInput, current, doseSlots, tallyDoses,
};
