const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/order.js');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (
      !orderData.customer ||
      !orderData.shippingAddress ||
      !orderData.items ||
      !orderData.total ||
      !orderData.paymentMethod
    ) {
      console.warn('Missing required fields:', Object.keys(orderData));
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate payment method
    const validPaymentMethods = ['COD', 'Razorpay'];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      console.warn(`Invalid payment method: ${orderData.paymentMethod}`);
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (orderData.paymentMethod === 'COD') {
      // For COD, create the order immediately with Paid status
      const order = new Order({
        ...orderData,
        orderId,
        paymentStatus: 'Paid',
      });

      await order.save();
      console.log(`COD order created: ${orderId}`);
      return res.status(201).json({ order });
    } else {
      // For Razorpay, return order data without saving
      console.log(`Preparing Razorpay order: ${orderId}`);
      return res.status(200).json({ orderData: { ...orderData, orderId } });
    }
  } catch (error) {
    console.error('Error processing order:', {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate order ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to process order', details: error.message });
  }
});

// POST /api/orders/initiate-razorpay-payment - Initiate Razorpay payment
router.post('/initiate-razorpay-payment', async (req, res) => {
  try {
    const { orderId, amount, currency, receipt, customer, orderData } = req.body;

    // Validate input
    if (!orderId || !amount || !currency || !receipt || !customer || !orderData) {
      console.warn('Missing required fields for Razorpay payment:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount, // Amount in paise
      currency,
      receipt,
      notes: {
        orderId,
      },
    });

    console.log(`Razorpay order created for orderId: ${orderId}, razorpayOrderId: ${razorpayOrder.id}`);
    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderData, // Return orderData for verification
    });
  } catch (error) {
    console.error('Error initiating Razorpay payment:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to initiate Razorpay payment', details: error.message });
  }
});

// POST /api/orders/verify-razorpay-payment - Verify Razorpay payment
router.post('/verify-razorpay-payment', async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature, orderData } = req.body;

    // Validate input
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderData) {
      console.warn('Missing required fields for Razorpay verification:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`Invalid Razorpay signature for orderId: ${orderId}`);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: 'Paid',
    });

    await order.save();

    console.log(`Razorpay payment verified and order created: ${orderId}, paymentId: ${razorpay_payment_id}`);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to verify Razorpay payment', details: error.message });
  }
});

// GET /api/orders - Retrieve orders (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;

    const query = { paymentStatus: 'Paid' }; // Only fetch Paid orders
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    if (orderId) {
      if (typeof orderId !== 'string' || orderId.trim() === '') {
        return res.status(400).json({ error: 'Invalid orderId' });
      }
      query.orderId = { $regex: orderId.trim(), $options: 'i' };
    }

    const orders = await Order.find(query).sort({ date: -1 });
    console.log(`Fetched ${orders.length} paid orders with query:`, JSON.stringify(query));
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// Helper function to validate date
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;