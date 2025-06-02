const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/order.js');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { sendEmail, generateOrderEmail } = require('../utils/email'); // Import email utility

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

    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: orderData.paymentMethod === 'COD' ? 'Paid' : 'Pending',
      emailSent: false, // Track if email has been sent
    });

    await order.save();
    console.log(`${orderData.paymentMethod} order created: ${orderId}`);

    // Send email for COD orders (Paid status)
    if (orderData.paymentMethod === 'COD') {
      try {
        await sendEmail({
          email: order.customer.email,
          subject: `Order Confirmation - ${order.orderId}`,
          html: generateOrderEmail(order),
        });
        order.emailSent = true;
        await order.save();
        console.log(`Confirmation email sent for COD order: ${orderId}`);
      } catch (emailError) {
        console.error(`Failed to send email for COD order ${orderId}:`, emailError.message);
        // Continue despite email failure
      }
    }

    return res.status(201).json({ orderData: { ...orderData, orderId } });
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
      notes: { orderId },
    });

    console.log(`Razorpay order created for orderId: ${orderId}, razorpayOrderId: ${razorpayOrder.id}`);
    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderData,
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

    // Find and update order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found for orderId: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if payment needs to be captured
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status === 'authorized') {
      await razorpay.payments.capture(razorpay_payment_id, orderData.total * 100, 'INR');
      console.log(`Payment captured for orderId: ${orderId}, paymentId: ${razorpay_payment_id}`);
    }

    // Update order status
    order.paymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.paymentStatus = 'Paid';
    await order.save();

    // Send confirmation email if not already sent
    if (!order.emailSent) {
      try {
        await sendEmail({
          email: order.customer.email,
          subject: `Order Confirmation - ${order.orderId}`,
          html: generateOrderEmail(order),
        });
        order.emailSent = true;
        await order.save();
        console.log(`Confirmation email sent for Razorpay order: ${orderId}`);
      } catch (emailError) {
        console.error(`Failed to send email for Razorpay order ${orderId}:`, emailError.message);
        // Continue despite email failure
      }
    }

    console.log(`Razorpay payment verified and order updated: ${orderId}, paymentId: ${razorpay_payment_id}`);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to verify Razorpay payment', details: error.message });
  }
});

// POST /api/orders/webhook - Handle Razorpay webhook events
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    let payload = req.body;

    // Handle base64-encoded payload
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      } catch (e) {
        console.error('Failed to decode base64 webhook payload:', e.message);
        return res.status(400).json({ error: 'Invalid payload' });
      }
    }

    // Verify webhook signature
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (generatedSignature !== signature) {
      console.warn('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = payload.event;
    console.log(`Received webhook event: ${event}`);

    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const paymentId = payment.id;

      const order = await Order.findOne({ razorpayOrderId });
      if (!order) {
        console.warn(`Order not found for razorpayOrderId: ${razorpayOrderId}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update order status
      order.paymentStatus = 'Paid';
      order.paymentId = paymentId;
      await order.save();

      // Send confirmation email if not already sent
      if (!order.emailSent) {
        try {
          await sendEmail({
            email: order.customer.email,
            subject: `Order Confirmation - ${order.orderId}`,
            html: generateOrderEmail(order),
          });
          order.emailSent = true;
          await order.save();
          console.log(`Confirmation email sent via webhook for order: ${order.orderId}`);
        } catch (emailError) {
          console.error(`Failed to send email for order ${order.orderId} via webhook:`, emailError.message);
          // Continue despite email failure
        }
      }

      console.log(`Updated order ${order.orderId} to Paid via webhook`);
      return res.status(200).json({ success: true });
    } else if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const order = await Order.findOne({ razorpayOrderId });
      if (order) {
        order.paymentStatus = 'Failed';
        await order.save();
        console.log(`Updated order ${order.orderId} to Failed via webhook`);
      }
      return res.status(200).json({ success: true });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to process webhook', details: error.message });
  }
});

// GET /api/orders/pending - Retrieve pending orders (admin only)
router.get('/pending', authenticateAdmin, async (req, res) => {
  try {
    const pendingOrders = await Order.find({ paymentStatus: 'Pending', paymentMethod: 'Razorpay' });
    console.log(`Fetched ${pendingOrders.length} pending Razorpay orders`);
    res.status(200).json(pendingOrders);
  } catch (error) {
    console.error('Error fetching pending orders:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch pending orders', details: error.message });
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