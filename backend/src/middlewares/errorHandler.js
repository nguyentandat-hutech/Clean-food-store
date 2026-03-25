/**
 * Global Error Handler Middleware.
 * Phải được đăng ký SAU TẤT CẢ các routes trong server.js.
 * Bắt mọi lỗi được throw/next(err) từ controllers & services.
 */
const errorHandler = (err, req, res, next) => {
    // Log lỗi ra console để debug (dùng morgan hoặc winston ở production)
    console.error(`[ERROR] ${err.stack}`);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        // Chỉ trả về stack trace ở môi trường development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
