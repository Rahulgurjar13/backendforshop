const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
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
      address2: { type: String, trim: true, default: '' },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: {
        type: String,
        required: true,
        trim: true,
        match: [/^[0-9]{6}$/, 'Invalid pincode (must be 6 digits)'],
      },
      country: { type: String, required: true, trim: true, default: 'India' },
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
      gstNumber: {
        type: String,
        trim: true,
        default: '',
        match: [
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          'Invalid GST number (e.g., 22AAAAA0000A1Z5)',
        ],
      },
      state: {
        type: String,
        trim: true,
        required: [
          function () {
            return !!this.gstDetails.gstNumber;
          },
          'State is required when GST number is provided',
        ],
      },
      city: {
        type: String,
        trim: true,
        required: [
          function () {
            return !!this.gstDetails.gstNumber;
          },
          'City is required when GST number is provided',
        ],
      },
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
      enum: ['Pending', 'Success', 'Failed'], // Changed 'Paid' to 'Success'
      default: 'Pending',
    },
    razorpayPaymentId: {
      // Renamed from paymentId
      type: String,
      trim: true,
      required: [
        function () {
          return this.paymentMethod === 'Razorpay' && this.paymentStatus === 'Success';
        },
        'Razorpay Payment ID is required for successful Razorpay orders',
      ],
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    items: {
      type: [
        {
          productId: { type: String, required: true, trim: true },
          name: { type: String, required: true, trim: true },
          quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
          price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
          variant: { type: String, trim: true, default: '' },
        },
      ],
      validate: {
        validator: (items) => items && items.length > 0,
        message: 'At least one item is required in the order',
      },
    },
    total: { type: Number, required: true, min: [1, 'Total must be at least ₹1'] },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Calculate expected shipping cost (aligned with frontend and backend)
const calculateShippingCost = (subtotal) => {
  if (subtotal >= 800) return 0;
  if (subtotal >= 500) return 50;
  return 80;
};

orderSchema.pre('validate', function (next) {
  // Calculate totals
  const itemsTotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const expectedShippingCost = calculateShippingCost(itemsTotal);
  let shippingCost = expectedShippingCost;
  let couponDiscount = this.coupon.discount || 0;

  // Validate coupon and shipping cost
  if (this.coupon.code && this.coupon.code.toUpperCase() === 'FREESHIPPING') {
    if (this.shippingMethod.cost !== 0) {
      console.error(`Invalid shipping cost for FREESHIPPING coupon in order ${this.orderId}: Expected 0, Received ${this.shippingMethod.cost}`);
      return next(new Error('Shipping cost must be 0 when FREESHIPPING coupon is applied'));
    }
    couponDiscount = expectedShippingCost;
  } else if (this.shippingMethod.cost !== expectedShippingCost) {
    console.error(`Invalid shipping cost in order ${this.orderId}: Expected ${expectedShippingCost}, Received ${this.shippingMethod.cost}`);
    return next(new Error(`Shipping cost must be ${expectedShippingCost} for subtotal ${itemsTotal}`));
  }

  // Validate total
  const expectedTotal = Math.max(1, itemsTotal + this.shippingMethod.cost - couponDiscount);
  if (Math.abs(this.total - expectedTotal) > 0.01) {
    console.error(`Total mismatch in order ${this.orderId}: Expected ${expectedTotal}, Received ${this.total}`, {
      itemsTotal,
      shippingCost: this.shippingMethod.cost,
      couponDiscount,
      items: this.items,
    });
    return next(new Error(`Total mismatch. Expected: ${expectedTotal}, Received: ${this.total}`));
  }

  // Validate coupon discount
  if (couponDiscount > itemsTotal + this.shippingMethod.cost) {
    console.error(`Coupon discount exceeds subtotal plus shipping in order ${this.orderId}`, {
      couponDiscount,
      itemsTotal,
      shippingCost: this.shippingMethod.cost,
      items: this.items,
    });
    return next(new Error('Coupon discount cannot exceed subtotal plus shipping'));
  }

  // Validate Razorpay order ID
  if (this.paymentMethod === 'Razorpay' && this.paymentStatus === 'Success' && !this.razorpayOrderId) {
    console.error(`Missing Razorpay Order ID for successful Razorpay order ${this.orderId}`);
    return next(new Error('Razorpay Order ID is required for successful Razorpay orders'));
  }

  next();
});

// TTL index for pending orders (expire after 30 minutes)
orderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 60, // 30 minutes
    partialFilterExpression: { paymentStatus: 'Pending', paymentMethod: 'Razorpay' },
  }
);

// Additional index for efficient querying
orderSchema.index({ orderId: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ paymentStatus: 1, paymentMethod: 1 });

module.exports = mongoose.model('Order', orderSchema);