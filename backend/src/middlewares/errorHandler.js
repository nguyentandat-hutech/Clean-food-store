/**
 * Global Error Handler Middleware.
 * Phải được đăng ký SAU TẤT CẢ các routes trong server.js.
 * Bắt mọi lỗi được throw/next(err) từ controllers & services.
 */
const errorHandler = (err, req, res, next) => {
    // Log lỗi ra console để debug
    console.error(`[ERROR] ${err.stack || err.message}`);

    // ── Mongoose CastError: ObjectId không hợp lệ → 400 ─────────────
    // Xảy ra khi truyền ID không phải 24-char hex vào route như /products/abc
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `Định dạng ID không hợp lệ: "${err.value}"`,
        });
    }

    // ── Mongoose ValidationError: vi phạm schema → 400 ──────────────
    // Xảy ra khi create/update không thỏa mãn validator của schema
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            success: false,
            message: messages.join('. '),
        });
    }

    // ── MongoDB Duplicate Key (code 11000) → 409 Conflict ────────────
    // Xảy ra khi vi phạm unique index (vd: email đã tồn tại)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({
            success: false,
            message: `Giá trị "${err.keyValue?.[field]}" đã tồn tại. Vui lòng dùng giá trị khác.`,
        });
    }

    // ── JWT Errors → 401 ─────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ. Vui lòng đăng nhập lại.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    // ── Lỗi mặc định ─────────────────────────────────────────────────
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Lỗi máy chủ nội bộ';

    res.status(statusCode).json({
        success: false,
        message,
        // Chỉ trả về stack trace ở môi trường development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
