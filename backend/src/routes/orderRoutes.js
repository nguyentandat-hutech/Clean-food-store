const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Routes CÔNG KHAI (VNPay callbacks — không cần JWT) ───────────
// GET  /api/orders/vnpay-ipn       → VNPay IPN (server-to-server)
router.get('/vnpay-ipn', orderController.vnpayIPN);

// GET  /api/orders/vnpay-return    → VNPay redirect user về
router.get('/vnpay-return', orderController.vnpayReturn);

// ── Tất cả routes phía dưới đều yêu cầu đăng nhập ───────────────
router.use(protect);

// ── Routes cho User ──────────────────────────────────────────────
// POST   /api/orders/checkout         → Đặt hàng COD
router.post('/checkout', orderController.checkout);

// POST   /api/orders/checkout-vnpay   → Đặt hàng VNPay (trả URL)
router.post('/checkout-vnpay', orderController.checkoutVNPay);

// GET    /api/orders                  → Danh sách đơn hàng của user
router.get('/', orderController.getMyOrders);

// ── Routes cho Admin (đặt TRƯỚC /:id) ────────────────────────────
// GET    /api/orders/admin/all        → Tất cả đơn (admin)
router.get('/admin/all', authorize('admin'), orderController.getAllOrders);

// ── Routes có param :id (đặt SAU static routes) ─────────────────
// GET    /api/orders/:id              → Chi tiết 1 đơn hàng
router.get('/:id', orderController.getOrderById);

// PATCH  /api/orders/:id/cancel       → Hủy đơn hàng
router.patch('/:id/cancel', orderController.cancelOrder);

// PATCH  /api/orders/:id/status       → Cập nhật trạng thái (admin)
router.patch('/:id/status', authorize('admin'), orderController.updateOrderStatus);

module.exports = router;
