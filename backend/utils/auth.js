const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for JWT (in production, strictly use an environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'fake-news-detector-super-secret-key-123';
const JWT_EXPIRES_IN = '7d'; // Token validity

/**
 * Hash a plain text password
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 * @param {object} user - User object containing id and email
 * @returns {string}
 */
function generateToken(user) {
    return jwt.sign(
        { user_id: user.user_id || user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Express middleware to verify JWT token and protect routes
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    authenticateToken,
};
