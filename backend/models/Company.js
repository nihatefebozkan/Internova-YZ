const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Şirket adı zorunludur'],
    trim: true,
    minlength: [2, 'Şirket adı çok kısa']
  },
  email: { 
    type: String, 
    required: [true, 'Şirket e-posta adresi zorunludur'], 
    unique: true, // Aynı e-posta ile ikinci bir şirket kaydı yapılamaz
    lowercase: true, // E-postaları her zaman küçük harf kaydeder
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Lütfen geçerli bir e-posta adresi giriniz']
  },
  phone: { 
    type: String,
    trim: true 
  },
  address: { 
    type: String,
    required: [true, 'Şirket adresi zorunludur']
  },
  sector: { 
    type: String,
    required: [true, 'Sektör bilgisi zorunludur']
  },
  description: { 
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden fazla olamaz']
  },
  logo: { 
    type: String, // Şirket logosunun URL adresi burada tutulur
    default: 'default-logo.png'
  },
  isVerified: { 
    // Şirketin gerçek olup olmadığını adminin onaylaması için kullanılır
    type: Boolean, 
    default: false 
  },
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Company', CompanySchema);