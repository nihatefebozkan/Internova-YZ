const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const companyController  = require('../controllers/companyController');
const applicationController = require('../controllers/applicationController');
// const companyDashboard   = require('../services/companyDashboard');
// const teamMatcher        = require('../services/teamMatcher');

// Tüm şirketleri getir
router.get('/', companyController.getAllCompanies);

// Şirket getir
router.get('/:id', companyController.getCompanyById);

// Şirket oluştur
router.post('/', protect, roleGuard('admin'), companyController.createCompany);

// Şirket güncelle
router.put('/:id', protect, roleGuard('admin', 'company'), companyController.updateCompany);

// Şirket sil
router.delete('/:id', protect, roleGuard('admin'), companyController.deleteCompany);

// Panel özet istatistikleri
router.get('/:id/dashboard', (req, res) => {});

// Koşullu ilan oluştur
router.post('/:id/listings/conditional', (req, res) => {});

// İlana gelen başvuruları filtrele
router.get('/:id/listings/:listingId/applications', protect, roleGuard('company', 'admin'), applicationController.getCompanyApplications);

// Başvuruyu işle (kabul/ret)
router.put('/:id/applications/:appId/process', protect, roleGuard('company', 'admin'), applicationController.updateApplicationStatus);

// Stajyer değerlendirmesi gönder
router.post('/:id/internships/:internshipId/evaluate', (req, res) => {});

// Proje için takım öner
router.post('/:id/team-match', (req, res) => {});

module.exports = router;
