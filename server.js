require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'contacts.xlsx');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function saveToExcel(contact) {
  let wb;
  if (fs.existsSync(EXCEL_FILE)) {
    wb = XLSX.readFile(EXCEL_FILE);
  } else {
    wb = XLSX.utils.book_new();
  }
  const wsName = 'Contacts';
  let existingData = [];
  if (wb.SheetNames.includes(wsName)) {
    existingData = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);
  }
  existingData.push({
    Name: contact.name,
    Email: contact.email,
    Phone: contact.phone || '',
    Message: contact.message,
    Date: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
  });
  const newWs = XLSX.utils.json_to_sheet(existingData);
  if (wb.SheetNames.includes(wsName)) {
    wb.Sheets[wsName] = newWs;
  } else {
    XLSX.utils.book_append_sheet(wb, newWs, wsName);
  }
  XLSX.writeFile(wb, EXCEL_FILE);
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

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email aur message zaroori hai' });
  }

  try {
    const contact = new Contact({ name, email, phone, message });
    await contact.save();

    saveToExcel({ name, email, phone, message });

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
  try {
    const data = await Contact.find().sort({ date: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data load nahi ho paya' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected!');
    app.listen(PORT, () => {
      console.log(`Server chal raha hai: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
