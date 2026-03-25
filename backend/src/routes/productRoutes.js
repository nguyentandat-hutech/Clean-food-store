const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ── Routes công khai (ai cũng xem được danh sách & chi tiết) ──
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// ── Routes chỉ dành cho Admin ──────────────────────────────────
// protect: phải đăng nhập | authorize('admin'): phải là admin
router.post('/', protect, authorize('admin'), productController.createProduct);
router.put('/:id', protect, authorize('admin'), productController.updateProduct);
router.delete('/:id', protect, authorize('admin'), productController.deleteProduct);

module.exports = router;
