const express = require('express');
const router = express.Router();

// const aiAssistant  = require('../services/aiAssistant');
// const mentorBot    = require('../services/mentorBot');
// const teamMatcher  = require('../services/teamMatcher');
// const careerMap    = require('../services/careerMap');

// BTÜ yönetmeliği / PDF soru-cevap
router.post('/ask', (req, res) => {});

// PDF döküman yükleme ve vektör DB'ye kayıt
router.post('/upload-pdf', (req, res) => {});

// Öğrenci mentor sohbeti
router.post('/mentor/student', (req, res) => {});

// Şirket mentor sohbeti
router.post('/mentor/company', (req, res) => {});

// İlan metni iyileştirme
router.post('/mentor/improve-listing', (req, res) => {});

// Özgeçmiş analizi
router.post('/mentor/review-resume', (req, res) => {});

// Kişiselleştirilmiş yol haritası
router.get('/career/roadmap', (req, res) => {});

// Radar grafik verisi
router.get('/career/radar', (req, res) => {});

// Bursa sanayi beceri talebi
router.get('/career/industry-skills', (req, res) => {});

// Proje için takım önerisi
router.post('/team/match', (req, res) => {});

// Desteklenen proje türleri
router.get('/team/project-types', (req, res) => {});

module.exports = router;
