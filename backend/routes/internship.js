const express = require('express');
const router = express.Router();

// const internshipController  = require('../controllers/internshipController');
// const internshipBook        = require('../services/internshipBook');
// const companyDashboard      = require('../services/companyDashboard');

// Tüm stajları getir
router.get('/', (req, res) => {});

// Staj getir
router.get('/:id', (req, res) => {});

// Staj ilanı oluştur (şirket)
router.post('/', (req, res) => {});

// Staj ilanı güncelle
router.put('/:id', (req, res) => {});

// Staj ilanı sil
router.delete('/:id', (req, res) => {});

// Staja başvur (öğrenci)
router.post('/:id/apply', (req, res) => {});

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
