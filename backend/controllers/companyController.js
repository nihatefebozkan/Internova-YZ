const Company = require('../models/Company');

// @desc    Tüm şirketleri getir
// @route   GET /api/companies
// @access  Public
const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find();

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    console.error('Şirketler getirilirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Tek bir şirketi getir
// @route   GET /api/companies/:id
// @access  Public
const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Şirket detayı getirilirken hata:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı (Geçersiz ID)' });
    }
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Yeni şirket oluştur
// @route   POST /api/companies
// @access  Private (Sadece admin oluşturabilir / veya yetkilendirilmiş kişiler)
const createCompany = async (req, res) => {
  try {
    const companyExists = await Company.findOne({ email: req.body.email });
    
    if (companyExists) {
      return res.status(400).json({ success: false, message: 'Bu e-posta adresiyle zaten bir şirket kayıtlı' });
    }

    const company = await Company.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Şirket başarıyla oluşturuldu',
      data: company
    });
  } catch (error) {
    console.error('Şirket oluşturulurken hata:', error.message);
    res.status(400).json({ success: false, message: 'Geçersiz veri girişi: ' + error.message });
  }
};

// @desc    Şirket bilgilerini güncelle
// @route   PUT /api/companies/:id
// @access  Private (Sadece o şirket veya admin)
const updateCompany = async (req, res) => {
  try {
    let company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Güncellenecek şirket bulunamadı' });
    }

    company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Şirket bilgileri güncellendi',
      data: company
    });
  } catch (error) {
    console.error('Şirket güncellenirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Şirketi sil
// @route   DELETE /api/companies/:id
// @access  Private (Sadece admin silebilir)
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Silinecek şirket bulunamadı' });
    }

    res.status(200).json({
      success: true,
      message: 'Şirket başarıyla silindi',
      data: {}
    });
  } catch (error) {
    console.error('Şirket silinirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

module.exports = { 
  getAllCompanies, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  deleteCompany 
};
