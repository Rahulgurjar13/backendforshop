const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { StandardCheckoutClient, Env } = require('pg-sdk-node');
const { randomUUID } = require('crypto');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

// PhonePe SDK Configuration
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = 1; // Adjust as per your PhonePe integration version
const PHONEPE_ENV = process.env.NODE_ENV === 'production' ? Env.PRODUCTION : Env.SANDBOX;

const phonepeClient = StandardCheckoutClient.getInstance(
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,
  PHONEPE_ENV
);

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;

    if (
      !orderData.customer ||
      !orderData.shippingAddress ||
      !orderData.items ||
      !orderData.total ||
      !orderData.paymentMethod
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validPaymentMethods = ['PhonePe', 'COD'];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: 'Pending',
    });

    await order.save();
    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating order:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate order ID or transaction ID' });
    }
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// POST /api/orders/initiate-phonepe-payment - Initiate PhonePe payment
router.post('/initiate-phonepe-payment', async (req, res) => {
  try {
    const { orderId, amount, redirectUrl, mobileNumber } = req.body;

    if (!orderId || !amount || !redirectUrl || !mobileNumber) {
      return res.status(400).json({ error: 'Missing required payment initiation fields' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus !== 'Pending') {
      return res.status(400).json({ error: 'Payment already processed for this order' });
    }

    const transactionId = `TXN-${randomUUID()}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(transactionId)
      .amount(amount) // Amount in paise
      .redirectUrl(redirectUrl)
      .build();

    const response = await phonepeClient.pay(request);
    const paymentUrl = response.redirectUrl;

    order.phonepeTransactionId = transactionId;
    await order.save();

    console.log(`PhonePe payment initiated for order: ${orderId}, transaction: ${transactionId}`);
    res.json({ paymentUrl, transactionId });
  } catch (error) {
    console.error('Error initiating PhonePe payment:', error.message);
    res.status(500).json({
      error: 'Failed to initiate PhonePe payment',
      details: error.message,
    });
  }
});

// POST /api/orders/phonepe-callback - Handle PhonePe callback
router.post('/phonepe-callback', async (req, res) => {
  try {
    const { authorizationHeaderData, callbackBody } = req.body; // Adjust based on PhonePe callback format
    const username = PHONEPE_CLIENT_ID; // Merchant username
    const password = PHONEPE_CLIENT_SECRET; // Merchant password

    const callbackResponse = phonepeClient.validateCallback(
      username,
      password,
      authorizationHeaderData,
      JSON.stringify(callbackBody)
    );

    const { orderId, state } = callbackResponse.payload;
    const order = await Order.findOne({ phonepeTransactionId: orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (state === 'SUCCESS') {
      order.paymentStatus = 'Paid';
      await order.save();
      console.log(`Payment successful for order: ${order.orderId}, transaction: ${orderId}`);
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      console.log(`Payment failed for order: ${order.orderId}, transaction: ${orderId}`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment-callback?transactionId=${orderId}`);
  } catch (error) {
    console.error('Error in PhonePe callback:', error.message);
    res.status(500).json({
      error: 'Callback processing failed',
      details: error.message,
    });
  }
});

// POST /api/orders/verify-phonepe-payment - Verify payment status
router.post('/verify-phonepe-payment', async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;

    if (!orderId || !transactionId) {
      return res.status(400).json({ error: 'Missing orderId or transactionId' });
    }

    const order = await Order.findOne({ orderId, phonepeTransactionId: transactionId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const response = await phonepeClient.getOrderStatus(transactionId);

    if (response.state === 'SUCCESS') {
      order.paymentStatus = 'Paid';
      await order.save();
      console.log(`Payment verified for order: ${orderId}, transaction: ${transactionId}`);
      res.json({ success: true, order });
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      console.log(`Payment verification failed for order: ${orderId}`);
      res.json({ success: false, error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying PhonePe payment:', error.message);
    res.status(500).json({
      error: 'Payment verification failed',
      details: error.message,
    });
  }
});

// GET /api/orders - Retrieve orders (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;
    const query = {};

    if (date) {
      if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date format' });
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (orderId) {
      if (typeof orderId !== 'string' || orderId.trim() === '') {
        return res.status(400).json({ error: 'Invalid orderId' });
      }
      query.orderId = { $regex: orderId.trim(), $options: 'i' };
    }

    const orders = await Order.find(query).sort({ date: -1 });
    console.log(`Fetched ${orders.length} orders with query:`, JSON.stringify(query));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;