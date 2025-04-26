const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const crypto = require("crypto");
const axios = require("axios");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// PhonePe API configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
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
      console.warn("Missing required fields:", Object.keys(orderData));
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate payment method
    const validPaymentMethods = ["PhonePe", "COD"];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      console.warn(`Invalid payment method: ${orderData.paymentMethod}`);
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
    console.error("Error creating order:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate order ID or transaction ID" });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

// POST /api/orders/initiate-phonepe-payment - Initiate PhonePe payment
router.post("/initiate-phonepe-payment", async (req, res) => {
  try {
    const { orderId, amount, customer, redirectUrl, callbackUrl, mobileNumber, merchantUserId } = req.body;

    // Validate required fields
    if (!orderId || !amount || !customer || !redirectUrl || !callbackUrl || !mobileNumber || !merchantUserId) {
      console.warn("Missing required fields:", { orderId, amount, customer, redirectUrl, callbackUrl, mobileNumber, merchantUserId });
      return res.status(400).json({ error: "Missing required payment initiation fields" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found: ${orderId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus !== "Pending") {
      console.warn(`Payment already processed for order: ${orderId}, status: ${order.paymentStatus}`);
      return res.status(400).json({ error: "Payment already processed for this order" });
    }

    const transactionId = `TXN-${orderId}-${Date.now()}`;
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: merchantUserId,
      amount: Math.round(amount), // Ensure integer (in paise)
      redirectUrl: `${redirectUrl}?transactionId=${transactionId}`,
      redirectMode: "REDIRECT",
      callbackUrl,
      mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    console.log("PhonePe payload:", JSON.stringify(payload, null, 2));

    const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = `${payloadString}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const checksum = crypto
      .createHmac("sha256", PHONEPE_SALT_KEY)
      .update(stringToHash)
      .digest("hex") + `###${PHONEPE_SALT_INDEX}`;

    console.log("Checksum details:", { payloadString, stringToHash, checksum });

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

    console.log("PhonePe API response:", JSON.stringify(response.data, null, 2));

    if (!response.data.success || !response.data.data.instrumentResponse.redirectInfo.url) {
      throw new Error(response.data.message || "PhonePe payment initiation failed");
    }

    const paymentUrl = response.data.data.instrumentResponse.redirectInfo.url;

    // Update order with transaction ID
    order.phonepeTransactionId = transactionId;
    await order.save();

    console.log(`PhonePe payment initiated for order: ${orderId}, transaction: ${transactionId}, paymentUrl: ${paymentUrl}`);
    res.json({ paymentUrl, transactionId });
  } catch (error) {
    console.error("Error initiating PhonePe payment:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
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
      console.warn("Missing callback parameters:", { xVerify, response });
      return res.status(400).json({ error: "Missing required callback parameters" });
    }

    // Verify checksum
    const stringToHash = `${response}/pg/v1/status${PHONEPE_SALT_KEY}`;
    const computedChecksum = crypto
      .createHmac("sha256", PHONEPE_SALT_KEY)
      .update(stringToHash)
      .digest("hex") + `###${PHONEPE_SALT_INDEX}`;

    console.log("Callback checksum verification:", { xVerify, computedChecksum, stringToHash });

    if (xVerify !== computedChecksum) {
      console.warn(`Invalid checksum for callback response: ${response}`);
      return res.status(400).json({ error: "Checksum verification failed" });
    }

    let decodedResponse;
    try {
      decodedResponse = JSON.parse(Buffer.from(response, "base64").toString("utf8"));
    } catch (parseError) {
      console.warn("Failed to parse callback response:", parseError.message);
      return res.status(400).json({ error: "Invalid callback response format" });
    }

    const { merchantTransactionId, transactionId, amount, state, responseCode } = decodedResponse;
    console.log("Decoded callback response:", JSON.stringify(decodedResponse, null, 2));

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
      console.log(`Payment failed for order: ${order.orderId}, transaction: ${merchantTransactionId}, responseCode: ${responseCode}`);
    }

    // Respond with HTTP 200 for PhonePe
    res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Error in PhonePe callback:", {
      message: error.message,
      stack: error.stack,
    });
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
      console.warn("Missing verification parameters:", { orderId, transactionId });
      return res.status(400).json({ error: "Missing orderId or transactionId" });
    }

    const order = await Order.findOne({ orderId, phonepeTransactionId: transactionId });
    if (!order) {
      console.warn(`Order not found: ${orderId}, transaction: ${transactionId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify payment status with PhonePe
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const stringToHash = `${endpoint}${PHONEPE_SALT_KEY}`;
    const checksum = crypto
      .createHmac("sha256", PHONEPE_SALT_KEY)
      .update(stringToHash)
      .digest("hex") + `###${PHONEPE_SALT_INDEX}`;

    console.log("Verification request:", { endpoint, stringToHash, checksum });

    const response = await axios.get(`${PHONEPE_API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        accept: "application/json",
      },
      timeout: 30000,
    });

    console.log("Verification response:", JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.code === "PAYMENT_SUCCESS") {
      order.paymentStatus = "Paid";
      await order.save();
      console.log(`Payment verified for order: ${orderId}, transaction: ${transactionId}`);
      res.json({ success: true, order });
    } else {
      order.paymentStatus = "Failed";
      await order.save();
      console.log(`Payment verification failed for order: ${orderId}, response: ${response.data.message || response.data.code}`);
      res.json({ success: false, error: response.data.message || "Payment verification failed" });
    }
  } catch (error) {
    console.error("Error verifying PhonePe payment:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
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
    console.error("Error fetching orders:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

// Helper function to validate date strings
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;