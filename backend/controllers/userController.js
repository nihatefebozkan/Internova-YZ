const User = require('../models/User');

// Tüm kullanıcıları getir (Sadece admin için kullanılması önerilir)
const getAllUsers = async (req, res) => {
  try {
    // Tüm kullanıcıları getir, ancak şifrelerini yanıttan çıkar ('-password')
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Kullanıcılar getirilirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// ID'ye göre tek bir kullanıcı getir
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Kullanıcı getirilirken hata:', error.message);
    // Eğer gelen ID formatı MongoDB ObjectID'ye uygun değilse hata yakalama
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı (Geçersiz ID)' });
    }
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Kullanıcı bilgilerini güncelle
const updateUser = async (req, res) => {
  try {
    // Parola güncellemeyi bu fonksiyonda engelle (özel auth fonksiyonu olmalı)
    if (req.body.password) {
      return res.status(400).json({ success: false, message: 'Parola bu yoldan güncellenemez' });
    }

    // new: true ile güncellenmiş yeni veriyi döndürür, runValidators: true modeldeki validasyonları tetikler
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Güncellenecek kullanıcı bulunamadı' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Kullanıcı güncellenirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası veya geçersiz veri' });
  }
};

// Kullanıcı sil
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Silinecek kullanıcı bulunamadı' });
    }

    res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
      data: {}
    });
  } catch (error) {
    console.error('Kullanıcı silinirken hata:', error.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
