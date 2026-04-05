// ============================================================
// ENTRY POINT - src/server.js
// Khởi tạo Express app, kết nối DB, đăng ký middlewares & routes
// ============================================================

// Bắt buộc import trước tiên - kích hoạt async error handling tự động
require('express-async-errors');
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const farmRoutes = require('./routes/farmRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const batchRoutes = require('./routes/batchRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const statsRoutes = require('./routes/statsRoutes');
const discountRoutes = require('./routes/discountRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const { startExpiryChecker } = require('./cron/expiryChecker');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// ── Khởi tạo app ────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ── Kết nối Database ────────────────────────────────────────
connectDB().then(() => {
    // Khởi động Cron Job SAU khi kết nối DB thành công
    startExpiryChecker();
});
// ── Rate Limiter (OWASP A07 — Brute Force prevention) ────────
// Chỉ áp dụng cho /api/auth: 30 request / 15 phút / IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 phút
    max: 30,                     // Số request tối đa
    standardHeaders: true,       // Gửi RateLimit-* headers (RFC 6585)
    legacyHeaders: false,        // Tắt X-RateLimit-* headers cũ
    message: { success: false, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
});
// ── Bảo mật & Logging Middlewares ───────────────────────────
app.use(helmet());           // Thiết lập các HTTP security headers
app.use(morgan('dev'));       // Log mọi request ra console (dev mode)

// ── CORS ─────────────────────────────────────────────────────
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000', // Chỉ cho phép FE gọi
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// ── Body Parser Middlewares ──────────────────────────────────
app.use(express.json({ limit: '1mb' }));                    // Giới hạn body JSON (ngăn DoS)
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // URL-encoded

// ── MongoDB Sanitize (OWASP A03 — NoSQL Injection prevention) ──
// Loại bỏ ký tự $ và . từ req.body, req.query, req.params
// Ví dụ: { "email": { "$gt": "" } } bị loại bỏ → không thể bypass auth
app.use(mongoSanitize());

// ── Serve Static Files (ảnh sản phẩm upload) ────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──────────────────────────────────────────────────
// Tất cả API endpoints bắt đầu bằng /api
app.use('/api', indexRouter);
app.use('/api/auth', authLimiter, authRoutes);  // Auth routes có rate limit chống brute-force
app.use('/api/users', userRoutes);  // Quản lý profile người dùng
app.use('/api/farms', farmRoutes);           // Quản lý đối tác trang trại
app.use('/api/categories', categoryRoutes); // Quản lý danh mục sản phẩm
app.use('/api/products', productRoutes);     // Quản lý sản phẩm
app.use('/api/batches', batchRoutes);         // Quản lý lô hàng & tồn kho
app.use('/api/inventory', inventoryRoutes);   // Cảnh báo & thống kê tồn kho
app.use('/api/cart', cartRoutes);               // Giỏ hàng
app.use('/api/orders', orderRoutes);           // Đơn hàng & Checkout
app.use('/api/reviews', reviewRoutes);           // Đánh giá sản phẩm
app.use('/api/stats', statsRoutes);               // Thống kê & báo cáo
app.use('/api/discounts', discountRoutes);         // Mã giảm giá
app.use('/api/wishlist', wishlistRoutes);           // Danh sách yêu thích

// Bắt route không tồn tại (404) - phải đặt SAU tất cả routes
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} không tồn tại.` });
});

// ── Global Error Handler ─────────────────────────────────────
// Phải đặt CUỐI CÙNG, sau tất cả routes và middlewares
app.use(errorHandler);

// ── Khởi động Server ─────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // Export để phục vụ unit testing
