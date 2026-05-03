const roleGuard = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user, auth.js (protect) tarafından doldurulmuş olmalıdır.
        //req.user yoksa veya rol listede değilse erişim engellenir.
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Erişim Engellendi: Bu işlem için şu yetkiler gerekli: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};

module.exports = roleGuard;