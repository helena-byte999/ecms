const express = require('express');
const router = express.Router();
const { auth, requireRole, selfOrAdmin } = require('../../middleware/auth');
// Invoice
const Invoices = require('../../models/Invoice');
const { searchFilter, pageOf, sortOf, collation } = require('../../utils/search');

const INVOICE_SORTS = {
	client: [['email', 1]],
	description: [['description', 1]],
	date: [['date_created', 1]],
	amount: [['amount', 1]],
};
const NEWEST = { date_created: -1 };

router.post('/add_invoice', auth, requireRole('admin'), async (req, res) => {
	const newInvoice = new Invoices(req.body);
	try {
		const invoice = await newInvoice.save();
		if (invoice) {
			res.status(200).send({ 'status': true, message: "Invoice created successfully.", data: invoice });
		} else {
			res.json({ 'status': false, 'reason': "Error Creating Invoice" });
		}
	} catch (err) {
		console.log(err);
		res.json({ 'status': false, 'reason': "Server Error" });;
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
router.patch('/update_invoice', auth, requireRole('admin'), async (req, res) => {
	try {
		const services = await Invoices.findByIdAndUpdate(req.body._id, req.body);
		if (!services) { return res.status(400).send({ status: false, error: 'Problem with the update query' }) };

		res.status(200).send({ status: true, msg: "Invoice updated successfully" });

	} catch (err) {
		console.log(err);
		console.error(err);
		res.status(400).json({ msg: 'Something went wrong. Please try again.' });
	}
});



module.exports = router;