const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  customer: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Invalid phone number (must be 10 digits)'],
    },
  },
  shippingAddress: {
    address1: { type: String, required: true, trim: true },
    address2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{6}$/, 'Invalid pincode (must be 6 digits)'],
    },
    country: { type: String, default: 'India', trim: true },
  },
  shippingMethod: {
    type: {
      type: String,
      required: true,
      enum: ['Standard', 'Express'],
      default: 'Standard',
    },
    cost: {
      type: Number,
      required: true,
      min: [0, 'Shipping cost cannot be negative'],
    },
  },
  coupon: {
    code: { type: String, default: '', trim: true },
    discount: { type: Number, default: 0, min: [0, 'Discount cannot be negative'] },
  },
  gstDetails: {
    gstNumber: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'Razorpay'],
    default: 'COD',
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  paymentId: {
    type: String,
    trim: true,
  },
  razorpayOrderId: {
    type: String,
    trim: true,
  },
  items: [
    {
      productId: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
      price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
      variant: { type: String, trim: true },
    },
  ],
  date: { type: Date, default: Date.now },
  total: { type: Number, required: true, min: [0, 'Total cannot be negative'] },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

orderSchema.pre('validate', function (next) {
  const itemsTotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const expectedTotal = itemsTotal + this.shippingMethod.cost - (this.coupon.discount || 0);
  if (Math.abs(this.total - expectedTotal) > 0.01) {
    next(new Error('Total does not match items total plus shipping minus discount'));
  }
  next();
});

orderSchema.index({ date: -1 });

module.exports = mongoose.model('Order', orderSchema);