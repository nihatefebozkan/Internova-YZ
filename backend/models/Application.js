const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  student: { 
    // Başvuruyu yapan öğrencinin User tablosundaki ID'si
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Başvuru için öğrenci bilgisi zorunludur'] 
  },
  internship: { 
    // Başvurulan staj ilanının Internship tablosundaki ID'si
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Internship', 
    required: [true, 'Hangi ilana başvurulduğu belirtilmelidir'] 
  },
  company: { 
    // İlanın sahibi olan şirketin Company tablosundaki ID'si
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: [true, 'Şirket bilgisi eksik'] 
  },
  status: { 
    type: String, 
    // Başvuru süreci sadece bu üç aşamadan biri olabilir
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: 'Geçersiz başvuru durumu'
    }, 
    default: 'pending' 
  },
  coverLetter: { 
    // Öğrencinin yazdığı ön yazı veya motivasyon mektubu
    type: String,
    trim: true,
    maxlength: [1000, 'Ön yazı en fazla 1000 karakter olabilir']
  },
}, { 
  // Başvuru tarihini otomatik takip etmek için
  timestamps: true 
});

module.exports = mongoose.model('Application', ApplicationSchema);
