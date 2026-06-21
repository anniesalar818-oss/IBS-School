const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

let Contact;
try { Contact = mongoose.model('Contact'); } catch { Contact = mongoose.model('Contact', contactSchema); }

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const data = await Contact.find().sort({ date: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data load nahi ho paya' });
  }
};
