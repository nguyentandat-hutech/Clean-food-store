const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Route kiểm tra mã giảm giá (user đã đăng nhập) ──────────────
// POST /api/discounts/validate
router.post('/validate', protect, discountController.validateDiscount);

// ── Routes admin (cần đăng nhập + quyền admin) ───────────────────
router.use(protect, authorize('admin'));

// GET  /api/discounts          → Danh sách tất cả mã giảm giá
router.get('/', discountController.getAllDiscounts);

// POST /api/discounts          → Tạo mã giảm giá mới
router.post('/', discountController.createDiscount);

// GET  /api/discounts/:id      → Chi tiết mã giảm giá
router.get('/:id', discountController.getDiscountById);

// PUT  /api/discounts/:id      → Cập nhật mã giảm giá
router.put('/:id', discountController.updateDiscount);

// DELETE /api/discounts/:id    → Xóa mã giảm giá
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
