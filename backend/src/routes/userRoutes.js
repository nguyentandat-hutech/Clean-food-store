const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Tất cả routes trong file này đều yêu cầu đăng nhập
router.use(protect);

// GET  /api/users/profile  → Lấy thông tin cá nhân
// PUT  /api/users/profile  → Cập nhật họ tên, số điện thoại
router
    .route('/profile')
    .get(userController.getProfile)
    .put(userController.updateProfile);

// GET  /api/users          → [Admin only] Lấy danh sách tất cả users
router.get('/', authorize('admin'), userController.getAllUsers);

// PATCH /api/users/:id/role → [Admin only] Thay đổi role của user
// Business rule: Admin không thể thay đổi role của Admin khác (cùng cấp)
router.patch('/:id/role', authorize('admin'), userController.updateUserRole);

module.exports = router;
