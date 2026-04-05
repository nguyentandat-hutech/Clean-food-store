const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

// ── Tất cả route giỏ hàng đều yêu cầu đăng nhập ───────────────
router.use(protect);

// GET    /api/cart              → Lấy giỏ hàng
router.get('/', cartController.getCart);

// POST   /api/cart              → Thêm sản phẩm vào giỏ
router.post('/', cartController.addToCart);

// PUT    /api/cart/:productId   → Cập nhật số lượng
router.put('/:productId', cartController.updateCartItem);

// DELETE /api/cart/:productId   → Xóa sản phẩm khỏi giỏ
router.delete('/:productId', cartController.removeCartItem);

// DELETE /api/cart              → Xóa toàn bộ giỏ hàng
router.delete('/', cartController.clearCart);

module.exports = router;
