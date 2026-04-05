const express = require('express');
const router = express.Router();

const farmController = require('../controllers/farmController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Routes công khai (ai cũng xem được danh sách & chi tiết) ──
router.get('/', farmController.getAllFarms);
router.get('/:id', farmController.getFarmById);

// ── Routes chỉ dành cho Admin ──────────────────────────────────
// protect: phải đăng nhập | authorize('admin'): phải là admin
router.post('/', protect, authorize('admin'), farmController.createFarm);
router.put('/:id', protect, authorize('admin'), farmController.updateFarm);
router.delete('/:id', protect, authorize('admin'), farmController.deleteFarm);

module.exports = router;
