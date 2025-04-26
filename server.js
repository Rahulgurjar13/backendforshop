require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contact');
const { checkAdminStatus } = require('./middleware/authenticateAdmin');

// Validate environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'PHONEPE_MERCHANT_ID',
  'PHONEPE_SALT_KEY',
  'PHONEPE_SALT_INDEX',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CORS_ORIGINS',
  'BACKEND_URL',
  'FRONTEND_URL',
];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
const invalidEnvVars = [];

if (process.env.PHONEPE_SALT_INDEX && !/^\d+$/.test(process.env.PHONEPE_SALT_INDEX)) {
  invalidEnvVars.push('PHONEPE_SALT_INDEX must be a number (e.g., "1")');
}
if (process.env.CORS_ORIGINS && !process.env.CORS_ORIGINS.includes('https://www.nisargmaitri.in')) {
  invalidEnvVars.push('CORS_ORIGINS must include https://www.nisargmaitri.in');
}

if (missingEnvVars.length > 0 || invalidEnvVars.length > 0) {
  console.error(`❌ Environment variable errors:`);
  if (missingEnvVars.length > 0) {
    console.error(`  Missing: ${missingEnvVars.join(', ')}`);
  }
  if (invalidEnvVars.length > 0) {
    console.error(`  Invalid: ${invalidEnvVars.join('; ')}`);
  }
  process.exit(1);
}

// Initialize Express
const app = express();
app.set('trust proxy', 1);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    console.warn(
      `Rate limit exceeded for IP: ${req.ip}. Requests: ${req.rateLimit.current}/${req.rateLimit.limit}`
    );
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
});
app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          'https://api.phonepe.com',
          'https://api-testing.phonepe.com',
          'https://backendforshop.onrender.com',
          'https://www.nisargmaitri.in',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-VERIFY'],
    credentials: true,
  })
);

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip,
    headers: req.headers,
    body: req.body,
  });
  next();
});

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID ? 'Set' : 'Not set',
  PHONEPE_SALT_KEY: process.env.PHONEPE_SALT_KEY ? 'Set' : 'Not set',
  PHONEPE_SALT_INDEX: process.env.PHONEPE_SALT_INDEX ? 'Set' : 'Not set',
  EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
});

// Authentication route: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.warn('Missing login credentials:', { email, password: password ? 'Provided' : 'Missing' });
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || password !== user.password) {
      console.log(`Login failed for: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log(`Login successful for: ${user.email}`);
    res.status(200).json({ token, isAdmin: user.isAdmin, email: user.email });
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Admin status check
app.get('/api/auth/check-admin', checkAdminStatus);

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// MongoDB Connection with exponential backoff
const connectDB = async (retries = 5, delay = 5000) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(
      `✅ MongoDB connected to ${process.env.MONGO_URI.replace(/\/\/.*@/, '//[credentials]@')}`
    );
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (retries > 0) {
      console.log(`Retrying connection (${retries} attempts left)...`);
      setTimeout(() => connectDB(retries - 1, delay * 2), delay);
    } else {
      console.error('❌ Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};
connectDB();

// Start Server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', {
    message: err.message,
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS error', details: err.message });
  }
  res.status(500).json({ error: 'Internal server error', details: err.message });
});