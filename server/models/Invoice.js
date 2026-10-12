const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvoiceSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Email is required!']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required!']
    },
    type: {
        type: String,
    },
    description: {
        type: String,
    },
    // YYYY-MM-DD; "overdue" = unpaid and past this date (worked out when displayed)
    due_date: {
        type: String,
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    paid_at: {
        type: Date
    },
    date_created: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('Invoices', InvoiceSchema);
