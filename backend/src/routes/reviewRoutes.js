// ============================================================
// Review Routes — API đánh giá sản phẩm
// ============================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const reviewController = require('../controllers/reviewController');

// GET /api/reviews/product/:productId — Lấy reviews theo sản phẩm (công khai)
router.get('/product/:productId', reviewController.getReviewsByProduct);

// POST /api/reviews — Tạo đánh giá mới (cần đăng nhập)
router.post('/', protect, reviewController.createReview);

// PUT /api/reviews/:id — Sửa đánh giá (chủ sở hữu)
router.put('/:id', protect, reviewController.updateReview);

// DELETE /api/reviews/:id — Xóa đánh giá (chủ sở hữu hoặc admin)
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;
