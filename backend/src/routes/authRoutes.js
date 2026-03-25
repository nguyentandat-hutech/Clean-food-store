const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/auth/register → Đăng ký tài khoản mới (public)
router.post('/register', authController.register);

// POST /api/auth/login → Đăng nhập, nhận JWT (public)
router.post('/login', authController.login);

// GET /api/auth/me → Lấy thông tin user đang đăng nhập (protected)
router.get('/me', protect, authController.getMe);

module.exports = router;
