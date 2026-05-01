const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlandı ✅');
  } catch (error) {
    console.log('MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
