const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Routes yêu cầu đăng nhập + quyền admin ────────────────────

// GET /api/inventory/alerts?days=3 → Cảnh báo kho hàng
router.get('/alerts', protect, authorize('admin'), inventoryController.getInventoryAlerts);

module.exports = router;
