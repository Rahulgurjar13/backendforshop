const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
  },
  shippingAddress: {
    address1: String,
    address2: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },
  shippingMethod: {
    type: String,
    cost: Number,
  },
  coupon: {
    code: String,
    discount: Number,
  },
  gstDetails: {
    gstNumber: String,
    state: String,
    city: String,
  },
  paymentMethod: String,
  items: [{
    productId: String,
    name: String,
    quantity: Number,
    price: Number,
    variant: String,
  }],
  date: { type: Date, default: Date.now },
  total: Number,
  orderId: { type: String, unique: true }, // Optional: Add if you generate custom IDs
});

module.exports = mongoose.model('Order', orderSchema);