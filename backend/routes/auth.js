const express = require('express');
const router = express.Router();
const { createUser, getUserByEmail, getUserById } = require('../db/queries');
const { hashPassword, comparePassword, generateToken, authenticateToken } = require('../utils/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already taken.' });
        }

        const hashedPassword = await hashPassword(password);
        const userId = await createUser(email, hashedPassword);

        const token = generateToken({ user_id: userId, email });

        res.status(201).json({
            message: 'User created successfully.',
            token,
            user: { user_id: userId, email }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = generateToken(user);
        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { user_id: user.user_id, email: user.email }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to log in.' });
    }
});

// GET /api/auth/me (Get current user)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.user_id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json({ user: { user_id: user.user_id, email: user.email } });
    } catch (err) {
        console.error('Me endpoint error:', err);
        res.status(500).json({ error: 'Failed to retrieve user data.' });
    }
});

module.exports = router;
