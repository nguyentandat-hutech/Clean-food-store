// ============================================================
// FILE: backend/src/middlewares/roleMiddleware.js
// Muc dich: Middleware phan quyen theo Role
// Phai dat SAU middleware protect (can req.user da duoc gan)
// ============================================================

// Nhap ham tao loi co HTTP status code
const { createError } = require('../utils/responseHelper');

// ── MIDDLEWARE: PHAN QUYEN THEO ROLE ─────────────────────────────────────────
// authorize la HOF (Higher-Order Function) — ham tra ve ham
// ...roles: rest parameter — co the nhan nhieu tham so: authorize('admin', 'manager')
// Vi du su dung trong route:
//   router.delete('/users/:id', protect, authorize('admin'), handler)
//   router.get('/reports', protect, authorize('admin', 'manager'), handler)
const authorize = (...roles) => {
    // Tra ve mot middleware function (Express middleware dang: (req, res, next) => {})
    return (req, res, next) => {
        // Kiem tra req.user ton tai chua
        // req.user duoc gan boi middleware protect phia truoc
        // Neu chua co req.user — co the la dev quen dat protect truoc authorize
        if (!req.user) {
            return next(createError(401, 'Ban chua xac thuc. Hay dung middleware protect truoc'));
        }

        // Kiem tra role cua user hien tai co nam trong danh sach duoc phep khong
        // roles.includes(req.user.role):
        //   - roles: mang cac role duoc phep, vi du ['admin', 'manager']
        //   - req.user.role: role thuc te cua user dang gui request
        //   - .includes(): tra ve true neu tim thay, false neu khong co
        if (!roles.includes(req.user.role)) {
            // 403 Forbidden: da dang nhap nhung khong du quyen
            return next(
                createError(
                    403,
                    // roles.join(', '): gop mang thanh chuoi, vi du: "admin, manager"
                    'Ban khong co quyen thuc hien hanh dong nay. Yeu cau quyen: [' + roles.join(', ') + ']'
                )
            );
        }

        // User co role hop le → cho phep di tiep
        next();
    };
};

// Xuat ham authorize de route files su dung
module.exports = { authorize };
