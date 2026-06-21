const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

let Contact;
try {
  Contact = mongoose.model('Contact');
} catch {
  Contact = mongoose.model('Contact', contactSchema);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    console.error('MongoDB error:', err.message);
  }
}

app.post('/api/contact', async (req, res) => {
  await connectDB();
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email aur message zaroori hai' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const contact = new Contact({ name, email, phone, message });
      await contact.save();
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.RECEIVER_EMAIL || process.env.GMAIL_USER,
      subject: `New Contact: ${name}`,
      html: `
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Message:</strong> ${message}</p>
        <hr>
        <p style="color:gray;">Received at ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>
      `,
    };

    transporter.sendMail(mailOptions).catch(err => console.error('Email error:', err.message));

    res.json({ success: true, message: 'Message mil gaya!' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Kuch gadbad ho gayi. Dobara try karein.' });
  }
});

app.get('/api/contacts', async (req, res) => {
  await connectDB();
  try {
    const data = await Contact.find().sort({ date: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data load nahi ho paya' });
  }
});

module.exports = app;
