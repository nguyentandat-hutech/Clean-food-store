const express = require('express');
const router = express.Router();

const batchController = require('../controllers/batchController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Tất cả routes đều yêu cầu đăng nhập + quyền admin ────────
// Quản lý lô hàng là chức năng nội bộ, không public

// --- Routes đặc biệt (phải đặt TRƯỚC routes có :id để tránh conflict) ---
// GET /api/batches/inventory-report → Báo cáo tồn kho tổng hợp
router.get('/inventory-report', protect, authorize('admin'), batchController.getInventoryReport);

// GET /api/batches/expiring?days=7 → Lô sắp hết hạn
router.get('/expiring', protect, authorize('admin'), batchController.getExpiringBatches);

// GET /api/batches/stock/:productId → Tồn kho thực tế của 1 sản phẩm
router.get('/stock/:productId', protect, authorize('admin'), batchController.getEffectiveStock);

// --- Routes CRUD chuẩn ---
// GET /api/batches → Danh sách lô hàng (phân trang, filter)
router.get('/', protect, authorize('admin'), batchController.getAllBatches);

// GET /api/batches/:id → Chi tiết 1 lô hàng
router.get('/:id', protect, authorize('admin'), batchController.getBatchById);

// POST /api/batches → Tạo lô hàng mới
router.post('/', protect, authorize('admin'), batchController.createBatch);

// PUT /api/batches/:id → Cập nhật lô hàng
router.put('/:id', protect, authorize('admin'), batchController.updateBatch);

// DELETE /api/batches/:id → Xóa lô hàng
router.delete('/:id', protect, authorize('admin'), batchController.deleteBatch);

module.exports = router;
