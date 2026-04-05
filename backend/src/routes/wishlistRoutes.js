// ============================================================
// Wishlist Routes — API danh sách yêu thích
// ============================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const wishlistController = require('../controllers/wishlistController');

// Tất cả wishlist routes đều yêu cầu đăng nhập

// GET /api/wishlist — Lấy toàn bộ wishlist (có populate sản phẩm)
router.get('/', protect, wishlistController.getWishlist);

// GET /api/wishlist/check/:productId — Kiểm tra sản phẩm có trong wishlist không
// Đặt TRƯỚC /:productId để tránh conflict với route POST
router.get('/check/:productId', protect, wishlistController.checkProduct);

// POST /api/wishlist/:productId — Toggle sản phẩm (thêm nếu chưa có, xóa nếu đã có)
router.post('/:productId', protect, wishlistController.toggleProduct);

// DELETE /api/wishlist/:productId — Xóa sản phẩm khỏi wishlist
router.delete('/:productId', protect, wishlistController.removeProduct);

module.exports = router;
