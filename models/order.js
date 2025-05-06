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

// Update `updatedAt` on every save and log changes
orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('paymentStatus') || this.isModified('paymentId') || this.isModified('razorpayOrderId')) {
    console.log(`Order ${this.orderId} updated:`, {
      paymentStatus: this.paymentStatus,
      paymentId: this.paymentId,
      razorpayOrderId: this.razorpayOrderId,
      updatedAt: this.updatedAt,
    });
  }
  next();
});

// Validate total matches items, shipping cost, and coupon discount only for new documents or when relevant fields are modified
orderSchema.pre('validate', function (next) {
  // Skip validation for updates unless items, shippingMethod, coupon, or total are modified
  if (!this.isNew) {
    const modifiedFields = this.modifiedPaths();
    if (
      !modifiedFields.includes('items') &&
      !modifiedFields.includes('shippingMethod') &&
      !modifiedFields.includes('coupon') &&
      !modifiedFields.includes('total')
    ) {
      return next();
    }
  }

  const itemsTotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const expectedTotal = itemsTotal + this.shippingMethod.cost - (this.coupon.discount || 0);
  console.log(`Order ${this.orderId} total validation:`, {
    itemsTotal,
    shippingCost: this.shippingMethod.cost,
    couponDiscount: this.coupon.discount,
    expectedTotal,
    providedTotal: this.total,
  }); // Debug log
  if (Math.abs(this.total - expectedTotal) > 0.01) {
    return next(new Error('Total does not match items total plus shipping minus discount'));
  }
  next();
});

// Custom validation for paymentId when paymentStatus is 'Paid' for Razorpay orders
orderSchema.pre('validate', function (next) {
  if (this.paymentMethod === 'Razorpay' && this.paymentStatus === 'Paid' && !this.paymentId) {
    return next(new Error('paymentId is required for Razorpay orders with paymentStatus "Paid"'));
  }
  next();
});

// Indexes for efficient querying
orderSchema.index({ date: -1 });
orderSchema.index({ paymentMethod: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);