const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sanitize = require('sanitize-html');
const User = require('../models/User');
const { checkAdminStatus } = require('../middleware/authenticateAdmin');
const csurf = require('csurf');

// CSRF protection - Aligned with server.js
const csrfProtection = csurf({
  cookie: {
    key: '_csrf', // Explicitly set cookie name to match server.js
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
    maxAge: 3600000, // 1 hour
    path: '/', // Ensure cookie is available for all paths
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Skip CSRF for safe methods
});

// Apply CSRF selectively
router.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    console.log(`Skipping CSRF for ${req.method} ${req.path}`);
    return next();
  }
  console.log(
    `CSRF check for ${req.method} ${req.path}, token: ${req.headers['x-csrf-token'] || 'none'}, cookie: ${
      req.cookies._csrf || 'none'
    }, IP: ${req.ip}, Origin: ${req.headers.origin || 'none'}`
  );
  csrfProtection(req, res, next);
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sanitize inputs
    const sanitizedEmail = sanitize(email || '').toLowerCase().trim();
    const sanitizedPassword = sanitize(password || '').trim();

    // Validate inputs
    if (!sanitizedEmail || !sanitizedPassword) {
      console.warn('Missing login credentials', { email: sanitizedEmail, ip: req.ip });
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      console.warn('Invalid email format', { email: sanitizedEmail, ip: req.ip });
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (sanitizedPassword.length < 6) {
      console.warn('Password too short', { email: sanitizedEmail, ip: req.ip });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      console.warn(`Login failed: User not found for email ${sanitizedEmail}`, { ip: req.ip });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare plain text password (as per your request, no hashing)
    if (user.password !== sanitizedPassword) {
      console.warn(`Login failed: Incorrect password for email ${sanitizedEmail}`, { ip: req.ip });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Login successful for ${sanitizedEmail}`, { ip: req.ip, origin: req.headers.origin });
    res.status(200).json({
      token,
      isAdmin: user.isAdmin,
      email: user.email,
      success: true,
    });
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      path: req.path,
      ip: req.ip,
      origin: req.headers.origin,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Check admin status endpoint
router.get('/check-admin', checkAdminStatus);

// CSRF error handling
router.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN' || err.message.includes('invalid csrf token')) {
    console.error('CSRF Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      origin: req.headers.origin,
      cookies: req.cookies,
      headers: {
        'x-csrf-token': req.headers['x-csrf-token'] ? 'present' : 'missing',
        origin: req.headers.origin,
      },
    });
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Please refresh the page and try again',
      code: 'CSRF_ERROR',
    });
  }
  next(err);
});

module.exports = router;