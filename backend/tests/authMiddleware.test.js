const { protect } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const jwt = require('jsonwebtoken');

// Jest ile jwt.verify fonksiyonunu taklit ediyoruz (mock)
jest.mock('jsonwebtoken');

describe('Kimlik ve Yetki Middleware Testleri', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    // --- PROTECT (Kimlik Doğrulama) TESTLERİ ---
    describe('protect Middleware', () => {
        test('Token yoksa 401 hatası dönmeli', () => {
            protect(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('giriş yapın') })
            );
        });

        test('Geçerli token varsa req.user doldurulmalı ve next() çağrılmalı', () => {
            mockReq.headers.authorization = 'Bearer validtoken';
            const mockUser = { id: '123', role: 'student' };
            jwt.verify.mockReturnValue(mockUser);

            protect(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(mockUser);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    // --- ROLEGUARD (Yetki Kontrolü) TESTLERİ ---
    describe('roleGuard Middleware', () => {
        test('Kullanıcı rolü izin verilen listede değilse 403 dönmeli', () => {
            mockReq.user = { role: 'student' };
            // Sadece admin girebilir kuralı koyuyoruz
            const middleware = roleGuard('admin');

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('Erişim Engellendi') })
            );
        });

        test('Kullanıcı rolü uygunsa next() çağrılmalı', () => {
            mockReq.user = { role: 'company' };
            const middleware = roleGuard('company', 'admin');

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});