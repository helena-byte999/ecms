const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();
// Users Model
const User = require('../../models/User');
const demo = require('../../demo');
// getting the auth middleware
const { auth } = require('../../middleware/auth');


let FrontEnd = "";
const port = process.env.PORT || process.env.LocalPort;
{ process.env.LocalPort === port ? FrontEnd = process.env.FrontEndHost : FrontEnd = process.env.FrontEndHostProduction; }

// Slow down password guessing: limited sign-in attempts per IP per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { msg: 'Too many sign-in attempts. Please wait a few minutes and try again.', auth: false },
});

//@routes POST api/auth
//@desc Authenticate user
//@access Public
router.post('/', loginLimiter, async (req, res) => {
    const { email, password } = req.body; // object destucturing

    //Simple Validation
    if (!email || !password) {
        return res.status(400).send({ msg: 'Please enter all fields', auth: false });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).send({ msg: 'Incorrect email or password.', auth: false });
        if (user.status === 'in-active') {
            return res.status(403).send({ msg: 'This account has been deactivated. Please contact your care administrator.', auth: false });
        }
        // residents are records, not logins; their family members have their own accounts
        if (user.role === 'client') {
            return res.status(403).send({ msg: "Residents don't sign in themselves. Family members have their own login: ask the care home for one.", auth: false });
        }

        //Validating Password
        const isMatch = await bcrypt.compare(password, user.password); //comparing passwords
        if (!isMatch) {
            return res.status(401).send({ msg: 'Incorrect email or password.', auth: false });
        };
        //isMatch is true
        const token = jwt.sign({ id: user.id }, process.env.jwtSecret, { expiresIn: 86400 });
        res.status(200).send({ 'auth': true, token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Something went wrong. Please try again.', auth: false });
    }
});


//@routes POST api/auth/demo
//@desc One-click sign-in to a demo account ({ role: admin | caregiver | family }), demo mode only
//@access Public
router.post('/demo', loginLimiter, async (req, res) => {
    if (!demo.enabled()) return res.status(404).send({ msg: 'Demo mode is off.', auth: false });
    const email = demo.SIGN_IN_ROLES.includes(req.body.role) && demo.ACCOUNTS[req.body.role];
    if (!email) return res.status(400).send({ msg: 'Choose admin, caregiver or family.', auth: false });
    try {
        let user = await User.findOne({ email });
        // demo data missing (e.g. a fresh database): seed it now
        if (!user) {
            await demo.resetDemoData();
            user = await User.findOne({ email });
        }
        const token = jwt.sign({ id: user.id }, process.env.jwtSecret, { expiresIn: 86400 });
        res.status(200).send({ auth: true, token, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Something went wrong. Please try again.', auth: false });
    }
});


//@routes POST api/auth/change_password
//@desc Change your own password: { current_password, new_password }
//@access Private (rate-limited like sign-in, since it checks a password)
router.post('/change_password', loginLimiter, auth, async (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).send({ status: false, msg: 'Enter your current and new password.' });
    if (String(new_password).length < 8) return res.status(400).send({ status: false, msg: 'New password must be at least 8 characters.' });
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.status === 'in-active') return res.status(403).send({ status: false, msg: 'Account unavailable.' });
        if (demo.enabled() && demo.isDemoAccount(user)) {
            return res.status(403).send({ status: false, msg: "Demo accounts keep their password so the next visitor can sign in." });
        }
        if (!(await bcrypt.compare(String(current_password), user.password))) {
            return res.status(400).send({ status: false, msg: 'Your current password is incorrect.' });
        }
        if (await bcrypt.compare(String(new_password), user.password)) {
            return res.status(400).send({ status: false, msg: 'Choose a password different from your current one.' });
        }
        user.password = await bcrypt.hash(String(new_password), 10);
        await user.save();
        res.status(200).send({ status: true, msg: 'Password changed.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, msg: 'Something went wrong. Please try again.' });
    }
});


//@routes GET api/auth/user
//@desc Get user data
//@access Private
// Family members also get the resident they're linked to, which their pages show
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').lean();
        // a deactivated account loses access even with a token that hasn't expired yet
        if (!user || user.status === 'in-active' || user.role === 'client') return res.status(403).json({ msg: 'Account unavailable.' });
        if (user.role === 'family') {
            user.resident = await User.findOne({ _id: user.resident, role: 'client' }).select('first_name last_name email').lean();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});


module.exports = router; 
