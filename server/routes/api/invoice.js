const express = require('express');
const router = express.Router();
const { auth, requireRole, selfOrAdmin } = require('../../middleware/auth');
// Invoice
const Invoices = require('../../models/Invoice');
const Users = require('../../models/User');
const { searchFilter, pageOf, sortOf, collation } = require('../../utils/search');

const INVOICE_SORTS = {
	client: [['email', 1]],
	description: [['description', 1]],
	date: [['date_created', 1]],
	amount: [['amount', 1]],
	status: [['status', 1], ['due_date', 1]],
	due: [['due_date', 1]],
};
const NEWEST = { date_created: -1 };

const INVOICE_FIELDS = ['amount', 'type', 'description', 'due_date', 'status'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Shared checks for create and update; returns an error message or null
function invoiceProblem(data) {
	if ('amount' in data && !(Number(data.amount) > 0)) return 'Amount must be more than 0.';
	if ('due_date' in data && data.due_date && !DATE.test(data.due_date)) return 'Due date must be a valid date.';
	if ('status' in data && !['paid', 'unpaid'].includes(data.status)) return 'Status must be paid or unpaid.';
	return null;
}

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

//@routes POST api/invoice/add_invoice
//@desc Raise an invoice for a client or caregiver (admin). Due in 14 days unless given.
router.post('/add_invoice', auth, requireRole('admin'), async (req, res) => {
	const data = { email: String(req.body.email || '').trim().toLowerCase() };
	for (const key of INVOICE_FIELDS) if (req.body[key] !== undefined && req.body[key] !== '') data[key] = req.body[key];
	if (!data.amount) return res.status(400).send({ status: false, msg: 'Enter an amount.' });
	const problem = invoiceProblem(data);
	if (problem) return res.status(400).send({ status: false, msg: problem });
	try {
		if (!(await Users.exists({ email: data.email }))) {
			return res.status(400).send({ status: false, msg: 'No person with that email. Check it, or add them first.' });
		}
		if (!data.due_date) data.due_date = inDays(14);
		if (data.status === 'paid') data.paid_at = new Date();
		const invoice = await new Invoices(data).save();
		res.status(200).send({ status: true, message: 'Invoice created successfully.', data: invoice });
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: false, msg: 'Something went wrong. Please try again.' });
	}
});


router.get('/show_invoices', auth, requireRole('admin'), async (req, res) => {
	try {
		const { skip, take } = pageOf(req.query);
		const filter = searchFilter(req.query.search, ['email', 'description', 'type']);
		const invoices = await Invoices.find(filter).sort(sortOf(req.query, INVOICE_SORTS, NEWEST)).collation(collation).skip(skip).limit(take);
		const count = await Invoices.countDocuments(filter);
		res.status(200).send({ status: true, data: invoices, count });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});

router.get('/show_invoice/:email', auth, selfOrAdmin, async (req, res) => {
	const { email } = req.params;
	try {
		const { skip, take } = pageOf(req.query);
		const filter = { email, ...searchFilter(req.query.search, ['description', 'type']) };
		const invoices = await Invoices.find(filter).sort(sortOf(req.query, INVOICE_SORTS, NEWEST)).collation(collation).skip(skip).limit(take);
		const count = await Invoices.countDocuments(filter);
		res.status(200).send({ status: true, data: invoices, count });

	} catch (err) {
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});


//@routes PUT api/update_service/
//@desc update service 
//@response - status: true or false | error
//@routes PATCH api/invoice/update_invoice
//@desc Edit an invoice or mark it paid / unpaid (admin). Body: { _id, ...fields }
router.patch('/update_invoice', auth, requireRole('admin'), async (req, res) => {
	const data = {};
	for (const key of INVOICE_FIELDS) if (req.body[key] !== undefined) data[key] = req.body[key];
	const problem = invoiceProblem(data);
	if (problem) return res.status(400).send({ status: false, msg: problem });
	try {
		const existing = await Invoices.findById(req.body._id);
		if (!existing) return res.status(404).send({ status: false, msg: 'Invoice not found.' });
		if (data.status === 'paid' && existing.status !== 'paid') data.paid_at = new Date();
		if (data.status === 'unpaid') data.paid_at = null;
		const invoice = await Invoices.findByIdAndUpdate(existing._id, data, { new: true });
		res.status(200).send({ status: true, msg: 'Invoice updated.', data: invoice });
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: false, msg: 'Something went wrong. Please try again.' });
	}
});



module.exports = router;