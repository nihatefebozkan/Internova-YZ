const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'İsim ve soyisim alanı zorunludur'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'E-posta adresi zorunludur'], 
    unique: true, // Bir e-posta adresiyle sadece bir hesap açılabilir
    lowercase: true, 
    trim: true,
    // E-posta formatının doğruluğunu kontrol eden Regex
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Lütfen geçerli bir e-posta adresi giriniz']
  },
  password: { 
    type: String, 
    required: [true, 'Şifre alanı zorunludur'],
    minlength: [6, 'Şifre güvenliğiniz için en az 6 karakter olmalıdır']
  },
  role: { 
    type: String, 
    // Sisteme giren kişinin yetkilerini belirleyen alan
    enum: {
      values: ['student', 'company', 'admin'],
      message: 'Geçersiz kullanıcı rolü'
    }, 
    default: 'student' 
  },
  university: { 
    type: String,
    trim: true,
    // Sadece öğrenci rolü seçildiğinde doldurulması önerilir ama teknik olarak opsiyonel bırakıldı
    default: ''
  },
  department: { 
    type: String,
    trim: true,
    default: ''
  },
  cv: { 
    type: String, // CV dosyasının (PDF vb.) yüklendiği bulut yolu (URL)
    default: ''
  },
  profilePhoto: { 
    type: String,
    default: 'default-profile.png' // Profil fotoğrafı yüklemeyenler için varsayılan görsel
  },
}, { 
  // Kayıt ve son güncelleme tarihlerini otomatik tutar
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
