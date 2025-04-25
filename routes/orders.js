const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    const validPaymentMethods = ["Razorpay", "COD"];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}` });
    }

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let razorpayOrder;
    if (orderData.paymentMethod === "Razorpay") {
      // Create Razorpay order
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(orderData.total * 100), // Convert to paise
        currency: "INR",
        receipt: orderId,
      });
    }

    // Create order in MongoDB
    const order = new Order({
      ...orderData,
      orderId,
      razorpayOrderId: razorpayOrder?.id || null,
      paymentStatus: orderData.paymentMethod === "COD" ? "Pending" : "Pending",
    });

    await order.save();

    console.log(`Order created: ${orderId} with payment method: ${orderData.paymentMethod}`);
    res.status(201).json({
      order,
      razorpayOrder: razorpayOrder
        ? {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          }
        : null,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate order ID" });
    }
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

// GET /api/orders - Retrieve orders (admin only)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;

    // Validate query parameters
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
      query.orderId = { $regex: orderId.trim(), $options: "i" }; // Case-insensitive partial match
    }

    const orders = await Order.find(query).sort({ date: -1 });
    console.log(`Fetched ${orders.length} orders with query:`, JSON.stringify(query));
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

// POST /api/orders/verify-payment - Verify Razorpay payment
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
      req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return res.status(400).json({ error: "Missing payment verification details" });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.warn(`Invalid payment signature for order: ${orderId}`);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update order with payment details
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: "Paid",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      console.warn(`Order not found for verification: ${orderId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log(`Payment verified for order: ${orderId}`);
    res.json({ status: "success", order });
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({ error: "Failed to verify payment", details: error.message });
  }
});

// Helper function to validate date strings
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;