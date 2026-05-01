// Sertifika Doğrulama ve Dijital Rozet Servisi
// Görev: Vision API ile OCR doğrulama, QR kodlu dijital sertifika oluşturma
// Dolduracak: Bilgenur (Google Vision API + QR generation)

// const vision = require('@google-cloud/vision');
// const QRCode = require('qrcode');

/**
 * Yüklenen sertifika görselini OCR ile analiz eder
 * Eşleşme eşiği: %85
 * @param {string} imageUrl - Sertifika görseli URL'i
 * @param {object} expectedData - { name, courseName, platform, date }
 * @returns {object} { isValid, matchScore, extractedData }
 */
const verifyCertificateWithOCR = async (imageUrl, expectedData) => {};

/**
 * Doğrulanmış sertifika için QR kodlu dijital sertifika oluşturur
 * @param {string} userId
 * @param {string} certificationId
 * @returns {string} Sertifika PDF/PNG URL'i
 */
const generateDigitalCertificate = async (userId, certificationId) => {};

/**
 * QR kod URL'inden sertifika bilgilerini doğrular (public endpoint için)
 * @param {string} certificationId
 * @returns {object} Sertifika detayları veya geçersiz mesajı
 */
const verifyCertificateByQR = async (certificationId) => {};

/**
 * Kullanıcının tüm doğrulanmış sertifikalarını getirir
 * @param {string} userId
 */
const getUserCertificates = async (userId) => {};

module.exports = { verifyCertificateWithOCR, generateDigitalCertificate, verifyCertificateByQR, getUserCertificates };
