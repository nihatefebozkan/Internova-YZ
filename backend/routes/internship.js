const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const internshipController  = require('../controllers/internshipController');
const applicationController = require('../controllers/applicationController');
// const internshipBook        = require('../services/internshipBook');
// const companyDashboard      = require('../services/companyDashboard');

// Tüm stajları getir
router.get('/', internshipController.getAllInternships);

// Staj getir
router.get('/:id', internshipController.getInternshipById);

// Staj ilanı oluştur (şirket)
router.post('/', protect, roleGuard('company', 'admin'), internshipController.createInternship);

// Staj ilanı güncelle
router.put('/:id', protect, roleGuard('company', 'admin'), internshipController.updateInternship);

// Staj ilanı sil (pasife al)
router.delete('/:id', protect, roleGuard('company', 'admin'), internshipController.deleteInternship);

// Staja başvur (öğrenci)
router.post('/:id/apply', protect, roleGuard('student'), applicationController.applyForInternship);

// Staj defterini getir
router.get('/:id/book', (req, res) => {});

// Günlük giriş ekle
router.post('/:id/book/entries', (req, res) => {});

// Şirket IK onayı
router.put('/:id/book/entries/:entryId/hr-approve', (req, res) => {});

// BTÜ akademisyen onayı
router.put('/:id/book/academic-approve', (req, res) => {});

// Staj defteri PDF indir
router.get('/:id/book/pdf', (req, res) => {});

module.exports = router;
