const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Person = new Schema({ id: Schema.Types.ObjectId, name: String }, { _id: false });

// A medicine on a resident's list. Medicines are stopped, never deleted, so the
// history of what someone was taking stays visible.
const MedicationSchema = new Schema({
    resident: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    dose: { type: String, required: true, trim: true },
    // "HH:MM" in the care home's time zone; empty for "as needed" medicines
    times: [String],
    as_needed: { type: Boolean, default: false },
    instructions: String,
    reason: String,
    start_date: { type: String, required: true }, // YYYY-MM-DD
    end_date: String,                             // last day of a course, if any
    status: { type: String, enum: ['active', 'stopped'], default: 'active' },
    added_by: Person,
    added_at: { type: Date, default: Date.now },
    stopped_by: Person,
    stopped_at: Date,
    stop_reason: String,
    visit: { type: Schema.Types.ObjectId }, // the doctor's visit that started it
});

module.exports = mongoose.model('Medications', MedicationSchema);
