// ============================================================
// FILE: backend/src/services/authService.js
// Mục đích: Chứa toàn bộ business logic liên quan đến xác thực
// Controller gọi service, service xử lý logic và trả kết quả
// ============================================================

// Nhập thư viện jsonwebtoken để tạo và xác thực JWT Token
const jwt = require('jsonwebtoken');

// Nhập Model User để tương tác với collection users trong MongoDB
const User = require('../models/User');

// Nhập hàm createError từ utils — dùng để tạo lỗi có statusCode
const { createError } = require('../utils/responseHelper');

// ── Hàm tạo JWT Token ─────────────────────────────────────────────────────
// Hàm nội bộ (không export), chỉ dùng trong file này
const generateToken = (user) => {
    return jwt.sign(
        // Payload — dữ liệu nhúng vào token (có thể đọc được, không nên để nhạy cảm)
        { id: user._id, email: user.email, role: user.role },

        // Secret key để ký token — lưu trong .env, không được lộ ra ngoài
        process.env.JWT_SECRET,

        // Tùy chọn: thời gian hết hạn lấy từ .env hoặc mặc định 7 ngày
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── ĐĂNG KÝ tài khoản mới ─────────────────────────────────────────────────
// Tham số: object chứa { name, email, password }
const register = async ({ name, email, password }) => {
    // Kiểm tra đầu vào: cả 3 field phải có giá trị
    if (!name || !email || !password) {
        throw createError(400, 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu');
        // throw: ném lỗi ra ngoài, controller sẽ bắt và xử lý
        // createError(400,...): tạo lỗi với HTTP status 400 = Bad Request
    }

    // Tìm kiếm trong DB xem email đã tồn tại chưa
    // .toLowerCase().trim() — chuẩn hoá email trước khi so sánh
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        // HTTP 409 = Conflict — tài nguyên đã tồn tại, xung đột
        throw createError(409, 'Email này đã được đăng ký. Vui lòng dùng email khác');
    }

    // Kiểm tra độ dài mật khẩu thêm lần nữa ở đây (Mongoose cũng check, nhưng check sớm cho UX tốt hơn)
    if (password.length < 6) {
        throw createError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Tạo user mới trong DB — password sẽ được hash tự động bởi pre-save hook trong Model
    const user = await User.create({ name, email, password });

    // Tạo JWT token ngay sau đăng ký → người dùng đăng nhập luôn, không cần login lại
    const token = generateToken(user);

    // Trả về object chứa user và token
    return { user, token };
};

// ── ĐĂNG NHẬP ─────────────────────────────────────────────────────────────
// Tham số: object chứa { email, password }
const login = async ({ email, password }) => {
    // Kiểm tra đầu vào
    if (!email || !password) {
        throw createError(400, 'Vui lòng nhập email và mật khẩu');
    }

    // Tìm user theo email, thêm .select('+password') vì schema có "select: false"
    // Nếu không có .select('+password'), field password sẽ không được trả về
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
        // Trả về thông báo chung "email hoặc mật khẩu sai" thay vì "email không tồn tại"
        // Kỹ thuật này để tránh lộ thông tin (username enumeration attack)
        throw createError(401, 'Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra tài khoản có đang bị khóa không
    if (!user.isActive) {
        throw createError(403, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin');
    }

    // So sánh mật khẩu nhập vào với mật khẩu đã hash trong DB
    // comparePassword() là method đã định nghĩa trong User model
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
        throw createError(401, 'Email hoặc mật khẩu không chính xác');
    }

    // Tạo JWT token với thông tin role nhúng trong payload
    const token = generateToken(user);

    return { user, token };
};

// ── LẤY THÔNG TIN user đang đăng nhập (từ token) ─────────────────────────
// Tham số: userId — lấy từ req.user.id (đã được authMiddleware gán)
const getMe = async (userId) => {
    // Tìm user trong DB theo ID
    const user = await User.findById(userId);

    if (!user) {
        // Trường hợp hiếm: token hợp lệ nhưng user đã bị xóa khỏi DB
        throw createError(404, 'Không tìm thấy thông tin người dùng');
    }

    return user;
};

// Xuất 3 hàm để authController sử dụng
module.exports = { register, login, getMe };
