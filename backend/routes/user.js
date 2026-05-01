const express = require('express');
const router = express.Router();

// const userController  = require('../controllers/userController');
// const portfolio       = require('../services/portfolio');
// const certification   = require('../services/certification');
// const badges          = require('../services/badges');

// Tüm kullanıcıları getir (admin)
router.get('/', (req, res) => {});

// Kullanıcı profili getir
router.get('/:id', (req, res) => {});

// Kullanıcı profili güncelle
router.put('/:id', (req, res) => {});

// Kullanıcı sil
router.delete('/:id', (req, res) => {});

// Portfolyo getir
router.get('/:id/portfolio', (req, res) => {});

// Portfolyo güncelle
router.put('/:id/portfolio', (req, res) => {});

// GitHub sync
router.post('/:id/portfolio/sync/github', (req, res) => {});

// Sertifika yükle
router.post('/:id/portfolio/certificates', (req, res) => {});

// OCR doğrulama
router.post('/:id/certificates/verify', (req, res) => {});

// QR ile sertifika doğrulama (public)
router.get('/certificates/verify/:certId', (req, res) => {});

// Kullanıcının rozetlerini getir
router.get('/:id/badges', (req, res) => {});

module.exports = router;
