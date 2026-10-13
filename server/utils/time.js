// Dates and times in the care home's own time zone. Medicine times ("08:00") are
// local times, while the server runs in UTC.
const TZ = process.env.HOME_TIMEZONE || 'Europe/London';
const parts = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// { date: 'YYYY-MM-DD', time: 'HH:MM' } for an instant, in the home's time zone
function local(d = new Date()) {
	const p = Object.fromEntries(parts.formatToParts(new Date(d)).map(x => [x.type, x.value]));
	return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

// The instant at which it is `time` on `date` in the home's time zone
function instant(date, time = '00:00') {
	const guess = new Date(`${date}T${time}:00Z`);
	const l = local(guess);
	return new Date(guess.getTime() - (Date.parse(`${l.date}T${l.time}:00Z`) - guess.getTime()));
}

const addDays = (date, n) => {
	const d = new Date(date + 'T12:00:00Z');
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
};
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

module.exports = { TZ, local, instant, addDays, minutes, DATE, TIME };
