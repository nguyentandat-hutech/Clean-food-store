// ============================================================
// ENTRY POINT - src/server.js
// Khởi tạo Express app, kết nối DB, đăng ký middlewares & routes
// ============================================================

// Bắt buộc import trước tiên - kích hoạt async error handling tự động
require('express-async-errors');
require('dotenv').config();

const express = require('express');
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

// ── Khởi tạo app ────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ── Kết nối Database ────────────────────────────────────────
connectDB();

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
app.use(express.json());                        // Đọc body dạng JSON
app.use(express.urlencoded({ extended: true })); // Đọc body dạng URL-encoded

// ── Routes ──────────────────────────────────────────────────
// Tất cả API endpoints bắt đầu bằng /api
app.use('/api', indexRouter);
app.use('/api/auth', authRoutes);   // Đăng ký, Đăng nhập, Thông tin người dùng
app.use('/api/users', userRoutes);  // Quản lý profile người dùng
app.use('/api/farms', farmRoutes);           // Quản lý đối tác trang trại
app.use('/api/categories', categoryRoutes); // Quản lý danh mục sản phẩm
app.use('/api/products', productRoutes);     // Quản lý sản phẩm

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
