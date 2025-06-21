const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sanitize = require('sanitize-html');
const { checkAdminStatus } = require('../middleware/authenticateAdmin');
const csurf = require('csurf');

// Apply CSRF protection explicitly
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
});

// Login endpoint
router.post('/login', csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sanitize inputs
    const sanitizedEmail = sanitize(email || '').toLowerCase().trim();
    const sanitizedPassword = sanitize(password || '').trim();

    // Validate inputs
    if (!sanitizedEmail || !sanitizedPassword) {
      console.warn('Missing login credentials', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      console.warn('Invalid email format', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (sanitizedPassword.length < 6) {
      console.warn('Password too short', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      console.warn(`Login failed: User not found for email ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare plain text password (as requested, not hashed)
    if (user.password !== sanitizedPassword) {
      console.warn(`Login failed: Incorrect password for email ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Login successful for ${sanitizedEmail}`);
    res.status(200).json({
      token,
      isAdmin: user.isAdmin,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Check admin status endpoint
router.get('/check-admin', checkAdminStatus);

module.exports = router;