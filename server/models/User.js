const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContractSchema = new Schema(
    {
        start_date: {
            type: String,
            required: [true, 'Start Date is required!']
        },
        end_date: {
            type: String,
            required: [true, 'End Date is required!']
        },
        description: {
            type: String
        }
    }
);

const NextOfKinSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Next of kins name is required!']
        },
        phone: {
            type: String,
            required: [true, 'Next of kins phone number is required!']
        },
        address: {
            type: String,
            required: [true, 'Next of kins address is required!']
        },
        relationship: {
            type: String,
            required: [true, 'Next of kins role is required!']
        },
    }
);
const EmergencyContactSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Emergency Contact name is required!']
        },
        phone: {
            type: String,
            required: [true, 'Emergency Contact phone number is required!']
        },
        address: {
            type: String,
            required: [true, 'Emergency Contact address is required!']
        },
        relationship: {
            type: String,
            required: [true, 'Emergency Contact role is required!']
        },
    }
);


// Family members only need contact details; everyone else needs the full record
function notFamily() { return this.role !== 'family'; }

const UserSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Email is required!']
    },
    first_name: {
        type: String,
        required: [true, 'First name is required!']
    },
    last_name: {
        type: String,
        required: [true, 'Last name is required!']
    },
    dob: {
        type: String,
        required: [notFamily, 'Date of birth is required!']
    },
    role: {
        type: String,
    },
    description: {
        type: String,
    },
    address: {
        type: String,
        required: [notFamily, 'Address is required!']
    },
    phone: {
        type: String,
        required: [true, 'Phone is required!']
    },
    status: { type: String, default: "active" },
    staff_type: { type: String, default: "Permanent" },
    Medical: {},
    password: {
        type: String,
        required: [true, 'Password!']
    },
    date_created: {
        type: Date,
        default: Date.now
    },
    Contracts: [ContractSchema],
    // family members: the resident (a client) they can see, and how they're related
    resident: { type: Schema.Types.ObjectId, ref: 'Users' },
    relationship: { type: String },
    NextOfKin: NextOfKinSchema,
    EmergencyContact: EmergencyContactSchema
});


module.exports = mongoose.model('Users', UserSchema);
