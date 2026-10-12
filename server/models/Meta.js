const mongoose = require('mongoose');

// Small key/value store for app bookkeeping (e.g. when the demo data was last reset)
const MetaSchema = new mongoose.Schema({
	key: { type: String, required: true, unique: true },
	value: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model('Meta', MetaSchema);
