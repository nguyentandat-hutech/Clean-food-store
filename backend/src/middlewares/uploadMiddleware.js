const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { createError } = require('../utils/responseHelper');

// ── Tạo thư mục một lần khi module được tải ───────────────────────────
// mkdirSync với recursive:true không throw nếu thư mục đã tồn tại — an toàn khi gọi nhiều lần
const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Cấu hình nơi lưu file upload ──────────────────────────────
const storage = multer.diskStorage({
    // Thư mục đích: backend/uploads/products/
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    // Đặt tên file: timestamp + random + extension gốc
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `product-${uniqueSuffix}${ext}`);
    },
});

// ── Bộ lọc loại file (chỉ chấp nhận ảnh) ──────────────────────
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Chấp nhận file
    } else {
        cb(createError(400, 'Chỉ chấp nhận file ảnh định dạng: JPG, JPEG, PNG, WEBP'), false);
    }
};

// ── Khởi tạo Multer instance ───────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB mỗi file
        files: 5,                   // Tối đa 5 file mỗi request
    },
});

module.exports = upload;
