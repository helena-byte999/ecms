const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();
// Users Model
const User = require('../../models/User');
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


//@routes GET api/auth/user
//@desc Get user data
//@access Private
router.get('/user', auth, (req, res) => {
    User.findById(req.user.id)
        .select('-password')
        .then(user => {
            // a deactivated account loses access even with a token that hasn't expired yet
            if (!user || user.status === 'in-active') return res.status(403).json({ msg: 'Account unavailable.' });
            res.json(user);
        })
        .catch(() => res.status(500).json({ msg: 'Server Error' }));
});


module.exports = router; 
