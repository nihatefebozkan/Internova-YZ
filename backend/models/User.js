const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'company', 'admin'], default: 'student' },
  university: { type: String },
  department: { type: String },
  cv: { type: String },
  profilePhoto: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
