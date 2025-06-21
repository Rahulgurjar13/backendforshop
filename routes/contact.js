const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const { sendEmail } = require('../utils/email.js');

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const validationErrors = {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    validationErrors.name = 'Name must be at least 2 characters';
  }
  if (!email || !validateEmail(email)) {
    validationErrors.email = 'A valid email is required';
  }
  if (phone && !/^[0-9]{10}$/.test(phone)) {
    validationErrors.phone = 'Phone must be a 10-digit number';
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    validationErrors.message = 'Message must be at least 10 characters';
  }
  if (subject && typeof subject !== 'string') {
    validationErrors.subject = 'Subject must be a string';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors: validationErrors });
  }

  try {
    const contact = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      subject: subject ? subject.trim() : undefined,
      message: message.trim(),
    });

    await contact.save();
    console.log('Contact form submitted:', { name: contact.name, email: contact.email });

    const supportEmail = process.env.SUPPORT_EMAIL;
    if (!validateEmail(supportEmail)) {
      throw new Error('Support email is not configured or invalid');
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    await sendEmail({
      email: supportEmail,
      subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
      html,
    });

    res.status(201).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error processing contact form:', error.message);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

module.exports = router;