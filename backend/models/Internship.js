const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Staj başlığı zorunludur'], 
    trim: true, // Kullanıcı hatasıyla oluşan gereksiz boşlukları temizler
    minlength: [5, 'Başlık en az 5 karakter olmalıdır']
  },
  company: { 
    // MongoDB'deki Company koleksiyonu ile ilişki kurar 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: [true, 'İlanın bir şirkete ait olması gerekir'] 
  },
  description: { 
    type: String, 
    required: [true, 'Staj açıklaması zorunludur'],
    minlength: [20, 'Lütfen daha detaylı bir açıklama yazın']
  },
  requirements: { 
    type: String,
    required: [true, 'Adaylarda aranan özellikler belirtilmelidir']
  },
  duration: { 
    type: Number, 
    min: [1, 'Staj süresi en az 1 ay olmalıdır'] 
  },
  location: { 
    type: String, 
    required: [true, 'Şehir veya lokasyon bilgisi gereklidir'],
    default: 'Bursa' // Proje odağı Bursa olduğu için varsayılan değer atandı
  },
  type: { 
    type: String, 
    // Belirlenen seçenekler dışında bir giriş yapılmasını engeller
    enum: {
      values: ['remote', 'onsite', 'hybrid'],
      message: 'Lütfen geçerli bir çalışma tipi seçin'
    }, 
    default: 'onsite' 
  },
  deadline: { 
    type: Date,
    required: [true, 'Son başvuru tarihi belirtilmelidir']
  },
  isActive: { 
    // İlanın yayından kaldırılması durumunda silmek yerine pasife çekmek için kullanılır
    type: Boolean, 
    default: true 
  },
}, { 
  // createdAt ve updatedAt alanlarını otomatik yönetir (İlan tarihi takibi için)
  timestamps: true 
});

module.exports = mongoose.model('Internship', InternshipSchema);
