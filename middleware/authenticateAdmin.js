require('dotenv').config();
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied, no token provided' });
  }

  try {
    const verifyAsync = promisify(jwt.verify);
    const decoded = await verifyAsync(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      console.log(`User ${decoded.email || decoded.id} is not an admin`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    console.log(`Admin authenticated: ${decoded.email || decoded.id}`);
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired', expiredAt: error.expiredAt });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format or signature' });
    } else if (error.name === 'NotBeforeError') {
      return res.status(403).json({ error: 'Token not yet valid', notBefore: error.date });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const checkAdminStatus = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(200).json({ isAdmin: false });
  }

  try {
    const verifyAsync = promisify(jwt.verify);
    const decoded = await verifyAsync(token, process.env.JWT_SECRET);
    return res.status(200).json({ isAdmin: !!decoded.isAdmin, email: decoded.email });
  } catch (error) {
    console.error('Check admin status failed:', error.message);
    return res.status(200).json({ isAdmin: false });
  }
};

module.exports = { authenticateAdmin, checkAdminStatus };