// JWT Doğrulama Middleware
// Görev: Token çöz, req.user'a ekle, rol kontrolü
// Dolduracak: Mustafa

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // TODO: Authorization header'dan token al, doğrula, req.user'a ata
  next();
};

const authorize = (...roles) => (req, res, next) => {
  // TODO: req.user.role roles listesinde yoksa 403 dön
  next();
};

module.exports = { protect, authorize };
