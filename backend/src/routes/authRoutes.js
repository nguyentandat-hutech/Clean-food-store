// ============================================================
// FILE: backend/src/routes/authRoutes.js
// Muc dich: Dinh nghia cac endpoint (URL) cho chuc nang xac thuc
// Tat ca routes trong file nay bat dau bang /api/auth/...
// ============================================================

// Nhap express va tao Router — doi tuong quan ly route
const express = require('express');
const router = express.Router();

// Nhap authController — xu ly logic cho tung request
const authController = require('../controllers/authController');

// Nhap middleware protect de bao ve route can dang nhap
const { protect } = require('../middlewares/authMiddleware');

// ── ROUTE DANG KY ────────────────────────────────────────────────────────────
// POST /api/auth/register
// Cong khai: khong can token
// Request body: { "name": "...", "email": "...", "password": "..." }
// Response: { success, message, data: { user, token } }
router.post('/register', authController.register);

// ── ROUTE DANG NHAP ──────────────────────────────────────────────────────────
// POST /api/auth/login
// Cong khai: khong can token
// Request body: { "email": "...", "password": "..." }
// Response: { success, message, data: { user, token } }
router.post('/login', authController.login);

// ── ROUTE LAY THONG TIN NGUOI DUNG DANG NHAP ─────────────────────────────────
// GET /api/auth/me
// Bao ve bang protect: phai gui kem header "Authorization: Bearer <token>"
// Middleware protect kiem tra token → gan req.user → goi controller
// Response: { success, message, data: { user } }
router.get('/me', protect, authController.getMe);

// Xuat router de file index.js cua routes tich hop vao app
module.exports = router;
