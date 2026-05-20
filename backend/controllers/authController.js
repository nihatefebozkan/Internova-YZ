const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Token oluşturma fonksiyonu
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error('HATA: JWT_SECRET environment variable tanımlı değil');
    process.exit(1);
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Yeni kullanıcı kayıt et (Register)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, university, department } = req.body;

    // Kullanıcı var mı kontrol et
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'Bu e-posta adresi ile zaten bir hesap var' });
    }

    // Yeni kullanıcı oluştur (Şifre modeldeki pre-save hook ile otomatik hash'lenecek)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student', // Varsayılan olarak öğrenci
      university,
      department
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ success: false, message: 'Geçersiz kullanıcı verisi' });
    }
  } catch (error) {
    console.error('Kayıt olurken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası: ' + error.message });
  }
};

// @desc    Kullanıcı girişi (Login)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // E-posta ve şifre girilmiş mi kontrol et
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Lütfen e-posta ve şifrenizi giriniz' });
    }

    // Kullanıcıyı veritabanında bul
    const user = await User.findOne({ email });

    // Kullanıcı varsa ve şifre (hash) eşleşiyorsa
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre' });
    }
  } catch (error) {
    console.error('Giriş yaparken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// @desc    Çıkış yap (Logout) - İstemci (Frontend) token'ı silmelidir
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  // REST API'lerde (JWT) oturum kapatma aslen frontend'in (React) token'ı localStorage/Cookie'den silmesiyle olur.
  // Backend tarafında ek bir güvence için token'ı geçersiz kılmak adına Cookie boşaltılabilir.
  res.status(200).json({ success: true, message: 'Başarıyla çıkış yapıldı' });
};

module.exports = { register, login, logout };
