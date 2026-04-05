// ============================================================
// Stats Routes — API thống kê cho Admin Dashboard
// Tất cả endpoints đều yêu cầu đăng nhập + quyền admin
// ============================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const statsController = require('../controllers/statsController');

// GET /api/stats/revenue — Doanh thu theo tháng/ngày
router.get('/revenue', protect, authorize('admin'), statsController.getRevenue);

// GET /api/stats/top-sellers — Top sản phẩm bán chạy
router.get('/top-sellers', protect, authorize('admin'), statsController.getTopSellers);

// GET /api/stats/expiring-soon — Lô hàng sắp hết hạn
router.get('/expiring-soon', protect, authorize('admin'), statsController.getExpiringSoon);

module.exports = router;
