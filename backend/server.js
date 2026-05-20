/**
 * ⚠️  LEGACY — Bu Node.js/MongoDB backend artık aktif değil.
 *  Aktif backend: backend/app/ (Python/FastAPI, port 8002)
 *  Bu dosya yalnızca referans amaçlı korunuyor.
 *  MongoDB bağlantısı olmadığı için başlatılamaz.
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/companies', require('./routes/company'));
app.use('/api/internships', require('./routes/internship'));
app.use('/api/ai', require('./routes/ai'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'İnternova YZ API çalışıyor! 🚀' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});