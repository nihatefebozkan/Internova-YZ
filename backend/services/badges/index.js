// Aktif Ekosistem ve Dijital Rozet Servisi
// Görev: Bursa Merkezi Takvim, QR geçiş, oyunlaştırma, dijital rozetler
// Dolduracak: Bilgenur & Melike (rozet motoru + takvim + QR geçiş)

/**
 * Öğrenciye belirli bir başarı için rozet verir
 * Rozet türleri: İlk Başvuru, İlk Staj, Sertifika Ustası, Takım Lideri vb.
 * @param {string} userId
 * @param {string} badgeType
 * @param {object} metadata - { triggeredBy, date }
 */
const awardBadge = async (userId, badgeType, metadata) => {};

/**
 * Kullanıcının tüm rozetlerini ve XP puanlarını getirir
 * @param {string} userId
 * @returns {object} { badges, totalXP, level, nextLevelXP }
 */
const getUserBadges = async (userId) => {};

/**
 * Bursa Merkezi etkinlik takvimini getirir
 * @param {object} filters - { startDate, endDate, type }
 * @returns {Array} Etkinlik listesi
 */
const getCentralCalendar = async (filters) => {};

/**
 * QR kod ile etkinlik/mekân girişini doğrular
 * @param {string} qrToken
 * @param {string} userId
 * @returns {object} { isValid, event, pointsEarned }
 */
const validateQREntry = async (qrToken, userId) => {};

/**
 * Platform geneli liderlik tablosunu getirir
 * @param {string} category - 'global' | 'department' | 'semester'
 */
const getLeaderboard = async (category) => {};

module.exports = { awardBadge, getUserBadges, getCentralCalendar, validateQREntry, getLeaderboard };
