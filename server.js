require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const Order = require('./models/order');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contact');

// Validate environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SUPPORT_EMAIL',
  'CORS_ORIGINS',
  'BACKEND_URL',
  'FRONTEND_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

if (!process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MONGO_URI format');
  process.exit(1);
}

const allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
if (!allowedOrigins.includes('https://www.nisargmaitri.in')) {
  console.error('❌ CORS_ORIGINS must include https://www.nisargmaitri.in');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// Store SSE clients
global.clients = new Set();

// Environment-specific settings
const isProduction = process.env.NODE_ENV === 'production';
const cookieSecure = isProduction; // Secure cookies only in production (HTTPS)
const cookieSameSite = isProduction ? 'None' : 'Lax'; // None for cross-origin in production, Lax for localhost

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 1000,
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", !isProduction ? "'unsafe-inline'" : null].filter(Boolean),
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          process.env.BACKEND_URL,
          process.env.FRONTEND_URL,
          'https://api.razorpay.com',
          isProduction ? 'https://backendforshop.onrender.com' : null,
          isProduction ? 'https://www.nisargmaitri.in' : null,
          !isProduction ? 'http://localhost:5001' : null,
          !isProduction ? 'http://localhost:3000' : null,
        ].filter(Boolean),
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      console.log(`CORS check for origin: ${origin || 'none'}`);
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        callback(null, true);
      } else {
        callback(new Error(`CORS error: Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    exposedHeaders: ['Vary'],
  })
);

// Add Vary: Origin header to prevent CORS caching issues
app.use((req, res, next) => {
  res.set('Vary', 'Origin');
  next();
});

// CSRF protection
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
  },
});
app.use((req, res, next) => {
  // Skip CSRF for GET, order-updates, and optionally DELETE (if authenticated)
  if (
    req.path === '/api/order-updates' ||
    req.method === 'GET' ||
    (req.method === 'DELETE' && req.path.startsWith('/api/orders/') && req.headers.authorization)
  ) {
    return next();
  }
  console.log(
    `CSRF check for ${req.method} ${req.path}, token: ${req.headers['x-csrf-token'] || 'none'}, cookie: ${
      req.cookies._csrf || 'none'
    }`
  );
  csrfProtection(req, res, next);
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  console.log(
    `Generated CSRF token: ${token}, Set-Cookie: _csrf=${req.cookies._csrf || 'new'}, IP: ${req.ip}, Origin: ${
      req.headers.origin || 'none'
    }`
  );
  res.json({ csrfToken: token });
});

// SSE endpoint for order updates
app.get('/api/order-updates', async (req, res) => {
  const token = req.query.token;
  if (!token) {
    console.warn(`No token provided for SSE at /api/order-updates, IP: ${req.ip}`);
    return res.status(401).send('Unauthorized');
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.warn(`Invalid SSE token: ${err.message}, IP: ${req.ip}`);
    return res.status(401).send('Invalid token');
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const client = { id: Date.now(), res };
  global.clients.add(client);

  res.write('data: {"type": "connected"}\n\n');

  req.on('close', () => {
    global.clients.delete(client);
    console.log(`Client ${client.id} disconnected`);
  });
});

// Request logging with masked sensitive data
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip,
    headers: {
      authorization: req.headers.authorization ? 'Bearer <hidden>' : undefined,
      'x-csrf-token': req.headers['x-csrf-token'] ? '<hidden>' : undefined,
    },
    body: ['POST', 'PUT'].includes(req.method)
      ? {
          ...req.body,
          customer: req.body.customer
            ? { ...req.body.customer, email: req.body.customer.email?.replace(/(.{2}).*@/, '$1***@') }
            : undefined,
        }
      : undefined,
  });
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Service unavailable: Database not connected' });
  }
  next();
});

// Environment configuration logging
console.log('Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
  EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL ? 'Set' : 'Not set',
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set',
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// Cleanup old pending/failed orders daily
cron.schedule('0 0 * * *', async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const result = await Order.deleteMany({
      paymentStatus: { $in: ['Pending', 'Failed'] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    console.log(`Cleaned up ${result.deletedCount} old pending/failed orders`);
  } catch (error) {
    console.error('Error cleaning up pending orders:', error.message);
  }
});

// MongoDB connection with retry
const connectDB = async (retries = 5, delay = 5000) => {
  const isMongoAtlas = process.env.MONGO_URI.startsWith('mongodb+srv://');
  while (retries > 0) {
    try {
      console.log(`[${new Date().toISOString()}] INFO Attempting MongoDB connection (Attempt ${6 - retries}/${retries + 1})...`);
      const mongooseOptions = {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        family: 4,
      };

      if (isMongoAtlas) {
        mongooseOptions.tls = true;
      } else {
        mongooseOptions.tls = isProduction; // TLS only in production for non-Atlas
      }

      await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
      console.log(`✅ MongoDB connected (Atlas: ${isMongoAtlas})`);
      return;
    } catch (err) {
      console.error('❌ MongoDB connection error:', {
        message: err.message,
        code: err.code,
        uri: process.env.MONGO_URI.replace(/:([^@]+)@/, ':<hidden>@'),
      });
      retries--;
      if (retries > 0) {
        console.log(`Retrying connection (${retries} attempts left)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        console.error('❌ Max retries reached. Server will continue running without MongoDB.');
        return;
      }
    }
  }
};

// MongoDB event listeners
mongoose.connection.on('connected', () => console.log('MongoDB connection established'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));

// Start MongoDB connection
connectDB();

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚗 Server running on port ${PORT} (${isProduction ? 'Production' : 'Development'})`);
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

// Catch-all route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: err.stack, // Include stack trace for debugging
  });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS error', details: err.message });
  }
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  res.status(500).json({ error: 'Internal server error', details: err.message });
});