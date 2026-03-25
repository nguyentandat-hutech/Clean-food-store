// ============================================================
// Multer Middleware — AI Freshness Scan (Ảnh tạm thời)
// Lưu ảnh vào uploads/ai-temp/, tự động xóa sau khi AI xử lý
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createError } = require('../utils/responseHelper');

// Đảm bảo thư mục uploads/ai-temp/ tồn tại
const uploadDir = path.join(__dirname, '../../uploads/ai-temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Cấu hình lưu trữ ảnh tạm ─────────────────────────────────
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `ai-scan-${uniqueSuffix}${ext}`);
    },
});

// ── Bộ lọc: chỉ chấp nhận JPG và PNG ──────────────────────────
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(createError(400, 'Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG.'), false);
    }
};

// ── Khởi tạo Multer instance cho AI Scan ───────────────────────
const aiScanUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
        files: 1,                   // Chỉ cho phép 1 file duy nhất
    },
});

module.exports = aiScanUpload;
