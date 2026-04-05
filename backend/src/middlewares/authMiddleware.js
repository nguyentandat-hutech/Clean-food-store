const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/responseHelper');

/**
 * Middleware bảo vệ route: kiểm tra JWT hợp lệ.
 * Gắn thông tin user vào req.user để các handler phía sau sử dụng.
 *
 * Cách dùng: router.get('/protected', protect, controller.handler)
 */
const protect = async (req, res, next) => {
    let token;

    // Đọc token từ header Authorization: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Không có token → từ chối truy cập
    if (!token) {
        return next(createError(401, 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục'));
    }

    // Verify token - jwt.verify ném lỗi nếu token sai/hết hạn
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(createError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại'));
        }
        return next(createError(401, 'Token không hợp lệ. Vui lòng đăng nhập lại'));
    }

    // Kiểm tra user vẫn còn tồn tại trong DB (phòng trường hợp account bị xoá sau khi cấp token)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(createError(401, 'Tài khoản không còn tồn tại trong hệ thống'));
    }

    // Kiểm tra tài khoản có đang hoạt động không
    if (!currentUser.isActive) {
        return next(createError(403, 'Tài khoản của bạn đã bị vô hiệu hóa'));
    }

    // Gắn thông tin user (đã qua xác thực) vào req để dùng trong controller
    req.user = currentUser;
    next();
};

module.exports = { protect };
