const express = require('express');
const router = express.Router();

const { register, login, logout } = require('../controllers/authController');

// Kayıt ol
router.post('/register', register);

// Giriş yap
router.post('/login', login);

// Çıkış yap
router.post('/logout', logout);

module.exports = router;
