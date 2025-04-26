const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const crypto = require("crypto");
const axios = require("axios");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// PhonePe API configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.phonepe.com/apis/hermes"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";

// POST /api/orders - Create a new order
router.post("/", async (req, res) => {
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate payment method
    const validPaymentMethods = ["PhonePe", "COD"];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
      });
    }

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: orderData.paymentMethod === "COD" ? "Pending" : "Pending",
    });

    await order.save();

    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({
      order,
      phonepeOrder: orderData.paymentMethod === "PhonePe" ? { orderId } : null,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate order ID or transaction ID" });
    }
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

// POST /api/orders/initiate-phonepe-payment - Initiate PhonePe payment
router.post("/initiate-phonepe-payment", async (req, res) => {
  try {
    const { orderId, amount, customer, redirectUrl, mobileNumber } = req.body;

    if (!orderId || !amount || !customer || !redirectUrl || !mobileNumber) {
      return res.status(400).json({ error: "Missing required payment initiation fields" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus !== "Pending") {
      return res.status(400).json({ error: "Payment already processed for this order" });
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: `MUID-${customer.email.split("@")[0]}-${Date.now()}`,
      amount: amount,
      redirectUrl: redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: `${process.env.BACKEND_URL}/api/orders/phonepe-callback`,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64");
    const saltIndex = "1";
    const stringToHash = `${payloadString}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const checksum = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex") + "###" + saltIndex;

    const response = await axios.post(
      `${PHONEPE_API_URL}/pg/v1/pay`,
      { request: payloadString },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
        timeout: 30000,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "PhonePe payment initiation failed");
    }

    const paymentUrl = response.data.data.instrumentResponse.redirectInfo.url;

    // Update order with transaction ID
    order.phonepeTransactionId = transactionId;
    await order.save();

    console.log(`PhonePe payment initiated for order: ${orderId}, transaction: ${transactionId}`);
    res.json({ paymentUrl, transactionId });
  } catch (error) {
    console.error("Error initiating PhonePe payment:", error.message);
    res.status(500).json({
      error: "Failed to initiate PhonePe payment",
      details: error.response?.data?.message || error.message,
    });
  }
});

// POST /api/orders/phonepe-callback - Handle PhonePe callback
router.post("/phonepe-callback", async (req, res) => {
  try {
    const xVerify = req.headers["x-verify"];
    const { response } = req.body;

    if (!xVerify || !response) {
      return res.status(400).json({ error: "Missing required callback parameters" });
    }

    const decodedResponse = JSON.parse(Buffer.from(response, "base64").toString("utf8"));
    const { merchantTransactionId, transactionId, amount, state, responseCode } = decodedResponse;

    // Verify checksum
    const stringToHash = `${response}/pg/v1/status${PHONEPE_SALT_KEY}`;
    const computedChecksum = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex") + "###1";

    if (xVerify !== computedChecksum) {
      console.warn(`Invalid checksum for transaction: ${merchantTransactionId}`);
      return res.status(400).json({ error: "Checksum verification failed" });
    }

    const order = await Order.findOne({ phonepeTransactionId: merchantTransactionId });
    if (!order) {
      console.warn(`Order not found for transaction: ${merchantTransactionId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    if (state === "COMPLETED" && responseCode === "SUCCESS") {
      order.paymentStatus = "Paid";
      order.phonepeTransactionId = transactionId;
      await order.save();
      console.log(`Payment successful for order: ${order.orderId}, transaction: ${transactionId}`);
    } else {
      order.paymentStatus = "Failed";
      await order.save();
      console.log(`Payment failed for order: ${order.orderId}, transaction: ${merchantTransactionId}`);
    }

    // Redirect to frontend payment callback
    res.redirect(`${process.env.FRONTEND_URL}/payment-callback?transactionId=${merchantTransactionId}`);
  } catch (error) {
    console.error("Error in PhonePe callback:", error.message);
    res.status(500).json({
      error: "Callback processing failed",
      details: error.message,
    });
  }
});

// POST /api/orders/verify-phonepe-payment - Verify payment status
router.post("/verify-phonepe-payment", async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;

    if (!orderId || !transactionId) {
      return res.status(400).json({ error: "Missing orderId or transactionId" });
    }

    const order = await Order.findOne({ orderId, phonepeTransactionId: transactionId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify payment status with PhonePe
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const stringToHash = `${endpoint}${PHONEPE_SALT_KEY}`;
    const checksum = crypto.createHash("sha256").update(stringToHash).digest("hex") + "###1";

    const response = await axios.get(`${PHONEPE_API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        accept: "application/json",
      },
      timeout: 30000,
    });

    if (response.data.success && response.data.code === "PAYMENT_SUCCESS") {
      order.paymentStatus = "Paid";
      await order.save();
      console.log(`Payment verified for order: ${orderId}, transaction: ${transactionId}`);
      res.json({ success: true, order });
    } else {
      order.paymentStatus = "Failed";
      await order.save();
      console.log(`Payment verification failed for order: ${orderId}`);
      res.json({ success: false, error: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Error verifying PhonePe payment:", error.message);
    res.status(500).json({
      error: "Payment verification failed",
      details: error.response?.data?.message || error.message,
    });
  }
});

// GET /api/orders - Retrieve orders (admin only)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;

    const query = {};
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ error: "Invalid date format" });
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
      if (typeof orderId !== "string" || orderId.trim() === "") {
        return res.status(400).json({ error: "Invalid orderId" });
      }
      query.orderId = { $regex: orderId.trim(), $options: "i" };
    }

    const orders = await Order.find(query).sort({ date: -1 });
    console.log(`Fetched ${orders.length} orders with query:`, JSON.stringify(query));
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

// Helper function to validate date strings
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;