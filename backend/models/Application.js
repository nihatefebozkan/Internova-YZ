const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  coverLetter: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema);
