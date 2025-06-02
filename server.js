require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const User = require('./models/User');
const Order = require('./models/order');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contact');
const { checkAdminStatus } = require('./middleware/authenticateAdmin');

// Validate environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CORS_ORIGINS',
  'BACKEND_URL',
  'FRONTEND_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`);
  process.exit(1);
}

// Validate MONGO_URI format
if (!process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MONGO_URI format. Must start with mongodb:// or mongodb+srv://');
  process.exit(1);
}

// Validate CORS_ORIGINS
const allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
if (!allowedOrigins.includes('https://www.nisargmaitri.in')) {
  console.error('❌ CORS_ORIGINS must include https://www.nisargmaitri.in');
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
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
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
          'https://backendforshop.onrender.com',
          'https://www.nisargmaitri.in',
          'https://api.razorpay.com',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip,
    headers: req.headers,
    body: req.method === 'POST' ? req.body : undefined,
  });
  next();
});

// Debug environment
console.log('Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
  EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ? 'Set' : 'Not set',
});

// Authentication route: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.warn('Missing login credentials');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
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
    console.error('Login error:', { message: error.message, stack: error.stack });
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

// Schedule cleanup of old pending orders
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await Order.deleteMany({
      paymentStatus: { $in: ['Pending', 'Failed'] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    console.log(`Cleaned up ${result.deletedCount} old pending/failed orders`);
  } catch (error) {
    console.error('Error cleaning up pending orders:', { message: error.message, stack: error.stack });
  }
});

// MongoDB Connection
const connectDB = async (retries = 5, delay = 5000) => {
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        family: 4, // Use IPv4 explicitly
      });
      console.log(`✅ MongoDB connected`);
      return; // Exit the loop on successful connection
    } catch (err) {
      console.error('❌ MongoDB connection error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
      });
      retries--;
      if (retries > 0) {
        console.log(`Retrying connection (${retries} attempts left)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        console.error('❌ Max retries reached. Server will continue running without MongoDB.');
        // Instead of exiting, allow the server to run
        return;
      }
    }
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => console.log('MongoDB connection established'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));

// Start MongoDB connection
connectDB();

// Start Server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚗 Server running on port ${PORT}`);
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', { message: err.message, stack: err.stack });
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', { message: err.message, stack: err.stack });
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