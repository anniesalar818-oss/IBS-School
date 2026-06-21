const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email aur message zaroori hai' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.RECEIVER_EMAIL || process.env.GMAIL_USER,
      subject: `New Contact: ${name}`,
      html: `<h2>New Contact Form Message</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone || 'N/A'}</p><p><strong>Message:</strong> ${message}</p><hr><p style="color:gray;">Received at ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>`,
    });
    res.json({ success: true, message: 'Message mil gaya!' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: 'Email nahi ja paya.' });
  }
};
