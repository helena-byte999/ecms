const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { Types } = Schema;

const ENTRY_TYPES = ['dose', 'meal', 'care', 'wellbeing', 'activity', 'incident', 'note', 'visit'];

const Author = new Schema({ id: Types.ObjectId, name: String, role: String }, { _id: false });
const MedRef = new Schema({ id: Types.ObjectId, name: String, dose: String, reason: String }, { _id: false });
const Change = new Schema({ field: String, from: String, to: String }, { _id: false });

// One thing that happened in a resident's care. Entries are never edited or
// deleted: a mistake is fixed by a new entry whose `corrects` points at the old one.
const CareEntrySchema = new Schema({
    resident: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    type: { type: String, enum: ENTRY_TYPES, required: true },
    at: { type: Date, required: true, index: true }, // when it happened
    author: Author,
    note: String,
    dose: {
        medication: Types.ObjectId,
        name: String,
        dose: String,
        date: String, // YYYY-MM-DD, local
        time: String, // scheduled "HH:MM"; empty for an "as needed" dose
        outcome: { type: String, enum: ['given', 'refused', 'missed'] },
    },
    meal: { meal: String, eaten: String, drink_ml: Number },
    care: { tasks: [String] },
    wellbeing: { mood: String, temperature: Number, unwell: Boolean },
    incident: { kind: String, severity: String, action: String, family_informed: Boolean },
    activity: { name: String },
    visit: {
        professional: String,
        reason: String,
        outcome: String,
        follow_up: String,
        started: [MedRef],
        stopped: [MedRef],
        changes: [Change],
    },
    corrects: { type: Types.ObjectId, index: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CareEntries', CareEntrySchema);
module.exports.ENTRY_TYPES = ENTRY_TYPES;
