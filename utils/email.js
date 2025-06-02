const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"NISARGMAITRI" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error(`Error sending email to ${options.email}:`, error.message);
    // Do not throw; log error and continue
  }
};

// Generate HTML email for order confirmation
const generateOrderEmail = (order) => {
  const itemsList = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(
            item.price * item.quantity
          ).toLocaleString('en-IN')}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1A3329;">Order Confirmation</h2>
      <p>Dear ${order.customer.firstName} ${order.customer.lastName},</p>
      <p>Thank you for your order (ID: <strong>${order.orderId}</strong>) with NISARGMAITRI. Your order has been successfully confirmed${
        order.paymentMethod === 'Razorpay' ? ' and paid' : ' and will be paid on delivery'
      }.</p>

      <h3 style="color: #1A3329;">Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9f9f9;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
      <p style="text-align: right; font-weight: bold; margin-top: 20px;">Total: ₹${order.total.toLocaleString(
        'en-IN'
      )}</p>

      <h3 style="color: #1A3329; margin-top: 20px;">Shipping Address</h3>
      <p>
        ${order.shippingAddress.address1}${
    order.shippingAddress.address2 ? `<br>${order.shippingAddress.address2}` : ''
  }<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
      </p>

      <h3 style="color: #1A3329; margin-top: 20px;">Customer Details</h3>
      <p>
        ${order.customer.email}<br>
        ${order.customer.phone}
      </p>

      ${
        order.paymentMethod === 'Razorpay' && order.paymentId
          ? `<p style="margin-top: 20px;"><strong>Payment ID:</strong> ${order.paymentId}</p>`
          : ''
      }

      <p style="margin-top: 20px;">We’ll notify you once your order ships. For any questions, contact us at <a href="mailto:support@nisargmaitri.com">support@nisargmaitri.com</a>.</p>
      <p>Thank you for shopping with NISARGMAITRI!</p>
    </body>
    </html>
  `;
};

module.exports = { sendEmail, generateOrderEmail };