require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// Render and Vercel sit behind a proxy; this lets rate limiting see the real client IP
app.set('trust proxy', 1);

//Middlewares
// security headers; the API is called cross-origin from the frontend, so allow that
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());
app.use(cookieParser());
app.use(
	cors({
		origin: ["http://localhost:3000", process.env.FrontEndHostProduction].filter(Boolean),
		credentials: true
	})
);

//db connection
const connection = require('./db');
require('./seedAdmin')(connection);
require('./demo').start(connection);

// Health check for the host (Render) and uptime monitors
app.get('/api/health', (req, res) => {
	const db = ['disconnected', 'connected', 'connecting', 'disconnecting'][connection.connection.readyState] || 'unknown';
	res.status(db === 'connected' ? 200 : 503).send({ status: db === 'connected', db });
});

//Routes
app.use('/api/user', require('./routes/api/user'));
app.use('/api/invoice', require('./routes/api/invoice'));
app.use('/api/schedule', require('./routes/api/schedule'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/care', require('./routes/api/care'));


const PORT = process.env.PORT || process.env.LocalPort;

const server = app.listen(PORT, () => console.log(`Server started at port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
	console.log(`Logged Error: ${err}`);
	server.close(() => process.exit(1));
});
