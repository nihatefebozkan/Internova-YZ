const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  description: { type: String },
  requirements: { type: String },
  duration: { type: Number },
  location: { type: String },
  type: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'onsite' },
  deadline: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Internship', InternshipSchema);
