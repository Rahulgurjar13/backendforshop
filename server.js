require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const orderRoutes = require('./routes/orders');
const { checkAdminStatus } = require('./middleware/authenticateAdmin');

// Initialize Express
const app = express();
app.set('trust proxy', 1);

// Rate Limit Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}. Requests: ${req.rateLimit.current}/${req.rateLimit.limit}`);
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: ['https://www.nisargmaitri.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  RateLimitMax: process.env.NODE_ENV === 'production' ? 100 : 1000,
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
});

// Authentication route: Login (plain text passwords)
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
      process.env.JWT_SECRET,
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
app.get('/api/auth/check-admin', checkAdminStatus);

// Routes
app.use('/api/orders', orderRoutes);

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
  res.status(500).json({ error: 'Internal server error', details: err.message });
});