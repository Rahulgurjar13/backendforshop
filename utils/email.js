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
  // Enhanced validation with more specific error messages
  if (!order) {
    console.error('Order object is null or undefined');
    throw new Error('Order object is required');
  }

  const requiredFields = ['orderId', 'customer', 'items', 'shippingAddress', 'shippingMethod'];
  const missingFields = requiredFields.filter(field => !order[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing required order fields:', missingFields, { order });
    throw new Error(`Missing required order fields: ${missingFields.join(', ')}`);
  }

  // Validate customer object
  if (!order.customer.firstName || !order.customer.lastName) {
    console.error('Invalid customer data - missing name fields', { customer: order.customer });
    throw new Error('Customer first name and last name are required');
  }

  // Validate items array
  if (!Array.isArray(order.items) || order.items.length === 0) {
    console.error('Invalid items data - must be non-empty array', { items: order.items });
    throw new Error('Order must contain at least one item');
  }

  // Validate each item
  order.items.forEach((item, index) => {
    if (!item.name || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
      console.error(`Invalid item at index ${index}:`, item);
      throw new Error(`Item at index ${index} is missing required fields (name, quantity, price)`);
    }
  });

  // Enhanced items list generation with better error handling
  const itemsList = order.items
    .map((item, index) => {
      try {
        const itemTotal = (item.quantity * item.price).toFixed(2);
        return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${item.name || 'Unknown Item'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity || 0}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${(item.price || 0).toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${itemTotal}</td>
          </tr>
        `;
      } catch (error) {
        console.error(`Error processing item at index ${index}:`, error, item);
        return `
          <tr>
            <td colspan="4" style="border: 1px solid #ddd; padding: 8px; color: red; text-align: center;">
              Error displaying item details
            </td>
          </tr>
        `;
      }
    })
    .join('');

  // Safe value extraction with defaults
  const safeGet = (obj, path, defaultValue = '') => {
    try {
      return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Calculate totals with error handling
  const calculateSubtotal = () => {
    try {
      return order.items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.price || 0);
        return sum + itemTotal;
      }, 0);
    } catch (error) {
      console.error('Error calculating subtotal:', error);
      return 0;
    }
  };

  const subtotal = calculateSubtotal();
  const shippingCost = safeGet(order, 'shippingMethod.cost', 0);
  const discount = safeGet(order, 'coupon.discount', 0);
  const total = order.total || (subtotal + shippingCost - discount);

  // Enhanced HTML template with better styling and error handling
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2c5f41; margin: 0; font-size: 28px;">Order Confirmation</h2>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Order #${order.orderId}</p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Dear ${order.customer.firstName} ${order.customer.lastName},</p>
        <p style="font-size: 16px; margin-bottom: 30px; color: #2c5f41;">Thank you for your order! We're excited to get your items shipped to you.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <h3 style="color: #2c5f41; margin: 0 0 15px 0; font-size: 20px;">Order Details</h3>
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${order.date ? new Date(order.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${safeGet(order, 'paymentMethod', 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: ${order.paymentStatus === 'completed' ? '#28a745' : '#ffc107'};">${safeGet(order, 'paymentStatus', 'Pending')}</span></p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c5f41; margin: 0 0 15px 0; font-size: 20px;">Shipping Address</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
            <p style="margin: 2px 0;">${safeGet(order, 'shippingAddress.address1', 'N/A')}${safeGet(order, 'shippingAddress.address2') ? ', ' + safeGet(order, 'shippingAddress.address2') : ''}</p>
            <p style="margin: 2px 0;">${safeGet(order, 'shippingAddress.city', 'N/A')}, ${safeGet(order, 'shippingAddress.state', 'N/A')} ${safeGet(order, 'shippingAddress.pincode', 'N/A')}</p>
            <p style="margin: 2px 0;">${safeGet(order, 'shippingAddress.country', 'India')}</p>
          </div>
        </div>
        
        <h3 style="color: #2c5f41; margin: 0 0 15px 0; font-size: 20px;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background-color: white;">
          <thead>
            <tr style="background-color: #2c5f41; color: white;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Product</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Quantity</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Price</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Shipping Cost:</span>
            <span>₹${Number(shippingCost).toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #28a745;">
            <span>Discount:</span>
            <span>-₹${Number(discount).toFixed(2)}</span>
          </div>
          ` : ''}
          <hr style="border: none; border-top: 2px solid #2c5f41; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #2c5f41;">
            <span>Total:</span>
            <span>₹${Number(total).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; background-color: #e8f5e8; border-radius: 6px;">
          <p style="margin: 0; color: #2c5f41; font-weight: bold;">We will notify you once your order is shipped.</p>
          <p style="margin: 10px 0 0 0; color: #666;">Thank you for shopping with Nisarg Maitri!</p>
        </div>
      </div>
    </div>
  `;

  console.log('Generated email content for orderId:', order.orderId, { 
    htmlLength: html.length,
    itemCount: order.items.length,
    total: total 
  });
  
  return html;
};

const sendEmail = async ({ email, subject, html }) => {
  // Enhanced parameter validation
  const errors = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('email (valid email address)');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email (valid format)');
  }
  
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('subject (non-empty string)');
  }
  
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    errors.push('html (non-empty content)');
  }

  if (errors.length > 0) {
    const errorMessage = `Missing or invalid required fields: ${errors.join(', ')}`;
    console.error('Email validation failed:', { 
      email, 
      subject, 
      htmlLength: html ? html.length : 0,
      errors 
    });
    throw new Error(errorMessage);
  }

  // Verify transporter configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing - check environment variables');
    throw new Error('Email service not configured properly');
  }

  const mailOptions = {
    from: `"Nisarg Maitri" <${process.env.EMAIL_USER}>`,
    to: email.trim(),
    subject: subject.trim(),
    html: html.trim(),
  };

  try {
    console.log(`Attempting to send email to ${email} with subject: "${subject}"`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully to ${email}`, {
      messageId: info.messageId,
      response: info.response,
      subject: subject
    });
    
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, { 
      error: error.message, 
      code: error.code,
      command: error.command,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed - check credentials';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email service';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email address not found or rejected';
    } else {
      errorMessage = `Failed to send email: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

module.exports = { sendEmail, generateOrderEmail };