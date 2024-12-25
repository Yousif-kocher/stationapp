const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./db'); // Import the connectDB function

dotenv.config();

const secretKey = process.env.JWT_SECRET;
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyparser.json());
app.use(express.json());

// Initialize db connection variable
let db;

// Connect to the database before starting the server
connectDB()
  .then((connection) => {
    db = connection; // Store the db connection

    // Start the server after the database connection is established
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1); // Exit the process if the DB connection fails
  });

// Middleware to authenticate JWT
function authenticateJWT(req, res, next) {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired token." });
        }
        req.user = user; // Store user information in the request for further use
        next();
    });
}


// Login API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.valid) {
            return res.status(401).json({ success: false, message: 'Account not valid' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            success: true,
            message: 'Authentication successful',
            token: token,
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Error during login' });
    }
});

// Register user API
app.post('/api/register', async (req, res) => {
    const { username, password, fullname, station } = req.body;

    try {
        if (!username || !password || !fullname || !station) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query('INSERT INTO users (username, password, fullname, station, valid) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, fullname, station, false]);

        res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Error during registration" });
    }
});

// Report submission API
app.post('/api/report', authenticateJWT, async (req, res) => {
    const { total_receipt, total_violation_truck, total_overload_weight, total_tax, fullname, station, report_date } = req.body;

    try {
        if (!total_receipt || !total_violation_truck || !total_overload_weight || !total_tax || !fullname || !station || !report_date) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const [result] = await db.query(
            'INSERT INTO report (total_receipt, total_income, total_violation_truck, total_overload_weight, total_tax, fullname, station, report_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                total_receipt,
                total_receipt * 5000,
                total_violation_truck,
                total_overload_weight,
                total_tax,
                fullname,
                station,
                report_date
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
        });
    } catch (error) {
        console.error('Error during report submission:', error);
        res.status(500).json({ success: false, message: 'Error during report submission' });
    }
});
// User info API
app.get('/api/userinfo', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId; // From the JWT token

        const [users] = await db.execute('SELECT fullname, station FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        res.status(200).json({
            success: true,
            user: {
                fullname: user.fullname,
                station: user.station,
            },
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ success: false, message: 'Error fetching user information' });
    }
});

