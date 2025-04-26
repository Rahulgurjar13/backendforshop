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
      return res
        .status(400)
        .json({
          error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
        });
    }

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let phonepeOrder;
    if (orderData.paymentMethod === "PhonePe") {
      // PhonePe payment initiation will be handled in a separate endpoint
      phonepeOrder = { orderId }; // Placeholder for now
    }

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      phonepeTransactionId: phonepeOrder?.orderId || null,
      paymentStatus: orderData.paymentMethod === "COD" ? "Pending" : "Pending",
    });

    await order.save();

    console.log(
      `Order created: ${orderId} with payment method: ${orderData.paymentMethod}`
    );
    res.status(201).json({
      order,
      phonepeOrder: phonepeOrder ? { orderId: phonepeOrder.orderId } : null,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate order ID" });
    }
    res
      .status(500)
      .json({ error: "Failed to create order", details: error.message });
  }
});

// POST /api/orders/initiate-phonepe-payment - Initiate PhonePe payment
router.post("/initiate-phonepe-payment", async (req, res) => {
  try {
    const { orderId, amount, customer } = req.body;

    if (!orderId || !amount || !customer) {
      return res
        .status(400)
        .json({ error: "Missing required payment initiation fields" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: `MUID-${customer.email.split("@")[0]}`,
      amount: amount, // Amount in paise
      redirectUrl: `${process.env.BACKEND_URL}/api/orders/phonepe-callback`,
      redirectMode: "REDIRECT",
      callbackUrl: `${process.env.BACKEND_URL}/api/orders/phonepe-callback`,
      mobileNumber: customer.phone,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64");
    const saltIndex = "1"; // PhonePe uses salt index, typically "1"
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
      }
    );

    const paymentUrl = response.data.data.instrumentResponse.redirectInfo.url;

    // Update order with transaction ID
    order.phonepeTransactionId = transactionId;
    await order.save();

    console.log(`PhonePe payment initiated for order: ${orderId}`);
    res.json({ paymentUrl });
  } catch (error) {
    console.error("Error initiating PhonePe payment:", error.message);
    res
      .status(500)
      .json({
        error: "Failed to initiate PhonePe payment",
        details: error.message,
      });
  }
});

// POST /api/orders/phonepe-callback - Handle PhonePe callback
router.post("/phonepe-callback", async (req, res) => {
  try {
    const { response } = req.body; // PhonePe sends base64 encoded response
    if (!response) {
      return res.status(400).json({ error: "Missing callback response" });
    }

    const decodedResponse = JSON.parse(
      Buffer.from(response, "base64").toString("utf8")
    );
    const {
      merchantTransactionId,
      transactionId,
      amount,
      state,
      responseCode,
    } = decodedResponse;

    // Verify checksum (X-VERIFY header from PhonePe)
    const xVerify = req.headers["x-verify"];
    const stringToHash = `${response}/pg/v1/status${PHONEPE_SALT_KEY}`;
    const computedChecksum = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex") + "###1";

    if (xVerify !== computedChecksum) {
      console.warn(`Invalid checksum for transaction: ${merchantTransactionId}`);
      return res.status(400).json({ error: "Invalid checksum" });
    }

    const order = await Order.findOne({ phonepeTransactionId: merchantTransactionId });
    if (!order) {
      console.warn(`Order not found for transaction: ${merchantTransactionId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    if (state === "COMPLETED" && responseCode === "SUCCESS") {
      order.paymentStatus = "Paid";
      order.phonepeTransactionId = transactionId;
      order.updatedAt = new Date();
      await order.save();
      console.log(`Payment verified for order: ${order.orderId}`);
    } else {
      order.paymentStatus = "Failed";
      await order.save();
      console.log(`Payment failed for order: ${order.orderId}`);
    }

    // Redirect user back to frontend confirmation page
    res.redirect(`${process.env.FRONTEND_URL}/checkout?orderId=${order.orderId}`);
  } catch (error) {
    console.error("Error in PhonePe callback:", error.message);
    res
      .status(500)
      .json({ error: "Callback processing failed", details: error.message });
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
    console.log(
      `Fetched ${orders.length} orders with query:`,
      JSON.stringify(query)
    );
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch orders", details: error.message });
  }
});

// Helper function to validate date strings
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;