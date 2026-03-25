const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả routes trong file này đều yêu cầu đăng nhập
router.use(protect);

// GET  /api/users/profile  → Lấy thông tin cá nhân
// PUT  /api/users/profile  → Cập nhật họ tên, số điện thoại
router
    .route('/profile')
    .get(userController.getProfile)
    .put(userController.updateProfile);

module.exports = router;
