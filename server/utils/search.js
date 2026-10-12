// Builds a case-insensitive "contains" filter over the given fields.
// The search text is escaped so it's matched literally, never as a regex.
function searchFilter(search, fields) {
	const text = typeof search === 'string' ? search.trim() : '';
	if (!text) return {};
	const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
	return { $or: fields.map((field) => ({ [field]: pattern })) };
}

// Page through results: ?current=N gives 10 per page, otherwise the first 100
function pageOf(query) {
	const current = parseInt(query.current, 10);
	if (current > 0) return { skip: (current - 1) * 10, take: 10 };
	return { skip: 0, take: 100 };
}

module.exports = { searchFilter, pageOf };
