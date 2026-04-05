const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// ── Routes công khai (ai cũng xem được danh sách & chi tiết) ──
router.get('/', productController.getAllProducts);

// Route tìm kiếm nâng cao (alias — dùng chung logic với getAllProducts)
// GET /api/products/search?name=...&category=...&farm=...&minPrice=...&maxPrice=...
router.get('/search', productController.getAllProducts);

router.get('/:id', productController.getProductById);

// ── Routes chỉ dành cho Admin ──────────────────────────────────
// protect: phải đăng nhập | authorize('admin'): phải là admin
// upload.array('images', 5): cho phép upload tối đa 5 ảnh
router.post('/', protect, authorize('admin'), upload.array('images', 5), productController.createProduct);
router.put('/:id', protect, authorize('admin'), upload.array('images', 5), productController.updateProduct);
router.delete('/:id', protect, authorize('admin'), productController.deleteProduct);

module.exports = router;
