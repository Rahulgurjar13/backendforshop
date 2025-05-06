const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/order');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { v4: uuidv4 } = require('uuid');

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
      !orderData.shippingMethod ||
      !orderData.items ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0 ||
      orderData.total == null ||
      !orderData.paymentMethod
    ) {
      console.warn('Missing or invalid required fields:', Object.keys(orderData));
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    // Validate payment method
    const validPaymentMethods = ['COD', 'Razorpay'];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      console.warn(`Invalid payment method: ${orderData.paymentMethod}`);
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    // Validate items
    for (const item of orderData.items) {
      if (
        !item.productId ||
        !item.name ||
        !item.quantity ||
        item.quantity < 1 ||
        item.price == null ||
        item.price < 0
      ) {
        console.warn('Invalid item data:', item);
        return res.status(400).json({ error: 'Invalid item data: missing or invalid productId, name, quantity, or price' });
      }
    }

    // Generate unique orderId
    const orderId = `ORDER-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Log items and calculated total for debugging
    const itemsTotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = orderData.shippingMethod.cost || 0;
    const couponDiscount = orderData.coupon?.discount || 0;
    const expectedTotal = itemsTotal + shippingCost - couponDiscount;

    console.log(`Creating order ${orderId}:`, {
      itemsTotal,
      shippingCost,
      couponDiscount,
      expectedTotal,
      providedTotal: orderData.total,
      items: orderData.items,
    });

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: 'Pending',
      date: new Date(),
      coupon: orderData.coupon || { code: '', discount: 0 }, // Ensure coupon is always present
      gstDetails: orderData.gstDetails || { gstNumber: '', state: '', city: '' }, // Ensure gstDetails is always present
    });

    await order.save();

    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating order:', {
      message: error.message,
      stack: error.stack,
      details: error.errors,
    });
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate order ID' });
    }
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err) => err.message).join('; ');
      return res.status(400).json({ error: 'Validation error', details });
    }
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// POST /api/orders/initiate-razorpay-payment - Initiate Razorpay payment
router.post('/initiate-razorpay-payment', async (req, res) => {
  try {
    const { orderId, amount, currency, receipt, customer } = req.body;

    // Validate input
    if (!orderId || !amount || !currency || !receipt || !customer) {
      console.warn('Missing required fields for Razorpay payment:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate amount
    if (Math.abs(order.total * 100 - amount) > 1) {
      console.warn(`Amount mismatch for orderId: ${orderId}`, { orderTotal: order.total, providedAmount: amount / 100 });
      return res.status(400).json({ error: 'Amount does not match order total' });
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

    // Update order with Razorpay order ID
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    console.log(`Razorpay order created for orderId: ${orderId}, razorpayOrderId: ${razorpayOrder.id}`);
    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID,
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
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Validate input
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.warn('Missing required fields for Razorpay verification:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the order
    const order = await Order.findOne({ orderId, razorpayOrderId: razorpay_order_id });
    if (!order) {
      console.warn(`Order not found or invalid razorpayOrderId: ${orderId}`);
      return res.status(404).json({ error: 'Order not found or invalid Razorpay order ID' });
    }

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`Invalid Razorpay signature for orderId: ${orderId}`);
      order.paymentStatus = 'Failed';
      await order.save();
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update order
    order.paymentId = razorpay_payment_id;
    order.paymentStatus = 'Paid';
    await order.save();

    console.log(`Razorpay payment verified for orderId: ${orderId}, paymentId: ${razorpay_payment_id}`);
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

    const query = {
      $or: [
        { paymentMethod: 'COD', paymentStatus: 'Pending' },
        { paymentMethod: 'Razorpay', paymentStatus: 'Paid' },
      ],
    };

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
    console.log(`Fetched ${orders.length} orders with query:`, JSON.stringify(query));
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