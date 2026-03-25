// ============================================================
// AI Routes — Endpoint quét AI kiểm tra độ tươi thực phẩm
// ============================================================

const express = require('express');
const router = express.Router();
const aiScanUpload = require('../middlewares/aiScanUpload');
const aiController = require('../controllers/aiController');

// POST /api/ai/scan-freshness
// Upload 1 ảnh thực phẩm → AI đánh giá độ tươi → trả về JSON
router.post('/scan-freshness', aiScanUpload.single('image'), aiController.scanFreshness);

module.exports = router;
