// Creates the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet.
// Accounts can only be created by an admin, so this is how the very first one gets made.
const bcrypt = require('bcryptjs');
const Users = require('./models/User');

module.exports = (mongoose) => {
	mongoose.connection.once('open', async () => {
		const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
		if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
		try {
			if (await Users.exists({ role: 'admin' })) return;
			const salt = await bcrypt.genSalt(10);
			await Users.create({
				email: ADMIN_EMAIL,
				first_name: 'Admin',
				last_name: 'User',
				dob: '1990-01-01',
				role: 'admin',
				address: 'N/A',
				phone: 'N/A',
				password: await bcrypt.hash(ADMIN_PASSWORD, salt)
			});
			console.log(`Admin account created for ${ADMIN_EMAIL}`);
		} catch (err) {
			console.log(err);
		}
	});
};
