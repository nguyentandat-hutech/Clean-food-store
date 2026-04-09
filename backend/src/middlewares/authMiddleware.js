// ============================================================
// FILE: backend/src/middlewares/authMiddleware.js
// Muc dich: Middleware xac thuc JWT — kiem tra token trong request
// Neu hop le: gan req.user, goi next()
// Neu khong hop le: tra loi loi 401/403
// ============================================================

// Nhap thu vien jsonwebtoken de kiem tra JWT Token
const jwt = require('jsonwebtoken');

// Nhap Model User de truy van DB kiem tra user con ton tai khong
const User = require('../models/User');

// Nhap ham tao loi co status code
const { createError } = require('../utils/responseHelper');

// ── MIDDLEWARE: KIEM TRA TOKEN ────────────────────────────────────────────────
// protect: ten truy cap, dung trong routes: router.get('/path', protect, handler)
// req: HTTP Request — thong tin client gui len
// res: HTTP Response — doi tuong de tra ket qua ve
// next: ham goi middleware tiep theo hoac controller
const protect = async (req, res, next) => {
    // Khai bao bien token, chua co gia tri
    let token;

    // Doc header Authorization tu request
    // Header dung dang: "Authorization: Bearer eyJhbGciOiJ..."
    const authHeader = req.headers.authorization;

    // Kiem tra co header va header bat dau bang 'Bearer '
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Tach chuoi theo dau cach: ['Bearer', 'eyJhbGci...']
        // [1]: lay phan tu thu 2 (index 1) — chinh la token
        token = authHeader.split(' ')[1];
    }

    // Neu khong co token trong header → tra loi 401 Unauthorized
    if (!token) {
        // next(error): chuyen loi cho errorHandler middleware xu ly
        return next(createError(401, 'Ban chua dang nhap. Vui long dang nhap de tiep tuc'));
    }

    // Kiem tra tinh hop le cua token
    let decoded;  // Se chua payload cua token sau khi verify thanh cong
    try {
        // jwt.verify: giai ma va xac thuc chu ky cua token
        // Tham so 1: token can kiem tra
        // Tham so 2: secret key dung de ky token (phai khop voi luc tao)
        // Ket qua: { id, email, role, iat, exp } — payload da nhung vao token
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        // TokenExpiredError: token da het han (exp < thoi diem hien tai)
        if (err.name === 'TokenExpiredError') {
            return next(createError(401, 'Phien dang nhap da het han. Vui long dang nhap lai'));
        }
        // Cac loi khac: token bi sua doi, chu ky sai, dinh dang sai
        return next(createError(401, 'Token khong hop le. Vui long dang nhap lai'));
    }

    // Tim user trong DB bang ID lay tu payload cua token
    // Ly do: phai kiem tra lai DB vi user co the da bi xoa sau khi cap token
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(createError(401, 'Tai khoan khong con ton tai trong he thong'));
    }

    // Kiem tra tai khoan co bi khoa khong (admin co the khoa user)
    // 403 Forbidden: da xac thuc nhung khong duoc phep
    if (!currentUser.isActive) {
        return next(createError(403, 'Tai khoan cua ban da bi vo hieu hoa'));
    }

    // Gan thong tin user vao req de cac middleware/controller phia sau su dung
    // Vi du: req.user._id, req.user.role, req.user.email
    req.user = currentUser;

    // Goi next() de tiep tuc xu ly request (den middleware hoac controller tiep theo)
    next();
};

// Xuat ham protect de cac route file su dung
module.exports = { protect };
