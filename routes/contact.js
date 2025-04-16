const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter with App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // genaiburahul@gmail.com
    pass: process.env.EMAIL_PASS, // tsvb jpuj qasq hlzx
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  logger: process.env.NODE_ENV === 'development', // Log to console in development
});

// Middleware to validate email addresses
const validateEmail = (email) => {
  const emailRegex = /\S+@\S+\.\S+/;
  return emailRegex.test(email);
};

// POST /api/contact - Handle contact form submission and send email
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // Enhanced validation
  const validationErrors = {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    validationErrors.name = 'Name is required and must be a non-empty string';
  }

  if (!email || typeof email !== 'string' || !validateEmail(email)) {
    validationErrors.email = 'A valid email is required';
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    validationErrors.message = 'Message is required and must be a non-empty string';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors: validationErrors });
  }

  try {
    // Save to MongoDB
    const contact = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      subject: subject ? subject.trim() : undefined,
      message: message.trim(),
    });

    await contact.save();
    console.log('Contact form submitted:', { name: contact.name, email: contact.email, subject: contact.subject });

    // Define recipient email (fallback to EMAIL_USER if SUPPORT_EMAIL is not set)
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

    if (!validateEmail(supportEmail)) {
      throw new Error('Support email is not configured or invalid');
    }

    // Send email notification
    const mailOptions = {
      from: `"Contact Form" <${process.env.EMAIL_USER}>`,
      to: supportEmail,
      subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
      text: `
        New message received:
        Name: ${name}
        Email: ${email}
        Phone: ${phone || 'Not provided'}
        Subject: ${subject || 'Not provided'}
        Message: ${message}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent to', supportEmail, 'for:', { name, email });

    res.status(201).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error processing contact form:', error.message);

    let errorResponse = { error: 'Failed to send message' };

    if (error.response && error.responseCode === 535) {
      errorResponse.details = 'Authentication failed. Check EMAIL_USER and EMAIL_PASS.';
    } else if (error.code === 'EDNS' || error.code === 'EENVELOPE') {
      errorResponse.details = 'Invalid recipient email address.';
    } else {
      errorResponse.details = error.message;
    }

    res.status(500).json(errorResponse);
  }
});

module.exports = router;