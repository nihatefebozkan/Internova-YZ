const Internship = require('../models/Internship');

// @desc    Tüm aktif staj ilanlarını getir
// @route   GET /api/internships
// @access  Public (Herkes görebilir)
const getAllInternships = async (req, res) => {
  try {
    // Sadece aktif ilanları getir ve şirket bilgisini (company referansını) populate ile doldur
    const internships = await Internship.find({ isActive: true })
      .populate({
        path: 'company',
        select: 'name sector location' // Şirketin sadece belirli alanları alınır
      });

    res.status(200).json({
      success: true,
      count: internships.length,
      data: internships
    });
  } catch (error) {
    console.error('Stajlar getirilirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Tek bir staj ilanını getir
// @route   GET /api/internships/:id
// @access  Public
const getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name description sector website email phone location logo');

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Staj ilanı bulunamadı' });
    }

    res.status(200).json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error('Staj detayı getirilirken hata:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Staj ilanı bulunamadı (Invalid ID)' });
    }
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Yeni staj ilanı oluştur
// @route   POST /api/internships
// @access  Private (Sadece company ve admin için)
const createInternship = async (req, res) => {
  try {
    // Şirket modülü tam oturmadığı için şimdilik company id'sini body'den alıyoruz.
    // İleride şirket hesabı giriş yaptığında, JWT içindeki ID'den (req.user) otomatik eşleştirilebilir.
    const internshipData = req.body;

    const internship = await Internship.create(internshipData);

    res.status(201).json({
      success: true,
      message: 'Staj ilanı başarıyla oluşturuldu',
      data: internship
    });
  } catch (error) {
    console.error('Staj oluşturulurken hata:', error.message);
    res.status(400).json({ success: false, message: 'Eksik veya hatalı veri girişi: ' + error.message });
  }
};

// @desc    Staj ilanını güncelle
// @route   PUT /api/internships/:id
// @access  Private (Sadece company ve admin)
const updateInternship = async (req, res) => {
  try {
    let internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Güncellenecek staj ilanı bulunamadı' });
    }

    // İlanı güncelle
    internship = await Internship.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Güncellenmiş veriyi döndür
      runValidators: true // Modeldeki kısıtlamaları (min length vs) kontrol et
    });

    res.status(200).json({
      success: true,
      message: 'İlan başarıyla güncellendi',
      data: internship
    });
  } catch (error) {
    console.error('Staj güncellenirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Staj ilanını sil (Pasife al)
// @route   DELETE /api/internships/:id
// @access  Private (Sadece company ve admin)
const deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Silinecek staj ilanı bulunamadı' });
    }

    // Tamamen silmek yerine pasife alma işlemi yapılır (Tarihsel verilerin ve raporların bozulmaması için)
    internship.isActive = false;
    await internship.save();

    res.status(200).json({
      success: true,
      message: 'Staj ilanı başarıyla yayından kaldırıldı (Pasife alındı)',
      data: {}
    });
  } catch (error) {
    console.error('Staj silinirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

module.exports = {
  getAllInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship
};
