const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Tất cả route đều yêu cầu đăng nhập ──────────────────────────
router.use(protect);

// ── Routes cho User ──────────────────────────────────────────────
// POST   /api/orders/checkout     → Đặt hàng COD
router.post('/checkout', orderController.checkout);

// GET    /api/orders              → Danh sách đơn hàng của user
router.get('/', orderController.getMyOrders);

// ── Routes cho Admin (đặt TRƯỚC /:id để Express không nhầm 'admin' là ID) ──
// GET    /api/orders/admin/all    → Tất cả đơn (admin)
router.get('/admin/all', authorize('admin'), orderController.getAllOrders);

// ── Routes có param :id (đặt SAU static routes) ─────────────────
// GET    /api/orders/:id          → Chi tiết 1 đơn hàng
router.get('/:id', orderController.getOrderById);

// PATCH  /api/orders/:id/cancel   → Hủy đơn hàng
router.patch('/:id/cancel', orderController.cancelOrder);

// PATCH  /api/orders/:id/status   → Cập nhật trạng thái (admin)
router.patch('/:id/status', authorize('admin'), orderController.updateOrderStatus);

module.exports = router;
