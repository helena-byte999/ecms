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

// ?sort=key&order=asc|desc, where key must be one the list allows.
// `allowed` maps each key to [field, direction] pairs; direction -1 flips it
// (e.g. sorting by age ascending means date of birth descending).
// _id is added last so rows keep a stable order across pages.
function sortOf(query, allowed, fallback) {
	const fields = allowed[query.sort];
	if (!fields) return { ...fallback, _id: 1 };
	const dir = query.order === 'desc' ? -1 : 1;
	const sort = {};
	for (const [field, sign] of fields) sort[field] = dir * sign;
	return { ...sort, _id: 1 };
}

// Case-insensitive ordering for text fields
const collation = { locale: 'en', strength: 2 };

module.exports = { searchFilter, pageOf, sortOf, collation };
