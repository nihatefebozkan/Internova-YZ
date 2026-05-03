// JWT Doğrulama Middleware
// Görev: Token çöz, req.user'a ekle, rol kontrolü
// Dolduracak: Mustafa

const jwt = require('jsonwebtoken');

//Giriş kontrolü
const protect = (req, res, next) => {
  // TODO: Authorization header'dan token al, doğrula, req.user'a ata
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Lütfen giriş yapın." });
  }

  try {
    // .env içindeki JWT_SECRET ile token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Çözülen kullanıcı bilgisini (id, role vb.) isteğe ekle
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Geçersiz token." });
  }

};


// TODO: req.user.role roles listesinde yoksa 403 dön

//authorize roleGuard.js içerisine roleGuard olarak taşındı.

/*
const authorize = (...roles) => {

  return (req, res, next) => {

    //req.user.role bilgisi protect middleware ile gelir
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Bu rotaya erişmek için ${roles.join(', ')} yetkisi gerekiyor.`
      });

    }
    next();
  }
};
*/

module.exports = { protect };
