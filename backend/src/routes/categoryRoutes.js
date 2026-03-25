const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Routes công khai (ai cũng xem được danh sách & chi tiết) ──
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// ── Routes chỉ dành cho Admin ──────────────────────────────────
// protect: phải đăng nhập | authorize('admin'): phải là admin
router.post('/', protect, authorize('admin'), categoryController.createCategory);
router.put('/:id', protect, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
