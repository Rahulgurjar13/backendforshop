const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});

const generateOrderEmail = (order) => {
  if (!order || !order.orderId || !order.customer || !order.items || !order.shippingAddress || !order.shippingMethod) {
    console.error('Invalid order data for email generation', { order });
    throw new Error('Invalid order data for email generation');
  }

  const itemsList = order.items
    .map(
      (item) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">₹${item.price.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation - ${order.orderId}</h2>
      <p>Dear ${order.customer.firstName} ${order.customer.lastName},</p>
      <p>Thank you for your order!</p>
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleString()}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
      <h3>Shipping Address</h3>
      <p>${order.shippingAddress.address1}, ${order.shippingAddress.address2 || ''}</p>
      <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
      <p>${order.shippingAddress.country}</p>
      <h3>Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
      <p><strong>Subtotal:</strong> ₹${order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</p>
      <p><strong>Shipping Cost:</strong> ₹${order.shippingMethod.cost.toFixed(2)}</p>
      <p><strong>Discount:</strong> ₹${(order.coupon.discount || 0).toFixed(2)}</p>
      <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
      <p>We will notify you once your order is shipped.</p>
      <p>Thank you for shopping with Nisarg Maitri!</p>
    </div>
  `;

  console.log('Generated email content for orderId:', order.orderId, { htmlLength: html.length });
  return html;
};

const sendEmail = async ({ email, subject, html }) => {
  if (!email || !subject || !html) {
    console.error('Missing required email parameters:', { email, subject, htmlLength: html ? html.length : 0 });
    throw new Error('Missing required fields: email, subject, or html content');
  }

  const mailOptions = {
    from: `"Nisarg Maitri" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} with subject: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, { error: error.message, stack: error.stack });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = { sendEmail, generateOrderEmail };