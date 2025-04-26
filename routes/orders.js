const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const crypto = require('crypto');
const axios = require('axios');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

// PhonePe API configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

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
    const validPaymentMethods = ['PhonePe', 'COD'];
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
      paymentStatus: 'Pending',
    });

    await order.save();

    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({
      order,
      phonepeOrder: orderData.paymentMethod === 'PhonePe' ? { orderId } : null,
    });
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
  console.log('Initiate PhonePe Payment - Request Body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      orderId,
      amount,
      customer,
      redirectUrl,
      callbackUrl,
      mobileNumber,
      merchantUserId,
    } = req.body;

    // Validate required fields
    if (
      !orderId ||
      !amount ||
      !customer ||
      !customer.firstName ||
      !customer.lastName ||
      !customer.email ||
      !customer.phone ||
      !redirectUrl ||
      !callbackUrl ||
      !mobileNumber ||
      !merchantUserId
    ) {
      console.warn('Missing required fields:', {
        orderId,
        amount,
        customer,
        redirectUrl,
        callbackUrl,
        mobileNumber,
        merchantUserId,
      });
      return res.status(400).json({ error: 'Missing required payment initiation fields' });
    }

    // Validate environment variables
    if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY || !PHONEPE_SALT_INDEX) {
      console.error('Missing PhonePe environment variables:', {
        PHONEPE_MERCHANT_ID: !!PHONEPE_MERCHANT_ID,
        PHONEPE_SALT_KEY: !!PHONEPE_SALT_KEY,
        PHONEPE_SALT_INDEX: !!PHONEPE_SALT_INDEX,
      });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate order status
    if (order.paymentStatus !== 'Pending') {
      console.warn(`Invalid payment status for order: ${orderId}, status: ${order.paymentStatus}`);
      return res.status(400).json({ error: 'Order payment already processed or invalid' });
    }

    // Generate transaction ID
    const merchantTransactionId = `TXN-${orderId}-${Date.now()}`;

    // Prepare PhonePe payload
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId,
      amount: Math.round(Number(amount)), // Ensure integer in paise
      redirectUrl: `${redirectUrl}?transactionId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl,
      mobileNumber,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    console.log('PhonePe Payload:', JSON.stringify(payload, null, 2));

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate checksum (corrected to use SHA256, not HMAC)
    const stringToHash = `${base64Payload}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const checksum = crypto
      .createHash('sha256')
      .update(stringToHash)
      .digest('hex') + `###${PHONEPE_SALT_INDEX}`;

    console.log('Checksum Details:', { base64Payload, stringToHash, checksum });

    // Make PhonePe API request
    let phonePeResponse;
    try {
      phonePeResponse = await axios.post(
        `${PHONEPE_API_URL}/pg/v1/pay`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            accept: 'application/json',
          },
          timeout: 30000,
        }
      );
    } catch (phonePeError) {
      console.error('PhonePe API Error:', {
        status: phonePeError.response?.status,
        data: phonePeError.response?.data,
        message: phonePeError.message,
      });
      return res.status(502).json({
        error: 'Failed to connect to PhonePe',
        details: phonePeError.response?.data?.message || phonePeError.message,
      });
    }

    console.log('PhonePe API Response:', JSON.stringify(phonePeResponse.data, null, 2));

    // Validate response
    if (
      !phonePeResponse.data.success ||
      !phonePeResponse.data.data?.instrumentResponse?.redirectInfo?.url
    ) {
      console.warn('Invalid PhonePe response:', phonePeResponse.data);
      return res.status(500).json({
        error: 'PhonePe payment initiation failed',
        details: phonePeResponse.data.message || 'Invalid response from payment gateway',
      });
    }

    const paymentUrl = phonePeResponse.data.data.instrumentResponse.redirectInfo.url;

    // Update order with transaction ID
    order.phonepeTransactionId = merchantTransactionId;
    await order.save();

    console.log(
      `PhonePe payment initiated for order: ${orderId}, transaction: ${merchantTransactionId}, paymentUrl: ${paymentUrl}`
    );

    res.status(200).json({
      paymentUrl,
      transactionId: merchantTransactionId,
    });
  } catch (error) {
    console.error('Error initiating PhonePe payment:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to initiate PhonePe payment',
      details: error.message,
    });
  }
});

// POST /api/orders/phonepe-callback - Handle PhonePe callback
router.post('/phonepe-callback', async (req, res) => {
  try {
    const xVerify = req.headers['x-verify'];
    const { response } = req.body;

    console.log('PhonePe Callback - Headers:', req.headers);
    console.log('PhonePe Callback - Body:', req.body);

    if (!xVerify || !response) {
      console.warn('Missing callback parameters:', { xVerify, response });
      return res.status(400).json({ error: 'Missing required callback parameters' });
    }

    // Verify checksum (corrected to use SHA256)
    const stringToHash = `${response}/pg/v1/status${PHONEPE_SALT_KEY}`;
    const computedChecksum = crypto
      .createHash('sha256')
      .update(stringToHash)
      .digest('hex') + `###${PHONEPE_SALT_INDEX}`;

    console.log('Callback Checksum:', { xVerify, computedChecksum, stringToHash });

    if (xVerify !== computedChecksum) {
      console.warn('Invalid callback checksum:', { xVerify, computedChecksum });
      return res.status(400).json({ error: 'Checksum verification failed' });
    }

    let decodedResponse;
    try {
      decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf8'));
    } catch (parseError) {
      console.warn('Failed to parse callback response:', parseError.message);
      return res.status(400).json({ error: 'Invalid callback response format' });
    }

    console.log('Decoded Callback Response:', JSON.stringify(decodedResponse, null, 2));

    const { merchantTransactionId, state, code } = decodedResponse;

    const order = await Order.findOne({ phonepeTransactionId: merchantTransactionId });
    if (!order) {
      console.warn(`Order not found for transaction: ${merchantTransactionId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (state === 'COMPLETED' && code === 'PAYMENT_SUCCESS') {
      order.paymentStatus = 'Paid';
      await order.save();
      console.log(`Payment successful for order: ${order.orderId}, transaction: ${merchantTransactionId}`);
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      console.log(
        `Payment failed for order: ${order.orderId}, transaction: ${merchantTransactionId}, code: ${code}`
      );
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Error in PhonePe callback:', {
      message: error.message,
      stack: error.stack,
    });
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

    console.log('Verify Payment - Request Body:', { orderId, transactionId });

    if (!orderId || !transactionId) {
      console.warn('Missing verification parameters:', { orderId, transactionId });
      return res.status(400).json({ error: 'Missing orderId or transactionId' });
    }

    const order = await Order.findOne({ orderId, phonepeTransactionId: transactionId });
    if (!order) {
      console.warn(`Order not found: ${orderId}, transaction: ${transactionId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prepare PhonePe status check
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const stringToHash = `${endpoint}${PHONEPE_SALT_KEY}`;
    const checksum = crypto
      .createHash('sha256')
      .update(stringToHash)
      .digest('hex') + `###${PHONEPE_SALT_INDEX}`;

    console.log('Verification Request:', { endpoint, stringToHash, checksum });

    let response;
    try {
      response = await axios.get(`${PHONEPE_API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
          accept: 'application/json',
        },
        timeout: 30000,
      });
    } catch (phonePeError) {
      console.error('PhonePe Verification Error:', {
        status: phonePeError.response?.status,
        data: phonePeError.response?.data,
        message: phonePeError.message,
      });
      return res.status(502).json({
        error: 'Failed to verify payment with PhonePe',
        details: phonePeError.response?.data?.message || phonePeError.message,
      });
    }

    console.log('Verification Response:', JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.code === 'PAYMENT_SUCCESS') {
      order.paymentStatus = 'Paid';
      await order.save();
      console.log(`Payment verified for order: ${orderId}, transaction: ${transactionId}`);
      res.status(200).json({ success: true, order });
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      console.log(
        `Payment verification failed for order: ${orderId}, code: ${response.data.code}`
      );
      res.status(200).json({
        success: false,
        error: response.data.message || 'Payment verification failed',
      });
    }
  } catch (error) {
    console.error('Error verifying PhonePe payment:', {
      message: error.message,
      stack: error.stack,
    });
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