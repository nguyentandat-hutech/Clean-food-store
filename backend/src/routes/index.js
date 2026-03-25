// Ví dụ route mẫu - TẠM THỜI để kiểm tra server đang chạy
// Xóa file này khi bắt đầu viết business routes thực tế
const express = require('express');
const router = express.Router();

// GET /api/health → Kiểm tra server sống
router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Server is running 🚀', timestamp: new Date() });
});

module.exports = router;
