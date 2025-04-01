require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const nodemailer = require('nodemailer'); // New: Explicitly import nodemailer

// Models and Routes
const User = require('./models/User');
const Contact = require('./models/Contact');
const orderRoutes = require('./routes/orders');
const postRoutes = require('./routes/posts');
const contactRoutes = require('./routes/contact');

// Initialize Express
const app = express();

// Ensure uploads directory and default files
const uploadsDir = path.join(__dirname, 'uploads');
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('Uploads directory ensured:', uploadsDir);

    const placeholderImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/iglAAAAAElFTkSuQmCC',
      'base64'
    );

    const defaultAvatar = path.join(uploadsDir, 'default-avatar.jpg');
    const placeholder = path.join(uploadsDir, 'placeholder.jpg');

    await Promise.all([
      fs.stat(defaultAvatar).catch(async () => {
        await fs.writeFile(defaultAvatar, placeholderImage);
        console.log('Created default-avatar.jpg');
      }),
      fs.stat(placeholder).catch(async () => {
        await fs.writeFile(placeholder, placeholderImage);
        console.log('Created placeholder.jpg');
      }),
    ]);
  } catch (err) {
    console.error('Failed to set up uploads directory or files:', err);
  }
};
ensureUploadsDir();

// Rate Limit Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests in prod, 1000 in dev
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}. Requests: ${req.rateLimit.current}/${req.rateLimit.limit}`);
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000), // Seconds until reset
    });
  },
});
app.use(limiter); // Apply globally

// Middleware
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Serve static files with explicit CORS headers
app.use('/uploads', (req, res, next) => {
  const origin = req.get('Origin') || 'http://localhost:5173';
  console.log(`Serving ${req.path} to ${origin} from ${req.ip}`);
  res.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  express.static(uploadsDir)(req, res, next);
}, (req, res) => {
  console.warn(`File not found: ${req.path}`);
  res.status(404).json({ error: 'File not found' });
});

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  RateLimitMax: process.env.NODE_ENV === 'production' ? 100 : 1000,
  PORT: process.env.PORT || 5001,
  EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set', // New: Check email config
  EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set', // New: Check email config
});

// Authentication route: Login (No hashing)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || password !== user.password) {
      console.log('Login failed for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || '8f62a3b2c5e9d1f7a8b4c3d2e1f5a9b8',
      { expiresIn: '1h' }
    );
    console.log('Login successful for:', user.email);
    res.json({ token, isAdmin: user.isAdmin, email: user.email });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Admin status check
const { checkAdminStatus } = require('./middleware/authenticateAdmin');
app.get('/api/auth/check-admin', checkAdminStatus);

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

// MongoDB Connection
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not defined in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected to', process.env.MONGO_URI.replace(/\/\/.*@/, '//[credentials]@'));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};
connectDB();

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  res.status(500).json({ error: 'Internal server error', details: err.message });
});