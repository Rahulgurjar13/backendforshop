const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true }, // Unique order ID
  customer: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'] },
    phone: { type: String, required: true, match: [/^[0-9]{10}$/, 'Invalid phone number'] },
  },
  shippingAddress: {
    address1: { type: String, required: true },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true, match: [/^[0-9]{6}$/, 'Invalid pincode'] },
    country: { type: String, default: 'India' },
  },
  shippingMethod: {
    type: { type: String, required: true, enum: ['Standard', 'Express'] },
    cost: { type: Number, required: true, min: 0 },
  },
  coupon: {
    code: { type: String, default: '' },
    discount: { type: Number, default: 0, min: 0 },
  },
  gstDetails: {
    gstNumber: { type: String },
    state: { type: String },
    city: { type: String },
  },
  paymentMethod: { type: String, required: true, enum: ['Razorpay', 'COD'] }, // Supports only Razorpay and COD
  razorpayPaymentId: { type: String }, // For Razorpay payments
  razorpayOrderId: { type: String }, // Razorpay order ID
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Paid', 'Failed'] },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      variant: { type: String },
    },
  ],
  date: { type: Date, default: Date.now },
  total: { type: Number, required: true, min: 0 },
  updatedAt: { type: Date, default: Date.now }, // Tracks updates
});

// Add index for razorpayOrderId (no duplicate for orderId)
orderSchema.index({ razorpayOrderId: 1 });

// Update `updatedAt` on every save
orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);