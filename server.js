require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const EXCEL_FILE = path.join(DATA_DIR, 'contacts.xlsx');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function appendToExcel(data) {
  let workbook;
  if (fs.existsSync(EXCEL_FILE)) {
    workbook = XLSX.readFile(EXCEL_FILE);
  } else {
    workbook = XLSX.utils.book_new();
  }

  let worksheet;
  const newRow = {
    Name: data.name,
    Email: data.email,
    Phone: data.phone,
    Message: data.message,
    Date: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
  };

  if (workbook.SheetNames.includes('Contacts')) {
    worksheet = workbook.Sheets['Contacts'];
    const existingData = XLSX.utils.sheet_to_json(worksheet);
    existingData.push(newRow);
    worksheet = XLSX.utils.json_to_sheet(existingData);
  } else {
    worksheet = XLSX.utils.json_to_sheet([newRow]);
  }

  workbook.Sheets['Contacts'] = worksheet;
  workbook.SheetNames = ['Contacts'];
  XLSX.writeFile(workbook, EXCEL_FILE);
}

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email aur message zaroori hai' });
  }

  try {
    appendToExcel({ name, email, phone, message });

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

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Message mil gaya! Email bhi bhej diya.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Kuch gadbad ho gayi. Dobara try karein.' });
  }
});

app.get('/api/contacts', (req, res) => {
  if (!fs.existsSync(EXCEL_FILE)) {
    return res.json({ success: true, data: [] });
  }
  const workbook = XLSX.readFile(EXCEL_FILE);
  if (workbook.SheetNames.includes('Contacts')) {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets['Contacts']);
    return res.json({ success: true, data });
  }
  res.json({ success: true, data: [] });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
