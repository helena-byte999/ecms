const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');

// User Model
const Users = require('../models/User');

function auth(req, res, next) {

    try {
        const token = req.headers.authorization;
        //check for token
        if (!token) { res.json({ status: false, msg: "No token, authorization denied" }); }
        else {
            //verify token
            const decoded = jwt.verify(token, process.env.jwtSecret);
            //add user from payload
            req.user = decoded;
            next();
        };

    } catch (e) {
        res.json({ status: false, msg: 'token is not valid' });
    }

}
async function authDetail(req, res, next) {

    try {
        const token = req.headers.authorization;
        //check for token
        if (!token) { res.status(401).send({ status: false, msg: "No token, authorization denied" }); }
        else {
            //verify token
            const decoded = await jwt.verify(token, process.env.jwtSecret);
            //add user from payload
            if (decoded.id) {
                const user = await Users.findById(decoded.id);
                req.user = user;
                next();
            } else {
                res.status(401).send({ status: false, msg: "Error Verifying Token, authorization denied" });
            }
        };

    } catch (e) {
        console.log(e);
        res.status(400).send({ msg: 'token is not valid' });
    }

}

// Use after auth: loads the logged-in user and only lets the listed roles through
function requireRole(...roles) {
    return async (req, res, next) => {
        try {
            const user = await Users.findById(req.user.id).select('-password');
            if (!user || user.status === 'in-active' || !roles.includes(user.role)) {
                return res.status(403).send({ status: false, msg: "You do not have permission to do this" });
            }
            req.currentUser = user;
            next();
        } catch (e) {
            res.status(500).send({ status: false, msg: "Server Error" });
        }
    };
}

// Use after auth on /:email routes: admins can see anyone, family members their
// resident, everyone else only themselves
async function selfOrAdmin(req, res, next) {
    try {
        const user = await Users.findById(req.user.id).select('-password');
        let allowed = user && user.status !== 'in-active' && (user.role === 'admin' || user.email === req.params.email);
        if (user && !allowed && user.role === 'family' && user.status !== 'in-active' && user.resident) {
            const resident = await Users.findById(user.resident).select('email');
            allowed = !!resident && resident.email === req.params.email;
        }
        if (!allowed) {
            return res.status(403).send({ status: false, msg: "You do not have permission to do this" });
        }
        req.currentUser = user;
        next();
    } catch (e) {
        res.status(500).send({ status: false, msg: "Server Error" });
    }
}

module.exports = { auth, authDetail, requireRole, selfOrAdmin };