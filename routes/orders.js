const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const axios = require('axios');
const crypto = require('crypto');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

// Environment variables
const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  BACKEND_URL,
  FRONTEND_URL,
} = process.env;

const PHONEPE_API_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox'; // UAT for testing

// Helper function to generate checksum
const generateChecksum = (payload, endpoint) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const stringToHash = base64Payload + endpoint + PHONEPE_SALT_KEY;
  const checksum = crypto
    .createHash('sha256')
    .update(stringToHash)
    .digest('hex') + `###${PHONEPE_SALT_INDEX}`;
  return { base64Payload, checksum };
};

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
    const validPaymentMethods = ['COD', 'PhonePe'];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      console.warn(`Invalid payment method: ${orderData.paymentMethod}`);
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: orderData.paymentMethod === 'PhonePe' ? 'Pending' : 'Pending',
    });

    await order.save();

    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating order:', {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate order ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// POST /api/orders/initiate-phonepe-payment - Initiate PhonePe payment
router.post('/initiate-phonepe-payment', async (req, res) => {
  try {
    const {
      merchantTransactionId,
      amount,
      mobileNumber,
      redirectUrl,
      callbackUrl,
      merchantUserId,
    } = req.body;

    // Validate required fields
    if (!merchantTransactionId || !amount || !mobileNumber || !redirectUrl || !callbackUrl || !merchantUserId) {
      console.warn('Missing required fields for PhonePe payment:', req.body);
      return res.status(400).json({ error: 'Missing required fields for PhonePe payment' });
    }

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId,
      amount: amount, // Amount in paise
      redirectUrl,
      callbackUrl,
      mobileNumber,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const endpoint = '/pg/v1/pay';
    const { base64Payload, checksum } = generateChecksum(payload, endpoint);

    console.log('Initiating PhonePe payment:', { payload });

    const response = await axios.post(
      `${PHONEPE_API_URL}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    const { data } = response.data;
    if (data && data.url) {
      console.log(`PhonePe payment initiated: ${merchantTransactionId}`);
      res.status(200).json({
        paymentUrl: data.url,
        transactionId: merchantTransactionId,
      });
    } else {
      console.warn('Invalid PhonePe response:', response.data);
      throw new Error('Failed to initiate payment');
    }
  } catch (error) {
    console.error('Initiate PhonePe payment error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.response?.data?.message || 'Failed to initiate PhonePe payment',
    });
  }
});

// POST /api/orders/verify-phonepe-payment - Verify PhonePe payment status
router.post('/verify-phonepe-payment', async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;

    if (!orderId || !transactionId) {
      console.warn('Missing orderId or transactionId:', req.body);
      return res.status(400).json({ error: 'orderId and transactionId are required' });
    }

    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const checksum = crypto
      .createHash('sha256')
      .update(endpoint + PHONEPE_SALT_KEY)
      .digest('hex') + `###${PHONEPE_SALT_INDEX}`;

    console.log(`Verifying PhonePe payment: ${transactionId}`);

    const response = await axios.get(`${PHONEPE_API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
        'accept': 'application/json',
      },
      timeout: 10000,
    });

    const { success, code, data } = response.data;
    if (success && code === 'PAYMENT_SUCCESS') {
      // Update order in MongoDB
      const order = await Order.findOneAndUpdate(
        { orderId, phonepeTransactionId: transactionId },
        { paymentStatus: 'Paid', updatedAt: new Date() },
        { new: true }
      );

      if (!order) {
        console.warn(`Order not found for orderId: ${orderId}, transactionId: ${transactionId}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      console.log(`PhonePe payment verified: ${transactionId}`);
      res.status(200).json({
        success: true,
        order: {
          orderId: order.orderId,
          transactionId,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          total: order.total,
          items: order.items,
          customer: order.customer,
          shippingAddress: order.shippingAddress,
          shippingMethod: order.shippingMethod,
          coupon: order.coupon,
          gstDetails: order.gstDetails,
          date: order.date,
          phonepeTransactionId: order.phonepeTransactionId,
        },
      });
    } else {
      console.warn(`PhonePe payment verification failed: ${transactionId}`, response.data);
      res.status(400).json({
        success: false,
        error: response.data.message || 'Payment verification failed',
      });
    }
  } catch (error) {
    console.error('Verify PhonePe payment error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.response?.data?.message || 'Payment verification error',
    });
  }
});

// POST /api/orders/phonepe-callback - Handle PhonePe callback
router.post('/phonepe-callback', async (req, res) => {
  try {
    const xVerify = req.headers['x-verify'];
    const response = req.body.response; // Base64-encoded response

    if (!xVerify || !response) {
      console.warn('Missing x-verify or response in callback:', req.headers, req.body);
      return res.status(400).json({ error: 'Missing verification headers or response' });
    }

    // Verify checksum
    const decodedResponse = Buffer.from(response, 'base64').toString('utf8');
    const checksumString = response + PHONEPE_SALT_KEY;
    const calculatedChecksum = crypto
      .createHash('sha256')
      .update(checksumString)
      .digest('hex') + `###${PHONEPE_SALT_INDEX}`;

    if (xVerify !== calculatedChecksum) {
      console.warn('Invalid checksum in PhonePe callback:', { xVerify, calculatedChecksum });
      return res.status(400).json({ error: 'Invalid checksum' });
    }

    const parsedResponse = JSON.parse(decodedResponse);
    const { transactionId, code } = parsedResponse;

    console.log(`PhonePe callback received: ${transactionId}`, parsedResponse);

    if (parsedResponse.success && code === 'PAYMENT_SUCCESS') {
      // Update order status
      const order = await Order.findOneAndUpdate(
        { phonepeTransactionId: transactionId },
        { paymentStatus: 'Paid', updatedAt: new Date() },
        { new: true }
      );

      if (!order) {
        console.warn(`Order not found for transactionId: ${transactionId}`);
      } else {
        console.log(`Order updated to Paid: ${order.orderId}`);
      }
    } else {
      // Handle failed or other statuses
      console.warn(`Payment failed for transactionId: ${transactionId}`, parsedResponse);
      await Order.findOneAndUpdate(
        { phonepeTransactionId: transactionId },
        { paymentStatus: 'Failed', updatedAt: new Date() }
      );
    }

    res.status(200).send('Callback processed successfully');
  } catch (error) {
    console.error('PhonePe callback error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// GET /api/orders - Retrieve orders (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;

    const query = {};
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