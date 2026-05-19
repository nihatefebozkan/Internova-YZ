const Application = require('../models/Application');
const Internship = require('../models/Internship');

// @desc    Öğrencinin staj ilanına başvurması
// @route   POST /api/internships/:id/apply
// @access  Private (Sadece student rolündekiler)
const applyForInternship = async (req, res) => {
  try {
    const internshipId = req.params.id;
    const studentId = req.user.id;
    const { coverLetter } = req.body;

    // İlan var mı ve aktif mi kontrol et
    const internship = await Internship.findById(internshipId);
    if (!internship || !internship.isActive) {
      return res.status(404).json({ success: false, message: 'Başvurmak istediğiniz ilan bulunamadı veya pasif durumda.' });
    }

    // Öğrenci daha önce bu ilana başvurmuş mu kontrol et
    const existingApplication = await Application.findOne({
      student: studentId,
      internship: internshipId
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'Bu ilana zaten başvurdunuz.' });
    }

    // Yeni başvuru oluştur
    const application = await Application.create({
      student: studentId,
      internship: internshipId,
      company: internship.company, // İlanın bağlı olduğu şirket
      coverLetter
    });

    res.status(201).json({
      success: true,
      message: 'Başvurunuz başarıyla alındı.',
      data: application
    });
  } catch (error) {
    console.error('Staja başvururken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Şirketin, kendi ilanına gelen başvuruları görüntülemesi
// @route   GET /api/companies/:id/listings/:listingId/applications
// @access  Private (Sadece ilgili company ve admin)
const getCompanyApplications = async (req, res) => {
  try {
    const { listingId } = req.params;

    // Şirket sadece kendi ilanına gelen başvuruları görebilsin
    // Güvenlik: İstenirse req.params.id ile req.user.id uyuşuyor mu diye kontrol eklenebilir.
    
    const applications = await Application.find({ internship: listingId })
      .populate('student', 'name email university department cv profilePhoto')
      .populate('internship', 'title type');

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error('Başvurular listelenirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Şirketin başvuruyu değerlendirmesi (Kabul/Ret)
// @route   PUT /api/companies/:id/applications/:appId/process
// @access  Private (Sadece ilgili company ve admin)
const updateApplicationStatus = async (req, res) => {
  try {
    const { appId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum bilgisi. Sadece approved veya rejected olabilir.' });
    }

    const application = await Application.findById(appId);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Başvuru bulunamadı.' });
    }

    // Başvuru durumunu güncelle
    application.status = status;
    await application.save();

    res.status(200).json({
      success: true,
      message: `Başvuru durumu '${status}' olarak güncellendi.`,
      data: application
    });
  } catch (error) {
    console.error('Başvuru güncellenirken oluşan hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

module.exports = {
  applyForInternship,
  getCompanyApplications,
  updateApplicationStatus
};
